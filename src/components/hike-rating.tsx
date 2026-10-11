"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { saveRating } from "@/lib/hikes/contributions";

const scores = [1, 2, 3, 4, 5];

export function HikeRating({ hikeId, score }: { hikeId: string; score: number | null }) {
  const router = useRouter();
  const [current, setCurrent] = useState(score);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function choose(next: number) {
    setPending(true);
    setError(null);
    const result = await saveRating(hikeId, next);
    if (result?.error) {
      setError(result.error);
      setPending(false);
      return;
    }

    setCurrent(next);
    setPending(false);
    router.refresh();
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-heading text-xl font-semibold">Your rating</h2>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Your rating">
        {scores.map((value) => (
          <Button
            key={value}
            type="button"
            variant={current === value ? "default" : "outline"}
            className="h-11 w-11"
            disabled={pending}
            aria-pressed={current === value}
            onClick={() => choose(value)}
          >
            {value}
          </Button>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">
        {current === null ? "Not rated yet." : `You rated this ${current} out of 5.`}
      </p>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </section>
  );
}

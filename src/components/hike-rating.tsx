"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { saveRating } from "@/lib/hikes/contributions";

const labels = ["", "Not for me", "It was fine", "Good day out", "Loved it", "One of the best"];

export function HikeRating({ hikeId, score }: { hikeId: string; score: number | null }) {
  const router = useRouter();
  const [current, setCurrent] = useState(score);
  const [hover, setHover] = useState<number | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const shown = hover ?? current ?? 0;

  async function choose(value: number) {
    setPending(true);
    setError(null);
    const result = await saveRating(hikeId, value);
    if (result?.error) {
      setError(result.error);
      setPending(false);
      return;
    }

    setCurrent(value);
    setPending(false);
    router.refresh();
  }

  return (
    <section className="flex flex-col gap-3 rounded-[20px] bg-paper p-5 shadow-card">
      <h2 className="font-heading text-xl font-semibold">How was it for you?</h2>
      <div className="flex gap-1" onMouseLeave={() => setHover(null)}>
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            disabled={pending}
            aria-pressed={current === value}
            aria-label={labels[value]}
            className="focus-ring grid size-11 place-items-center rounded-full"
            onMouseEnter={() => setHover(value)}
            onFocus={() => setHover(value)}
            onBlur={() => setHover(null)}
            onClick={() => choose(value)}
          >
            <Star
              className={`size-7 ${value <= shown ? "fill-gold text-gold" : "fill-transparent text-line-strong"}`}
              aria-hidden="true"
            />
          </button>
        ))}
      </div>
      <p className="text-sm font-medium text-ink">{shown > 0 ? labels[shown] : "Tap a star"}</p>
      {current ? <p className="text-sm text-ink-muted">Saved. Tap another star to change it.</p> : null}
      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </section>
  );
}

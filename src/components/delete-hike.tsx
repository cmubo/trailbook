"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { deleteHike } from "@/lib/hikes/actions";

export function DeleteHike({ hikeId }: { hikeId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onDelete() {
    setPending(true);
    setError(null);
    const result = await deleteHike(hikeId);
    if (result?.error) {
      setError(result.error);
      setPending(false);
    }
  }

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-destructive/30 bg-card p-5">
      <h2 className="font-heading text-xl font-semibold">Delete this hike</h2>
      {confirming ? (
        <>
          <p className="text-sm text-muted-foreground">
            This removes the hike, the people on it, comments, ratings, and its photos.
          </p>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="destructive"
              className="h-11 px-4"
              disabled={pending}
              onClick={onDelete}
            >
              {pending ? "Deleting…" : "Delete this hike"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11 px-4"
              disabled={pending}
              onClick={() => setConfirming(false)}
            >
              Cancel
            </Button>
          </div>
        </>
      ) : (
        <Button
          type="button"
          variant="destructive"
          className="h-11 w-fit px-4"
          onClick={() => setConfirming(true)}
        >
          Delete hike
        </Button>
      )}
    </section>
  );
}

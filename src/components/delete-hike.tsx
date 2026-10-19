"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { deleteHike } from "@/lib/hikes/actions";
import { deleteHikeCopy } from "@/lib/hikes/format";

export function DeleteHike({
  hikeId,
  photoCount,
  ratingCount,
  commentCount,
}: {
  hikeId: string;
  photoCount: number;
  ratingCount: number;
  commentCount: number;
}) {
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
    <div>
      <Button
        type="button"
        variant="destructive"
        className="h-11 px-4"
        onClick={() => setConfirming(true)}
      >
        Delete hike
      </Button>
      {confirming ? (
        <div
          className="fixed inset-0 z-50 grid place-items-end bg-[#171815]/50 p-4 min-[800px]:place-items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-hike-title"
        >
          <div className="w-full max-w-sm rounded-[28px] bg-paper p-6 shadow-float">
            <h2 id="delete-hike-title" className="font-heading text-2xl font-semibold">
              Delete this hike?
            </h2>
            <p className="mt-3 text-sm leading-6 text-ink-muted">
              {deleteHikeCopy(photoCount, ratingCount, commentCount)}
            </p>
            {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
            <div className="mt-5 flex flex-col gap-2">
              <button
                type="button"
                disabled={pending}
                className="focus-ring h-12 rounded-full bg-danger text-sm font-medium text-paper disabled:opacity-50"
                onClick={onDelete}
              >
                {pending ? "Deleting…" : "Delete this hike"}
              </button>
              <button
                type="button"
                disabled={pending}
                className="focus-ring h-12 rounded-full text-sm font-medium text-ink"
                onClick={() => setConfirming(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

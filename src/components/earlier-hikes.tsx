"use client";

import { useState } from "react";
import { HikeCard, type HikeCardData } from "@/components/hike-card";

const previewCount = 4;

export function EarlierHikes({ hikes }: { hikes: HikeCardData[] }) {
  const [open, setOpen] = useState(false);
  const preview = open ? hikes : hikes.slice(0, previewCount);

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-4 min-[800px]:hidden">
        {hikes.map((hike) => (
          <li key={hike.id}>
            <HikeCard hike={hike} layout="wide" />
          </li>
        ))}
      </ul>
      <ul className="hidden gap-4 min-[800px]:grid min-[800px]:grid-cols-2">
        {preview.map((hike) => (
          <li key={hike.id}>
            <HikeCard hike={hike} layout="wide" />
          </li>
        ))}
      </ul>
      {hikes.length > previewCount ? (
        <button
          type="button"
          className="focus-ring hidden h-12 items-center justify-center rounded-full border border-line bg-paper px-5 text-sm font-medium text-ink min-[800px]:inline-flex"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? "Show fewer hikes" : "Show older hikes"}
        </button>
      ) : null}
    </div>
  );
}

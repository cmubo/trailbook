import { Mountain } from "lucide-react";

export function Logo() {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="grid size-8 place-items-center rounded-lg bg-forest text-paper">
        <Mountain className="size-4" aria-hidden="true" />
      </span>
      <span className="font-heading text-lg font-semibold tracking-tight text-ink">Trailbook</span>
    </span>
  );
}

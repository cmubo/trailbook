import { Star } from "lucide-react";

export function Stars({ value, size = 18 }: { value: number; size?: number }) {
  const filled = Math.round(value);

  return (
    <span className="inline-flex gap-0.5" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={size}
          className={star <= filled ? "fill-gold text-gold" : "fill-transparent text-line-strong"}
        />
      ))}
    </span>
  );
}

import Link from "next/link";
import { Mountain, Star } from "lucide-react";
import { ProfileAvatar } from "@/components/profile-avatar";
import { companionLabel, formatCardDate } from "@/lib/hikes/format";

export type HikeCardData = {
  id: string;
  title: string;
  hikeDate: string;
  locationName: string | null;
  coverUrl: string | null;
  photoCount: number;
  averageScore: number | null;
  participants: { id: string; displayName: string; avatarUrl: string | null }[];
};

export function HikeCard({ hike, layout }: { hike: HikeCardData; layout: "tall" | "wide" }) {
  const names = hike.participants.map((person) => person.displayName);
  const company = companionLabel(names);
  const meta = [formatCardDate(hike.hikeDate), hike.locationName].filter(Boolean).join(" · ");

  return (
    <Link
      href={`/hikes/${hike.id}`}
      className="focus-ring flex flex-col overflow-hidden rounded-[20px] bg-paper shadow-card"
    >
      <div className={`relative bg-sage-100 ${layout === "tall" ? "aspect-[4/3]" : "aspect-[16/10]"}`}>
        {hike.coverUrl ? (
          // Signed URLs expire and point at the private storage host.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={hike.coverUrl} alt="" className="size-full object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center text-forest">
            <Mountain className="size-10" aria-hidden="true" />
          </div>
        )}
        {hike.photoCount > 0 ? (
          <span className="absolute right-3 bottom-3 rounded-full bg-ink/80 px-2 py-1 text-xs font-medium text-paper">
            {hike.photoCount} {hike.photoCount === 1 ? "photo" : "photos"}
          </span>
        ) : null}
      </div>
      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-heading text-xl font-semibold tracking-tight text-ink">{hike.title}</h3>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-gold-soft px-2 py-1 text-xs font-medium text-gold-ink">
            <Star className="size-3 fill-gold-strong text-gold-strong" aria-hidden="true" />
            {hike.averageScore === null ? "New" : hike.averageScore.toFixed(1)}
          </span>
        </div>
        {meta ? <p className="text-sm text-ink-muted">{meta}</p> : null}
        {hike.participants.length > 0 ? (
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {hike.participants.slice(0, 4).map((person) => (
                <ProfileAvatar
                  key={person.id}
                  name={person.displayName}
                  userId={person.id}
                  avatarUrl={person.avatarUrl}
                  size="xs"
                  className="ring-2 ring-paper"
                />
              ))}
            </div>
            {company ? <span className="text-sm text-ink-muted">{company}</span> : null}
          </div>
        ) : null}
      </div>
    </Link>
  );
}

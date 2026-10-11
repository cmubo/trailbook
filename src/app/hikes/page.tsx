import Link from "next/link";
import { HikeFilters } from "@/components/hike-filters";
import { requireActiveMember } from "@/lib/auth/access";
import {
  filtersAreActive,
  hikeMatches,
  hikeYears,
  parseHikeFilters,
  peopleForFilter,
} from "@/lib/hikes/filters";
import { formatDifficulty, formatDistance, formatHikeDate, formatRating } from "@/lib/hikes/format";
import { loadJournal, type HikeRecord } from "@/lib/hikes/queries";

export const metadata = {
  title: "Hikes · Trailbook",
};

export default async function HikesPage({ searchParams }: PageProps<"/hikes">) {
  await requireActiveMember();
  const filters = parseHikeFilters(await searchParams);
  const journal = await loadJournal();
  const hikes = journal.hikes.filter((hike) => hikeMatches(hike, filters));
  const filtered = filtersAreActive(filters);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-4xl font-semibold tracking-tight">Hikes</h1>
        <p className="text-muted-foreground">Newest first.</p>
      </div>
      <HikeFilters
        filters={filters}
        years={hikeYears(journal.hikes)}
        people={peopleForFilter(journal.hikes, journal.people)}
      />
      {hikes.length === 0 ? (
        <p className="rounded-2xl border border-border bg-card px-5 py-8 text-muted-foreground">
          {filtered ? "Nothing matched." : "No hikes yet."}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            {hikes.length === 1 ? "1 hike" : `${hikes.length} hikes`}
          </p>
          <ul className="flex flex-col gap-3">
            {hikes.map((hike) => (
              <li key={hike.id}>
                <HikeCard hike={hike} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function HikeCard({ hike }: { hike: HikeRecord }) {
  const facts = [formatDistance(hike.distanceKm), formatDifficulty(hike.difficulty)].filter(
    (fact): fact is string => Boolean(fact),
  );
  const place = [formatHikeDate(hike.hikeDate), hike.locationName].filter(Boolean).join(" · ");

  return (
    <Link
      href={`/hikes/${hike.id}`}
      className="block rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/40"
    >
      {hike.coverUrl ? (
        // Signed URLs expire and point at the private storage host.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={hike.coverUrl} alt="" className="mb-4 h-40 w-full rounded-xl object-cover" />
      ) : null}
      <h2 className="font-heading text-2xl font-semibold tracking-tight">{hike.title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{place}</p>
      {facts.length > 0 ? <p className="mt-1 text-sm">{facts.join(" · ")}</p> : null}
      <p className="mt-3 text-sm">
        {hike.participants.length > 0
          ? hike.participants.map((person) => person.displayName).join(", ")
          : "No one listed"}
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        {formatRating(hike.averageScore, hike.ratingCount)}
      </p>
    </Link>
  );
}

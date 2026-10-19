import Link from "next/link";
import { Plus } from "lucide-react";
import { EarlierHikes } from "@/components/earlier-hikes";
import { HikeCard } from "@/components/hike-card";
import { HikeFilterControls } from "@/components/hike-filters";
import { requireActiveMember } from "@/lib/auth/access";
import {
  emptyFilterMessage,
  filtersAreActive,
  hikeMatches,
  hikeYears,
  parseHikeFilters,
  peopleForFilter,
} from "@/lib/hikes/filters";
import { currentCalendarYear } from "@/lib/hikes/format";
import { loadJournal } from "@/lib/hikes/queries";
import { loadOwnProfile } from "@/lib/profile/queries";

export const metadata = {
  title: "Hikes · Trailbook",
};

export default async function HikesPage({ searchParams }: PageProps<"/hikes">) {
  const auth = await requireActiveMember();
  const filters = parseHikeFilters(await searchParams);
  const [journal, profile] = await Promise.all([loadJournal(), loadOwnProfile(auth.userId)]);
  const hikes = journal.hikes.filter((hike) => hikeMatches(hike, filters));
  const filtered = filtersAreActive(filters);
  const years = hikeYears(journal.hikes);
  const people = peopleForFilter(journal.hikes, journal.people);
  const year = currentCalendarYear();
  const thisYear = journal.hikes.filter((hike) => hike.hikeDate.startsWith(`${year}-`)).length;
  const latest = hikes[0];
  const earlier = hikes.slice(1);
  const filterHikes = journal.hikes.map((hike) => ({
    title: hike.title,
    locationName: hike.locationName,
    hikeDate: hike.hikeDate,
    participants: hike.participants.map((person) => ({ id: person.id })),
    averageScore: hike.averageScore,
  }));

  return (
    <HikeFilterControls
      hikes={filterHikes}
      people={people}
      years={years}
      filters={filters}
      thisYear={thisYear}
      profile={{
        userId: auth.userId,
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl,
      }}
    >
      {hikes.length === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-[20px] bg-paper px-5 py-8 shadow-card">
          <p className="text-ink-muted">{filtered ? emptyFilterMessage(filters, people) : "No hikes yet."}</p>
          {filtered ? (
            <Link href="/hikes" className="focus-ring text-sm font-medium text-forest">
              Clear filters
            </Link>
          ) : null}
        </div>
      ) : (
        <>
          {latest ? (
            <section className="flex flex-col gap-3">
              <h2 className="font-heading text-lg font-semibold">Latest</h2>
              <div className="min-[800px]:max-w-lg">
                <HikeCard hike={latest} layout="tall" />
              </div>
            </section>
          ) : null}
          {earlier.length > 0 ? (
            <section className="flex flex-col gap-3">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="font-heading text-lg font-semibold">Earlier</h2>
                <p className="text-sm text-ink-faint">Newest first</p>
              </div>
              <EarlierHikes hikes={earlier} />
            </section>
          ) : null}
        </>
      )}
      {auth.role === "owner" ? (
        <Link
          href="/hikes/new"
          className="focus-ring fixed right-4 bottom-[84px] z-20 inline-flex h-14 items-center gap-2 rounded-full bg-forest px-5 text-sm font-medium text-paper shadow-float ring-4 ring-peach-soft hover:bg-forest-hover min-[800px]:hidden"
        >
          <Plus className="size-5" aria-hidden="true" />
          New hike
        </Link>
      ) : null}
    </HikeFilterControls>
  );
}

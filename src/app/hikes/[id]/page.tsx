import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { z } from "zod";
import { DeleteHike } from "@/components/delete-hike";
import { HikeComments } from "@/components/hike-comments";
import { HikePhotos } from "@/components/hike-photos";
import { HikeRating } from "@/components/hike-rating";
import { PersonName } from "@/components/person-name";
import { Stars } from "@/components/stars";
import { requireActiveMember } from "@/lib/auth/access";
import {
  firstName,
  formatDifficulty,
  formatDistance,
  formatHikeDate,
  formatRating,
  mapSearchUrl,
  trailLink,
} from "@/lib/hikes/format";
import { loadContributions, loadHike, loadTrailNumber } from "@/lib/hikes/queries";
import { loadOwnProfile } from "@/lib/profile/queries";

export default async function HikePage({ params }: PageProps<"/hikes/[id]">) {
  const auth = await requireActiveMember();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) {
    notFound();
  }

  const hike = await loadHike(id);
  if (!hike) {
    notFound();
  }

  const [contributions, trailNumber, profile] = await Promise.all([
    loadContributions(hike.id, auth.userId),
    loadTrailNumber(hike.id),
    loadOwnProfile(auth.userId),
  ]);
  const facts = [formatDistance(hike.distanceKm), formatDifficulty(hike.difficulty)].filter(
    (fact): fact is string => Boolean(fact),
  );
  const trail = trailLink(hike.trailUrl);
  const map =
    hike.latitude !== null && hike.longitude !== null
      ? mapSearchUrl(hike.latitude, hike.longitude)
      : null;
  const names = hike.participants.map((person) => firstName(person.displayName)).join(", ");

  return (
    <article className="grid grid-cols-1 gap-8 min-[800px]:grid-cols-[minmax(0,1fr)_300px] min-[800px]:items-start min-[800px]:gap-x-10">
      <header className="flex flex-col gap-4 min-[800px]:col-span-2">
        <div className="flex items-center justify-between gap-3">
          <Link href="/hikes" className="focus-ring inline-flex items-center gap-1 text-sm font-medium text-forest">
            <ChevronLeft className="size-4" aria-hidden="true" />
            Hikes
          </Link>
          {auth.role === "owner" ? (
            <Link
              href={`/hikes/${hike.id}/edit`}
              className="focus-ring inline-flex h-11 items-center rounded-full border border-line bg-paper px-4 text-sm font-medium"
            >
              Edit
            </Link>
          ) : null}
        </div>
        <div className="flex flex-col gap-2">
          {trailNumber > 0 ? (
            <p className="text-[11px] font-semibold tracking-[0.14em] text-terracotta uppercase">
              Trail log · No. {trailNumber}
            </p>
          ) : null}
          <h1 className="font-heading text-4xl font-semibold tracking-tight">{hike.title}</h1>
          <p className="text-ink-muted">
            {[formatHikeDate(hike.hikeDate), hike.locationName].filter(Boolean).join(" · ")}
          </p>
          {names ? <p>{names}</p> : null}
        </div>
      </header>
      <div className="flex flex-col gap-8 min-[800px]:col-start-1">
        <div className="flex flex-col gap-4 min-[800px]:hidden">
          <GroupRating average={hike.averageScore} count={hike.ratingCount} />
          <HikeRating hikeId={hike.id} score={contributions.ownScore} />
        </div>
        <section className="flex flex-col gap-3">
          <h2 className="font-heading text-xl font-semibold">The day</h2>
          {hike.description ? (
            <p className="whitespace-pre-wrap leading-7">{hike.description}</p>
          ) : (
            <p className="text-ink-muted">No notes for this day yet.</p>
          )}
        </section>
        <div className="min-[800px]:hidden">
          <RouteBlock locationName={hike.locationName} trail={trail} map={map} facts={facts} />
        </div>
        <HikePhotos
          hikeId={hike.id}
          currentUserId={auth.userId}
          isOwner={auth.role === "owner"}
          coverPath={hike.coverPhotoPath}
          photos={contributions.photos}
        />
        <HikeComments
          hikeId={hike.id}
          currentUserId={auth.userId}
          comments={contributions.comments}
          author={{
            userId: auth.userId,
            displayName: profile.displayName,
            avatarUrl: profile.avatarUrl,
          }}
        />
      </div>
      <aside className="hidden flex-col gap-6 min-[800px]:col-start-2 min-[800px]:row-start-2 min-[800px]:flex">
        <GroupRating average={hike.averageScore} count={hike.ratingCount} />
        <HikeRating hikeId={hike.id} score={contributions.ownScore} />
        <section className="flex flex-col gap-3">
          <h2 className="font-heading text-xl font-semibold">Who came</h2>
          {hike.participants.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {hike.participants.map((person) => (
                <li key={person.id}>
                  <PersonName name={person.displayName} userId={person.id} avatarUrl={person.avatarUrl} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-muted">No one is listed yet.</p>
          )}
        </section>
        <RouteBlock locationName={hike.locationName} trail={trail} map={map} facts={facts} />
        {auth.role === "owner" ? (
          <DeleteHike
            hikeId={hike.id}
            photoCount={hike.photoCount}
            ratingCount={hike.ratingCount}
            commentCount={contributions.comments.length}
          />
        ) : null}
      </aside>
    </article>
  );
}

function GroupRating({ average, count }: { average: number | null; count: number }) {
  return (
    <section className="flex flex-col gap-2 rounded-[20px] bg-paper p-5 shadow-card">
      <h2 className="font-heading text-xl font-semibold">Group rating</h2>
      <div className="flex items-center gap-2">
        <Stars value={average ?? 0} />
        <p className="text-sm text-ink-muted">{formatRating(average, count)}</p>
      </div>
    </section>
  );
}

function RouteBlock({
  locationName,
  trail,
  map,
  facts,
}: {
  locationName: string | null;
  trail: string | null;
  map: string | null;
  facts: string[];
}) {
  if (!locationName && !trail && !map && facts.length === 0) {
    return null;
  }

  return (
    <section className="flex flex-col gap-2">
      <h2 className="font-heading text-xl font-semibold">Route</h2>
      {facts.length > 0 ? <p className="text-sm text-ink-muted">{facts.join(" · ")}</p> : null}
      {locationName ? <p>{locationName}</p> : null}
      {trail ? (
        <a href={trail} target="_blank" rel="noopener noreferrer" className="focus-ring w-fit text-sm font-medium text-forest">
          Open the route
        </a>
      ) : null}
      {map ? (
        <a href={map} target="_blank" rel="noopener noreferrer" className="focus-ring w-fit text-sm font-medium text-forest">
          Open in Google Maps
        </a>
      ) : null}
    </section>
  );
}

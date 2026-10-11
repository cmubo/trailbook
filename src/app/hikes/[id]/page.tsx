import Link from "next/link";
import { notFound } from "next/navigation";
import { HikeComments } from "@/components/hike-comments";
import { PersonName } from "@/components/person-name";
import { HikePhotos } from "@/components/hike-photos";
import { HikeRating } from "@/components/hike-rating";
import { buttonVariants } from "@/components/ui/button";
import { requireActiveMember } from "@/lib/auth/access";
import {
  formatDifficulty,
  formatDistance,
  formatHikeDate,
  formatRating,
  mapSearchUrl,
  trailLink,
} from "@/lib/hikes/format";
import { loadContributions, loadHike } from "@/lib/hikes/queries";
import { z } from "zod";

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

  const contributions = await loadContributions(hike.id, auth.userId);

  const facts = [formatDistance(hike.distanceKm), formatDifficulty(hike.difficulty)].filter(
    (fact): fact is string => Boolean(fact),
  );
  const trail = trailLink(hike.trailUrl);
  const map =
    hike.latitude !== null && hike.longitude !== null
      ? mapSearchUrl(hike.latitude, hike.longitude)
      : null;

  return (
    <article className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/hikes" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
          All hikes
        </Link>
        {auth.role === "owner" ? (
          <Link
            href={`/hikes/${hike.id}/edit`}
            className={buttonVariants({ variant: "outline", className: "h-11 px-4" })}
          >
            Edit
          </Link>
        ) : null}
      </div>
      <div className="flex flex-col gap-3">
        <h1 className="font-heading text-4xl font-semibold tracking-tight">{hike.title}</h1>
        <p className="text-muted-foreground">
          {[formatHikeDate(hike.hikeDate), hike.locationName].filter(Boolean).join(" · ")}
        </p>
        {facts.length > 0 ? <p>{facts.join(" · ")}</p> : null}
        <p className="text-sm text-muted-foreground">{formatRating(hike.averageScore, hike.ratingCount)}</p>
      </div>
      <HikeRating hikeId={hike.id} score={contributions.ownScore} />
      {hike.description ? (
        <p className="whitespace-pre-wrap text-base leading-7">{hike.description}</p>
      ) : null}
      <section className="flex flex-col gap-2">
        <h2 className="font-heading text-xl font-semibold">Who went</h2>
        {hike.participants.length > 0 ? (
          <ul className="flex flex-col gap-1">
            {hike.participants.map((person) => (
              <li key={person.id}>
                <PersonName name={person.displayName} avatarUrl={person.avatarUrl} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground">No one is listed yet.</p>
        )}
      </section>
      {trail || map ? (
        <div className="flex flex-col gap-3">
          {trail ? (
            <a
              href={trail}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              Open trail
            </a>
          ) : null}
          {map ? (
            <a
              href={map}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              Open map
            </a>
          ) : null}
        </div>
      ) : null}
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
      />
    </article>
  );
}

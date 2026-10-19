import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { z } from "zod";
import { DeleteHike } from "@/components/delete-hike";
import { HikeForm } from "@/components/hike-form";
import { requireOwnerPage } from "@/lib/auth/access";
import { peopleForHike } from "@/lib/hikes/filters";
import { loadContributions, loadHike, loadPeople, type HikeRecord } from "@/lib/hikes/queries";
import type { HikeFormValues } from "@/lib/hikes/schema";

export default async function EditHikePage({ params }: PageProps<"/hikes/[id]/edit">) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) {
    notFound();
  }

  const auth = await requireOwnerPage();
  const [hike, people] = await Promise.all([loadHike(id), loadPeople()]);
  if (!hike) {
    notFound();
  }

  const contributions = await loadContributions(hike.id, auth.userId);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
      <Link href={`/hikes/${hike.id}`} className="focus-ring inline-flex w-fit items-center gap-1 text-sm font-medium text-forest">
        <ChevronLeft className="size-4" aria-hidden="true" />
        {hike.title}
      </Link>
      <h1 className="font-heading text-4xl font-semibold tracking-tight">Edit hike</h1>
      <HikeForm
        hikeId={hike.id}
        defaults={formValues(hike)}
        people={peopleForHike(
          people,
          hike.participants.map((person) => person.id),
        )}
        coverPath={hike.coverPhotoPath}
        coverPhotos={contributions.photos.flatMap((photo) =>
          photo.imageUrl
            ? [{ storagePath: photo.storagePath, imageUrl: photo.imageUrl, caption: photo.caption }]
            : [],
        )}
      />
      <DeleteHike
        hikeId={hike.id}
        photoCount={hike.photoCount}
        ratingCount={hike.ratingCount}
        commentCount={contributions.comments.length}
      />
    </div>
  );
}

function formValues(hike: HikeRecord): HikeFormValues {
  const difficulty =
    hike.difficulty === "easy" || hike.difficulty === "moderate" || hike.difficulty === "hard"
      ? hike.difficulty
      : "";

  return {
    title: hike.title,
    hikeDate: hike.hikeDate.slice(0, 10),
    description: hike.description ?? "",
    locationName: hike.locationName ?? "",
    latitude: hike.latitude === null ? "" : String(hike.latitude),
    longitude: hike.longitude === null ? "" : String(hike.longitude),
    trailUrl: hike.trailUrl ?? "",
    distanceKm: hike.distanceKm === null ? "" : String(hike.distanceKm),
    difficulty,
    participantIds: hike.participants.map((person) => person.id),
  };
}

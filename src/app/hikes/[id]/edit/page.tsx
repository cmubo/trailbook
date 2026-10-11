import { notFound } from "next/navigation";
import { z } from "zod";
import { DeleteHike } from "@/components/delete-hike";
import { HikeForm } from "@/components/hike-form";
import { requireOwnerPage } from "@/lib/auth/access";
import { peopleForHike } from "@/lib/hikes/filters";
import { loadHike, loadPeople, type HikeRecord } from "@/lib/hikes/queries";
import type { HikeFormValues } from "@/lib/hikes/schema";

export default async function EditHikePage({ params }: PageProps<"/hikes/[id]/edit">) {
  await requireOwnerPage();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) {
    notFound();
  }

  const [hike, people] = await Promise.all([loadHike(id), loadPeople()]);
  if (!hike) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-8">
      <h1 className="font-heading text-4xl font-semibold tracking-tight">Edit hike</h1>
      <HikeForm
        hikeId={hike.id}
        defaults={formValues(hike)}
        people={peopleForHike(
          people,
          hike.participants.map((person) => person.id),
        )}
      />
      <DeleteHike hikeId={hike.id} />
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

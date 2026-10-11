import { HikeForm } from "@/components/hike-form";
import { requireOwnerPage } from "@/lib/auth/access";
import { peopleForHike } from "@/lib/hikes/filters";
import { loadPeople } from "@/lib/hikes/queries";
import { emptyHikeForm } from "@/lib/hikes/schema";

export default async function NewHikePage() {
  await requireOwnerPage();
  const people = await loadPeople();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-heading text-4xl font-semibold tracking-tight">New hike</h1>
      <HikeForm hikeId={null} defaults={emptyHikeForm} people={peopleForHike(people, [])} />
    </div>
  );
}

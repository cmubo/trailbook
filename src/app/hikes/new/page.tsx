import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { HikeForm } from "@/components/hike-form";
import { requireOwnerPage } from "@/lib/auth/access";
import { peopleForHike } from "@/lib/hikes/filters";
import { loadPeople } from "@/lib/hikes/queries";
import { emptyHikeForm } from "@/lib/hikes/schema";

export default async function NewHikePage() {
  await requireOwnerPage();
  const people = await loadPeople();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <Link href="/hikes" className="focus-ring inline-flex w-fit items-center gap-1 text-sm font-medium text-forest">
        <ChevronLeft className="size-4" aria-hidden="true" />
        Hikes
      </Link>
      <h1 className="font-heading text-4xl font-semibold tracking-tight">New hike</h1>
      <HikeForm hikeId={null} defaults={emptyHikeForm} people={peopleForHike(people, [])} />
    </div>
  );
}

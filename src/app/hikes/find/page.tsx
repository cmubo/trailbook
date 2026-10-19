import { redirect } from "next/navigation";
import { requireActiveMember } from "@/lib/auth/access";
import { hikeListHref, parseHikeFilters } from "@/lib/hikes/filters";

export default async function FindHikesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireActiveMember();
  redirect(hikeListHref(parseHikeFilters(await searchParams)));
}

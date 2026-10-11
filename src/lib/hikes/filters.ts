import { z } from "zod";
import type { HikeRecord, Person } from "@/lib/hikes/queries";

export type HikeFilters = {
  q: string;
  year: string;
  memberId: string;
  minimumRating: 3 | 4 | 5 | null;
};

function first(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

export function parseHikeFilters(
  searchParams: Record<string, string | string[] | undefined>,
): HikeFilters {
  const q = first(searchParams.q).trim().slice(0, 140);
  const yearValue = first(searchParams.year).trim();
  const year = /^\d{4}$/.test(yearValue) ? yearValue : "";
  const memberValue = first(searchParams.member).trim();
  const memberId = z.uuid().safeParse(memberValue).success ? memberValue : "";
  const ratingValue = first(searchParams.rating).trim();
  const minimumRating =
    ratingValue === "3" || ratingValue === "4" || ratingValue === "5"
      ? (Number(ratingValue) as 3 | 4 | 5)
      : null;

  return { q, year, memberId, minimumRating };
}

export function filtersAreActive(filters: HikeFilters) {
  return Boolean(filters.q || filters.year || filters.memberId || filters.minimumRating);
}

export function hikeMatches(hike: HikeRecord, filters: HikeFilters) {
  if (filters.q) {
    const haystack = `${hike.title} ${hike.locationName ?? ""}`.toLowerCase();
    if (!haystack.includes(filters.q.toLowerCase())) {
      return false;
    }
  }

  if (filters.year && !hike.hikeDate.startsWith(`${filters.year}-`)) {
    return false;
  }

  if (filters.memberId && !hike.participants.some((person) => person.id === filters.memberId)) {
    return false;
  }

  if (filters.minimumRating !== null) {
    if (hike.averageScore === null || hike.averageScore < filters.minimumRating) {
      return false;
    }
  }

  return true;
}

export function hikeYears(hikes: HikeRecord[]) {
  return [...new Set(hikes.map((hike) => hike.hikeDate.slice(0, 4)))].sort((a, b) =>
    a < b ? 1 : -1,
  );
}

export function peopleForFilter(hikes: HikeRecord[], people: Person[]) {
  const seen = new Set(hikes.flatMap((hike) => hike.participants.map((person) => person.id)));
  return people.filter((person) => person.active || seen.has(person.id));
}

export function peopleForHike(people: Person[], participantIds: string[]) {
  const current = new Set(participantIds);
  return people.filter((person) => person.active || current.has(person.id));
}

import { z } from "zod";
import { firstName } from "@/lib/hikes/format";

export type HikeFilters = {
  q: string;
  year: string;
  memberIds: string[];
  minimumRating: 3 | 4 | 5 | null;
};

export type FilterableHike = {
  title: string;
  locationName: string | null;
  hikeDate: string;
  participants: { id: string }[];
  averageScore: number | null;
};

export type FilterPerson = {
  id: string;
  displayName: string;
  active: boolean;
};

function first(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function memberIdsFrom(value: string | string[] | undefined) {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  const ids: string[] = [];
  for (const item of values) {
    const id = item.trim();
    if (z.uuid().safeParse(id).success && !ids.includes(id)) {
      ids.push(id);
    }
  }

  return ids;
}

export function parseHikeFilters(
  searchParams: Record<string, string | string[] | undefined>,
): HikeFilters {
  const q = first(searchParams.q).trim().slice(0, 140);
  const yearValue = first(searchParams.year).trim();
  const year = /^\d{4}$/.test(yearValue) ? yearValue : "";
  const ratingValue = first(searchParams.rating).trim();
  const minimumRating =
    ratingValue === "3" || ratingValue === "4" || ratingValue === "5"
      ? (Number(ratingValue) as 3 | 4 | 5)
      : null;

  return { q, year, memberIds: memberIdsFrom(searchParams.member), minimumRating };
}

export function filtersAreActive(filters: HikeFilters) {
  return Boolean(filters.q || filters.year || filters.memberIds.length > 0 || filters.minimumRating);
}

export function hikeMatches(hike: FilterableHike, filters: HikeFilters) {
  if (filters.q) {
    const haystack = `${hike.title} ${hike.locationName ?? ""}`.toLowerCase();
    if (!haystack.includes(filters.q.toLowerCase())) {
      return false;
    }
  }

  if (filters.year && !hike.hikeDate.startsWith(`${filters.year}-`)) {
    return false;
  }

  if (filters.memberIds.length > 0) {
    const present = new Set(hike.participants.map((person) => person.id));
    if (!filters.memberIds.every((id) => present.has(id))) {
      return false;
    }
  }

  if (filters.minimumRating !== null) {
    if (hike.averageScore === null || hike.averageScore < filters.minimumRating) {
      return false;
    }
  }

  return true;
}

export function hikeYears(hikes: { hikeDate: string }[]) {
  return [...new Set(hikes.map((hike) => hike.hikeDate.slice(0, 4)))].sort((a, b) =>
    a < b ? 1 : -1,
  );
}

export function peopleForFilter(hikes: FilterableHike[], people: FilterPerson[]) {
  const seen = new Set(hikes.flatMap((hike) => hike.participants.map((person) => person.id)));
  return people.filter((person) => person.active || seen.has(person.id));
}

export function peopleForHike(people: FilterPerson[], participantIds: string[]) {
  const current = new Set(participantIds);
  return people.filter((person) => person.active || current.has(person.id));
}

export const emptyHikeFilters: HikeFilters = {
  q: "",
  year: "",
  memberIds: [],
  minimumRating: null,
};

export function hikeListHref(filters: HikeFilters) {
  return withQuery("/hikes", filters);
}

export function emptyFilterMessage(filters: HikeFilters, people: { id: string; displayName: string }[]) {
  const names = filters.memberIds.flatMap((id) => {
    const person = people.find((item) => item.id === id);
    return person ? [firstName(person.displayName)] : [];
  });
  const peopleLabel = joinNames(names);
  const query = filters.q ? ` matching “${filters.q}”` : "";
  const rating = filters.minimumRating ? ` rated ${filters.minimumRating} stars` : "";

  if (filters.year) {
    const who = peopleLabel ? ` with ${peopleLabel}` : "";
    return `Nothing from ${filters.year}${who}${rating}${query}. Try loosening a filter.`;
  }

  if (peopleLabel) {
    return `Nothing with ${peopleLabel}${rating}${query}. Try loosening a filter.`;
  }

  if (filters.q && !filters.minimumRating) {
    return `Nothing matching “${filters.q}”. Try loosening a filter.`;
  }

  if (filters.minimumRating) {
    return `Nothing rated ${filters.minimumRating} stars${query}. Try loosening a filter.`;
  }

  return "Nothing matched. Try loosening a filter.";
}

function joinNames(names: string[]) {
  if (names.length === 0) {
    return "";
  }

  if (names.length === 1) {
    return names[0] ?? "";
  }

  if (names.length === 2) {
    return `${names[0]} and ${names[1]}`;
  }

  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

function withQuery(path: string, filters: HikeFilters) {
  const params = new URLSearchParams();
  if (filters.q) {
    params.set("q", filters.q);
  }
  if (filters.year) {
    params.set("year", filters.year);
  }
  for (const id of filters.memberIds) {
    params.append("member", id);
  }
  if (filters.minimumRating) {
    params.set("rating", String(filters.minimumRating));
  }

  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

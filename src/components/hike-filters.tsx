import Link from "next/link";
import { Button } from "@/components/ui/button";
import { filtersAreActive, type HikeFilters } from "@/lib/hikes/filters";
import type { Person } from "@/lib/hikes/queries";

const fieldClass =
  "h-11 rounded-lg border border-input bg-card px-3 text-base font-normal outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function HikeFilters({
  filters,
  years,
  people,
}: {
  filters: HikeFilters;
  years: string[];
  people: Person[];
}) {
  return (
    <form action="/hikes" method="get" className="grid gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-2">
      <label className="flex flex-col gap-2 text-sm font-medium sm:col-span-2">
        Search
        <input
          type="search"
          name="q"
          defaultValue={filters.q}
          placeholder="Title or place"
          className={fieldClass}
        />
      </label>
      <label className="flex flex-col gap-2 text-sm font-medium">
        Year
        <select name="year" defaultValue={filters.year} className={fieldClass}>
          <option value="">Any year</option>
          {years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-2 text-sm font-medium">
        Person
        <select name="member" defaultValue={filters.memberId} className={fieldClass}>
          <option value="">Anyone</option>
          {people.map((person) => (
            <option key={person.id} value={person.id}>
              {person.displayName}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-2 text-sm font-medium">
        Minimum rating
        <select
          name="rating"
          defaultValue={filters.minimumRating ? String(filters.minimumRating) : ""}
          className={fieldClass}
        >
          <option value="">Any rating</option>
          <option value="3">3+</option>
          <option value="4">4+</option>
          <option value="5">5 only</option>
        </select>
      </label>
      <div className="flex items-end gap-3">
        <Button type="submit" className="h-11 px-4">
          Filter
        </Button>
        {filtersAreActive(filters) ? (
          <Link href="/hikes" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
            Clear
          </Link>
        ) : null}
      </div>
    </form>
  );
}

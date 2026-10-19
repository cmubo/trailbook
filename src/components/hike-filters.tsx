"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Logo } from "@/components/logo";
import { ProfileAvatar } from "@/components/profile-avatar";
import {
  emptyHikeFilters,
  hikeListHref,
  hikeMatches,
  type FilterableHike,
  type HikeFilters,
} from "@/lib/hikes/filters";
import { countLabel } from "@/lib/hikes/format";

const fieldClass =
  "h-12 w-full rounded-[12px] border border-line bg-paper px-3 text-base font-normal text-ink outline-none focus-ring";

const historyKey = "trailbookFilters";

export function HikeFilterControls({
  hikes,
  people,
  years,
  filters,
  thisYear,
  profile,
  children,
}: {
  hikes: FilterableHike[];
  people: { id: string; displayName: string }[];
  years: string[];
  filters: HikeFilters;
  thisYear: number;
  profile: { userId: string; displayName: string; avatarUrl: string | null };
  children: React.ReactNode;
}) {
  const router = useRouter();
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const pushed = useRef(false);
  const filterKey = hikeListHref(filters);
  const [open, setOpen] = useState(false);
  const [draftKey, setDraftKey] = useState(filterKey);
  const [draft, setDraft] = useState(filters);
  if (filterKey !== draftKey) {
    setDraftKey(filterKey);
    setDraft(filters);
  }
  const yearChoices = draft.year && !years.includes(draft.year) ? [draft.year, ...years] : years;

  useEffect(() => {
    if (!open) {
      return;
    }

    dialogRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onPop() {
      pushed.current = false;
      setOpen(false);
      setDraft(filters);
    }

    window.addEventListener("popstate", onPop);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("popstate", onPop);
    };
  }, [open, filters]);

  function openSheet() {
    setDraft(filters);
    setOpen(true);
    if (!pushed.current) {
      window.history.pushState({ [historyKey]: true }, "");
      pushed.current = true;
    }
  }

  function closeSheet() {
    setDraft(filters);
    setOpen(false);
    if (pushed.current) {
      pushed.current = false;
      window.history.back();
    }
  }

  function apply(next: HikeFilters) {
    const href = hikeListHref(next);
    setDraft(next);
    setOpen(false);
    if (pushed.current) {
      window.history.replaceState(null, "", href);
    }
    pushed.current = false;
    router.replace(href);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between min-[800px]:hidden">
        <Logo />
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Search and filter hikes"
            className="focus-ring grid size-11 place-items-center rounded-full bg-sage-100 text-forest"
            onClick={openSheet}
          >
            <Search className="size-5" aria-hidden="true" />
          </button>
          <Link href="/profile" aria-label="Your profile" className="focus-ring rounded-full">
            <ProfileAvatar
              name={profile.displayName}
              userId={profile.userId}
              avatarUrl={profile.avatarUrl}
              size="md"
            />
          </Link>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-[11px] font-semibold tracking-[0.14em] text-terracotta uppercase">
          {countLabel(thisYear, "adventure")} this year
        </p>
        <h1 className="font-heading text-[32px] leading-9 font-semibold tracking-tight">Our hikes</h1>
      </div>
      <div className="hidden min-[800px]:block">
        <HikeFilterFields
          hikes={hikes}
          people={people}
          years={yearChoices}
          draft={draft}
          setDraft={setDraft}
          layout="inline"
          onApply={() => router.push(hikeListHref(draft))}
          onClear={() => router.push(hikeListHref(emptyHikeFilters))}
        />
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        <YearChip href={hikeListHref({ ...filters, year: "" })} selected={filters.year === ""}>
          All
        </YearChip>
        {years.map((item) => (
          <YearChip key={item} href={hikeListHref({ ...filters, year: item })} selected={filters.year === item}>
            {item}
          </YearChip>
        ))}
        <button
          type="button"
          className="focus-ring inline-flex h-10 shrink-0 items-center rounded-full bg-sage-100 px-4 text-sm font-medium text-forest min-[800px]:hidden"
          onClick={openSheet}
        >
          People and rating
        </button>
      </div>
      {children}
      {open ? (
        <div className="min-[800px]:hidden">
          <button
            type="button"
            aria-label="Close filters"
            className="fixed inset-0 z-40 animate-[sheet-fade_300ms_ease-out] bg-[#171815]/50 motion-reduce:animate-none"
            onClick={closeSheet}
          />
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            className="fixed inset-x-0 bottom-0 z-50 flex max-h-[min(85vh,720px)] flex-col animate-[sheet-up_300ms_ease-out] rounded-t-[28px] bg-cream shadow-float outline-none motion-reduce:animate-none"
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                closeSheet();
              }
            }}
          >
            <div className="flex justify-center pt-3" aria-hidden="true">
              <span className="h-1.5 w-10 rounded-full bg-line-strong" />
            </div>
            <div className="overflow-y-auto px-4 pt-4 pb-8">
              <h2 id={titleId} className="font-heading text-2xl font-semibold tracking-tight">
                Find a hike
              </h2>
              <div className="mt-4">
                <HikeFilterFields
                  hikes={hikes}
                  people={people}
                  years={yearChoices}
                  draft={draft}
                  setDraft={setDraft}
                  layout="sheet"
                  onApply={() => apply(draft)}
                  onClear={() => apply(emptyHikeFilters)}
                />
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function HikeFilterFields({
  hikes,
  people,
  years,
  draft,
  setDraft,
  layout,
  onApply,
  onClear,
}: {
  hikes: FilterableHike[];
  people: { id: string; displayName: string }[];
  years: string[];
  draft: HikeFilters;
  setDraft: (next: HikeFilters) => void;
  layout: "sheet" | "inline";
  onApply?: () => void;
  onClear: () => void;
}) {
  const count = hikes.filter((hike) => hikeMatches(hike, draft)).length;
  const label = count === 1 ? "Show 1 hike" : `Show ${count} hikes`;

  return (
    <form
      action="/hikes"
      method="get"
      className={layout === "inline" ? "flex flex-col gap-4" : "flex flex-col gap-5"}
      onSubmit={(event) => {
        if (onApply) {
          event.preventDefault();
          onApply();
        }
      }}
    >
      <label className="flex flex-col gap-2 text-sm font-medium">
        Search
        <input
          name="q"
          value={draft.q}
          onChange={(event) => setDraft({ ...draft, q: event.target.value })}
          className={fieldClass}
        />
      </label>
      {layout === "sheet" ? (
        <label className="flex flex-col gap-2 text-sm font-medium">
          Year
          <select
            name="year"
            value={draft.year}
            onChange={(event) => setDraft({ ...draft, year: event.target.value })}
            className={fieldClass}
          >
            <option value="">Any year</option>
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <input type="hidden" name="year" value={draft.year} />
      )}
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">Who came</legend>
        <div className="flex flex-wrap gap-2">
          {people.map((person) => {
            const checked = draft.memberIds.includes(person.id);
            return (
              <label
                key={person.id}
                className={`focus-within:shadow-[0_0_0_2px_#f6f1e7,0_0_0_4px_#2f5d46] inline-flex min-h-11 cursor-pointer items-center rounded-full px-4 text-sm font-medium ${checked ? "bg-forest text-paper" : "bg-paper text-ink shadow-card"}`}
              >
                <input
                  type="checkbox"
                  name="member"
                  value={person.id}
                  checked={checked}
                  className="sr-only"
                  onChange={() => {
                    const memberIds = checked
                      ? draft.memberIds.filter((id) => id !== person.id)
                      : [...draft.memberIds, person.id];
                    setDraft({ ...draft, memberIds });
                  }}
                />
                {person.displayName}
              </label>
            );
          })}
        </div>
      </fieldset>
      <label className="flex flex-col gap-2 text-sm font-medium">
        Rating
        <select
          name="rating"
          value={draft.minimumRating ?? ""}
          onChange={(event) => {
            const value = event.target.value;
            setDraft({
              ...draft,
              minimumRating: value === "3" || value === "4" || value === "5" ? (Number(value) as 3 | 4 | 5) : null,
            });
          }}
          className={fieldClass}
        >
          <option value="">Any rating</option>
          <option value="3">3 stars and up</option>
          <option value="4">4 stars and up</option>
          <option value="5">5 stars</option>
        </select>
      </label>
      <div className={layout === "inline" ? "flex items-center gap-3" : "flex flex-col gap-3"}>
        <button
          type="submit"
          className="focus-ring inline-flex h-12 items-center justify-center rounded-full bg-forest px-5 text-sm font-medium text-paper hover:bg-forest-hover"
        >
          {label}
        </button>
        <button type="button" className="focus-ring text-sm font-medium text-forest" onClick={onClear}>
          Clear all
        </button>
      </div>
    </form>
  );
}

function YearChip({
  href,
  selected,
  children,
}: {
  href: string;
  selected: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={selected ? "true" : undefined}
      className={`focus-ring inline-flex h-10 shrink-0 items-center rounded-full px-4 text-sm font-medium ${selected ? "bg-forest text-paper" : "bg-paper text-ink shadow-card"}`}
    >
      {children}
    </Link>
  );
}

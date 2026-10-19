"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { saveHike } from "@/lib/hikes/actions";
import { setCover } from "@/lib/hikes/contributions";
import { hikeFormSchema, type HikeFormValues } from "@/lib/hikes/schema";

const fieldClass =
  "h-12 w-full rounded-[12px] border border-line bg-cream px-3 text-base font-normal outline-none focus-ring aria-invalid:border-danger";

export type CoverChoice = {
  storagePath: string;
  imageUrl: string;
  caption: string | null;
};

export function HikeForm({
  hikeId,
  defaults,
  people,
  coverPhotos = [],
  coverPath = null,
}: {
  hikeId: string | null;
  defaults: HikeFormValues;
  people: { id: string; displayName: string; active: boolean }[];
  coverPhotos?: CoverChoice[];
  coverPath?: string | null;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const form = useForm<HikeFormValues>({
    resolver: zodResolver(hikeFormSchema),
    defaultValues: defaults,
  });
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = form;

  async function onSubmit(values: HikeFormValues) {
    setPending(true);
    setError(null);
    const result = await saveHike(hikeId, values);
    if (result?.error) {
      setError(result.error);
      setPending(false);
    }
  }

  return (
    <form className="flex flex-col gap-5" onSubmit={handleSubmit(onSubmit)} noValidate>
      <Section title="The basics">
        <Field label="Title" error={errors.title?.message}>
          <input {...register("title")} className={fieldClass} aria-invalid={Boolean(errors.title)} />
        </Field>
        <Field label="Date" error={errors.hikeDate?.message}>
          <input
            type="date"
            {...register("hikeDate")}
            className={fieldClass}
            aria-invalid={Boolean(errors.hikeDate)}
          />
        </Field>
        <Field label="Description" error={errors.description?.message}>
          <textarea
            {...register("description")}
            rows={5}
            className="min-h-32 w-full rounded-[12px] border border-line bg-cream px-3 py-2 text-base font-normal outline-none focus-ring aria-invalid:border-danger"
            aria-invalid={Boolean(errors.description)}
          />
        </Field>
      </Section>
      <Section title="Who's coming" hint="Only people in the group can be added.">
        {people.length === 0 ? (
          <p className="text-sm text-ink-muted">No members to add.</p>
        ) : (
          <Controller
            name="participantIds"
            control={control}
            render={({ field }) => (
              <div className="flex flex-col gap-2">
                {people.map((person) => {
                  const checked = field.value.includes(person.id);
                  return (
                    <label key={person.id} className="flex min-h-11 items-center gap-3 text-sm font-normal">
                      <input
                        type="checkbox"
                        value={person.id}
                        checked={checked}
                        onBlur={field.onBlur}
                        onChange={(event) => {
                          const next = new Set(field.value);
                          if (event.target.checked) {
                            next.add(person.id);
                          } else {
                            next.delete(person.id);
                          }
                          field.onChange([...next]);
                        }}
                        className="size-4 accent-forest"
                      />
                      <span>
                        {person.displayName}
                        {person.active ? "" : " (no longer in the group)"}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          />
        )}
        {errors.participantIds ? <p className="text-sm text-danger">Choose people from the group.</p> : null}
      </Section>
      <Section title="Where" hint="Leave both coordinates blank if you do not have a point.">
        <Field label="Location" error={errors.locationName?.message}>
          <input
            {...register("locationName")}
            className={fieldClass}
            aria-invalid={Boolean(errors.locationName)}
          />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Latitude" error={errors.latitude?.message}>
            <input
              {...register("latitude")}
              inputMode="decimal"
              className={fieldClass}
              aria-invalid={Boolean(errors.latitude)}
            />
          </Field>
          <Field label="Longitude" error={errors.longitude?.message}>
            <input
              {...register("longitude")}
              inputMode="decimal"
              className={fieldClass}
              aria-invalid={Boolean(errors.longitude)}
            />
          </Field>
        </div>
      </Section>
      <Section title="Optional cover" hint="Skip it and we'll use the first photo added.">
        {hikeId ? (
          <CoverChoices hikeId={hikeId} photos={coverPhotos} coverPath={coverPath} />
        ) : (
          <p className="text-sm text-ink-muted">A cover can be chosen once a photo has been uploaded.</p>
        )}
      </Section>
      <Section title="Optional trail details">
        <Field label="Trail link" error={errors.trailUrl?.message}>
          <input
            {...register("trailUrl")}
            inputMode="url"
            placeholder="https://"
            className={fieldClass}
            aria-invalid={Boolean(errors.trailUrl)}
          />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Distance (km)" error={errors.distanceKm?.message}>
            <input
              {...register("distanceKm")}
              inputMode="decimal"
              className={fieldClass}
              aria-invalid={Boolean(errors.distanceKm)}
            />
          </Field>
          <Field label="Difficulty" error={errors.difficulty?.message}>
            <select {...register("difficulty")} className={fieldClass} aria-invalid={Boolean(errors.difficulty)}>
              <option value="">Not set</option>
              <option value="easy">Easy</option>
              <option value="moderate">Moderate</option>
              <option value="hard">Hard</option>
            </select>
          </Field>
        </div>
      </Section>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <button
        type="submit"
        className="focus-ring h-12 rounded-full bg-forest px-5 text-sm font-medium text-paper hover:bg-forest-hover disabled:opacity-50"
        disabled={pending}
      >
        {pending ? "Saving…" : hikeId ? "Save changes" : "Create hike"}
      </button>
    </form>
  );
}

function CoverChoices({
  hikeId,
  photos,
  coverPath,
}: {
  hikeId: string;
  photos: CoverChoice[];
  coverPath: string | null;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const choices = photos.filter((photo) => photo.imageUrl);

  async function choose(path: string | null) {
    setPending(true);
    setError(null);
    const result = await setCover(hikeId, path);
    if (result?.error) {
      setError(result.error);
      setPending(false);
      return;
    }

    setPending(false);
    router.refresh();
  }

  if (choices.length === 0) {
    return <p className="text-sm text-ink-muted">No uploaded photo to use as a cover yet.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <ul className="grid grid-cols-3 gap-2">
        {choices.map((photo) => {
          const selected = coverPath === photo.storagePath;
          return (
            <li key={photo.storagePath}>
              <button
                type="button"
                disabled={pending}
                aria-pressed={selected}
                className={`focus-ring overflow-hidden rounded-[12px] ${selected ? "ring-2 ring-forest" : ""}`}
                onClick={() => choose(selected ? null : photo.storagePath)}
              >
                {/* Signed URLs expire and point at the private storage host. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.imageUrl} alt={photo.caption ?? "Cover choice"} className="aspect-square w-full object-cover" />
              </button>
            </li>
          );
        })}
      </ul>
      <p className="text-sm text-ink-muted">Tap a photo to use it as the cover. Tap it again to clear the cover.</p>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </div>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 rounded-[20px] bg-paper p-5 shadow-card">
      <div>
        <h2 className="font-heading text-xl font-semibold">{title}</h2>
        {hint ? <p className="mt-1 text-sm text-ink-muted">{hint}</p> : null}
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-2 text-sm font-medium">
      {label}
      {children}
      {error ? <span className="font-normal text-danger">{error}</span> : null}
    </label>
  );
}

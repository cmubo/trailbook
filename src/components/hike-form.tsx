"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { saveHike } from "@/lib/hikes/actions";
import { hikeFormSchema, type HikeFormValues } from "@/lib/hikes/schema";

const fieldClass =
  "h-11 w-full rounded-lg border border-input bg-background px-3 text-base font-normal outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive";

export function HikeForm({
  hikeId,
  defaults,
  people,
}: {
  hikeId: string | null;
  defaults: HikeFormValues;
  people: { id: string; displayName: string; active: boolean }[];
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
          className="min-h-32 w-full rounded-lg border border-input bg-background px-3 py-2 text-base font-normal outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive"
          aria-invalid={Boolean(errors.description)}
        />
      </Field>
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
      <p className="text-sm text-muted-foreground">Leave both coordinates blank if you do not have a point.</p>
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
      <fieldset className="flex flex-col gap-3">
        <legend className="text-sm font-medium">Who went</legend>
        {people.length === 0 ? (
          <p className="text-sm text-muted-foreground">No members to add.</p>
        ) : (
          <Controller
            name="participantIds"
            control={control}
            render={({ field }) => (
              <div className="flex flex-col gap-2">
                {people.map((person) => {
                  const checked = field.value.includes(person.id);
                  return (
                    <label key={person.id} className="flex items-center gap-3 text-sm font-normal">
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
                        className="size-4 accent-primary"
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
        {errors.participantIds ? (
          <p className="text-sm text-destructive">Choose people from the group.</p>
        ) : null}
      </fieldset>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" className="h-11 px-4" disabled={pending}>
        {pending ? "Saving…" : hikeId ? "Save changes" : "Create hike"}
      </Button>
    </form>
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
      {error ? <span className="font-normal text-destructive">{error}</span> : null}
    </label>
  );
}

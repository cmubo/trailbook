import { z } from "zod";

export const hikeFormSchema = z
  .object({
    title: z.string().trim().min(1, "Add a title.").max(140, "Keep the title under 140 characters."),
    hikeDate: z.string().trim(),
    description: z
      .string()
      .trim()
      .max(8000, "Keep the description under 8,000 characters."),
    locationName: z.string().trim().max(120, "Keep the location under 120 characters."),
    latitude: z.string().trim(),
    longitude: z.string().trim(),
    trailUrl: z.string().trim().max(2000, "That trail link is too long."),
    distanceKm: z.string().trim(),
    difficulty: z.enum(["", "easy", "moderate", "hard"]),
    participantIds: z.array(z.uuid()),
  })
  .superRefine((value, ctx) => {
    if (!isRealDate(value.hikeDate)) {
      ctx.addIssue({
        code: "custom",
        path: ["hikeDate"],
        message: "Choose a valid date.",
      });
    }

    const latitude = parseCoordinate(value.latitude, -90, 90);
    const longitude = parseCoordinate(value.longitude, -180, 180);

    if (latitude === "empty" && longitude === "empty") {
      // Both blank is allowed.
    } else if (latitude === "empty" || longitude === "empty") {
      const message = "Enter both latitude and longitude, or leave both blank.";
      ctx.addIssue({ code: "custom", path: ["latitude"], message });
      ctx.addIssue({ code: "custom", path: ["longitude"], message });
    } else {
      if (latitude === "invalid") {
        ctx.addIssue({
          code: "custom",
          path: ["latitude"],
          message: "Latitude must be between -90 and 90.",
        });
      }
      if (longitude === "invalid") {
        ctx.addIssue({
          code: "custom",
          path: ["longitude"],
          message: "Longitude must be between -180 and 180.",
        });
      }
    }

    if (value.trailUrl && !isHttpsUrl(value.trailUrl)) {
      ctx.addIssue({
        code: "custom",
        path: ["trailUrl"],
        message: "Use an https trail link.",
      });
    }

    if (value.distanceKm && parseDistance(value.distanceKm) === null) {
      ctx.addIssue({
        code: "custom",
        path: ["distanceKm"],
        message: "Distance must be greater than 0 and less than 500 km.",
      });
    }
  });

export type HikeFormValues = z.infer<typeof hikeFormSchema>;

export const emptyHikeForm: HikeFormValues = {
  title: "",
  hikeDate: "",
  description: "",
  locationName: "",
  latitude: "",
  longitude: "",
  trailUrl: "",
  distanceKm: "",
  difficulty: "",
  participantIds: [],
};

export type HikeWrite = {
  title: string;
  description: string | null;
  hike_date: string;
  location_name: string | null;
  latitude: number | null;
  longitude: number | null;
  trail_url: string | null;
  distance_km: number | null;
  difficulty: "easy" | "moderate" | "hard" | null;
};

export function toHikeWrite(values: HikeFormValues): {
  row: HikeWrite;
  participantIds: string[];
} {
  const latitude = parseCoordinate(values.latitude, -90, 90);
  const longitude = parseCoordinate(values.longitude, -180, 180);
  const distance = values.distanceKm ? parseDistance(values.distanceKm) : null;

  if (
    latitude === "invalid" ||
    longitude === "invalid" ||
    (latitude === "empty") !== (longitude === "empty") ||
    (values.distanceKm !== "" && distance === null) ||
    (values.trailUrl !== "" && !isHttpsUrl(values.trailUrl)) ||
    !isRealDate(values.hikeDate)
  ) {
    throw new Error("Invalid hike");
  }

  return {
    row: {
      title: values.title.trim(),
      description: values.description.trim() || null,
      hike_date: values.hikeDate,
      location_name: values.locationName.trim() || null,
      latitude: typeof latitude === "number" ? latitude : null,
      longitude: typeof longitude === "number" ? longitude : null,
      trail_url: values.trailUrl.trim() || null,
      distance_km: distance,
      difficulty: values.difficulty || null,
    },
    participantIds: [...new Set(values.participantIds)],
  };
}

function isRealDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

function parseCoordinate(value: string, min: number, max: number): number | "empty" | "invalid" {
  if (!value) {
    return "empty";
  }

  if (!/^-?\d+(\.\d+)?$/.test(value)) {
    return "invalid";
  }

  const number = Number(value);
  if (!Number.isFinite(number) || number < min || number > max) {
    return "invalid";
  }

  return number;
}

function parseDistance(value: string) {
  if (!/^\d+(\.\d{1,2})?$/.test(value)) {
    return null;
  }

  const number = Number(value);
  if (!(number > 0 && number < 500)) {
    return null;
  }

  return number;
}

function isHttpsUrl(value: string) {
  if (!value.startsWith("https://") || value.length > 2000) {
    return false;
  }

  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

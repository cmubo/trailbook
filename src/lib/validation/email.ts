import { z } from "zod";

const emailSchema = z.email();

export function parseEmail(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const parsed = emailSchema.safeParse(value.trim().toLowerCase());
  return parsed.success ? parsed.data : null;
}

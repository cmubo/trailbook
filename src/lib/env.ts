import "server-only";

import { z } from "zod";
import { getPublicEnv, type PublicEnv } from "@/lib/env-public";

const serverEnvSchema = z.object({
  SUPABASE_SECRET_KEY: z.string().trim().min(1),
  OWNER_ROUTE_SECRET: z.string().trim().min(16),
});

export type AppEnv = PublicEnv & z.infer<typeof serverEnvSchema>;

export function getEnv(): AppEnv {
  const parsed = serverEnvSchema.safeParse({
    SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
    OWNER_ROUTE_SECRET: process.env.OWNER_ROUTE_SECRET,
  });

  if (!parsed.success) {
    const names = parsed.error.issues.map((issue) => issue.path.join("."));
    throw new Error(
      `Missing or invalid environment variables: ${names.join(", ")}. Copy .env.example to .env.local and fill it from \`npx supabase status\`.`,
    );
  }

  return { ...getPublicEnv(), ...parsed.data };
}

import "server-only";

import { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export async function loadOwnProfile(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("display_name, avatar_path")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) {
    throw new Error("The profile could not be loaded.");
  }

  const urls = await signAvatarPaths(supabase, [data.avatar_path]);

  return {
    displayName: data.display_name,
    avatarUrl: data.avatar_path ? (urls.get(data.avatar_path) ?? null) : null,
  };
}

export async function signAvatarPaths(supabase: Supabase, paths: Array<string | null | undefined>) {
  const unique = [...new Set(paths.filter((path): path is string => Boolean(path)))];
  const urls = new Map<string, string>();
  if (unique.length === 0) {
    return urls;
  }

  const present = new Set<string>();
  await Promise.all(
    unique.map(async (path) => {
      const folder = path.split("/")[0] ?? "";
      if (!folder) {
        return;
      }

      const { data, error } = await supabase.storage.from("avatars").list(folder, { limit: 10 });
      if (error || !data) {
        return;
      }

      if (data.some((item) => item.name === "avatar.webp")) {
        present.add(`${folder}/avatar.webp`);
      }
    }),
  );

  const toSign = unique.filter((path) => present.has(path));
  if (toSign.length === 0) {
    return urls;
  }

  const { data, error } = await supabase.storage.from("avatars").createSignedUrls(toSign, 60 * 60);
  if (error || !data) {
    return urls;
  }

  for (const item of data) {
    const url = item.signedUrl ?? item.signedURL;
    if (item.path && url && !item.error) {
      urls.set(item.path, url);
    }
  }

  return urls;
}

import "server-only";

import { signAvatarPaths } from "@/lib/profile/queries";
import { createClient } from "@/lib/supabase/server";

export type Person = {
  id: string;
  displayName: string;
  active: boolean;
};

export type HikeRecord = {
  id: string;
  title: string;
  description: string | null;
  hikeDate: string;
  locationName: string | null;
  latitude: number | null;
  longitude: number | null;
  trailUrl: string | null;
  distanceKm: number | null;
  difficulty: string | null;
  participants: { id: string; displayName: string; avatarUrl: string | null }[];
  averageScore: number | null;
  ratingCount: number;
  coverPhotoPath: string | null;
  coverUrl: string | null;
  photoCount: number;
};

export type HikeCommentRecord = {
  id: string;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  content: string;
  createdAt: string;
};

export type HikePhotoRecord = {
  id: string;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  caption: string | null;
  storagePath: string;
  imageUrl: string | null;
};

export type HikeContributions = {
  ownScore: number | null;
  comments: HikeCommentRecord[];
  photos: HikePhotoRecord[];
};

const hikeColumns =
  "id, title, description, hike_date, location_name, latitude, longitude, trail_url, distance_km, difficulty, cover_photo_path" as const;

type HikeRow = {
  id: string;
  title: string;
  description: string | null;
  hike_date: string;
  location_name: string | null;
  latitude: number | null;
  longitude: number | null;
  trail_url: string | null;
  distance_km: number | null;
  difficulty: string | null;
  cover_photo_path: string | null;
};

type RatingRow = {
  hike_id: string | null;
  average_score: number | null;
  rating_count: number | null;
};

export async function loadJournal(): Promise<{ hikes: HikeRecord[]; people: Person[] }> {
  const supabase = await createClient();
  const [hikesResult, participantsResult, profilesResult, ratingsResult, rolesResult, photosResult] =
    await Promise.all([
      supabase
        .from("hikes")
        .select(hikeColumns)
        .order("hike_date", { ascending: false })
        .order("title", { ascending: true }),
      supabase.from("hike_participants").select("hike_id, user_id"),
      supabase.from("profiles").select("id, display_name, avatar_path"),
      supabase.from("hike_rating_summaries").select("hike_id, average_score, rating_count"),
      supabase.from("user_roles").select("user_id, status"),
      supabase.from("hike_photos").select("hike_id"),
    ]);

  if (
    hikesResult.error ||
    participantsResult.error ||
    profilesResult.error ||
    ratingsResult.error ||
    rolesResult.error ||
    photosResult.error
  ) {
    throw new Error("Hikes could not be loaded.");
  }

  const people = toPeople(
    (profilesResult.data ?? []).map((profile) => ({
      id: profile.id,
      display_name: profile.display_name,
    })),
    rolesResult.data ?? [],
  );
  const avatarUrls = await signAvatarPaths(
    supabase,
    (profilesResult.data ?? []).map((profile) => profile.avatar_path),
  );
  const profiles = new Map(
    (profilesResult.data ?? []).map((profile) => [
      profile.id,
      {
        displayName: profile.display_name,
        avatarUrl: profile.avatar_path ? (avatarUrls.get(profile.avatar_path) ?? null) : null,
      },
    ]),
  );
  const ratings = new Map<string, RatingRow>();
  for (const row of ratingsResult.data ?? []) {
    if (row.hike_id) {
      ratings.set(row.hike_id, row);
    }
  }

  const photoCounts = new Map<string, number>();
  for (const row of photosResult.data ?? []) {
    photoCounts.set(row.hike_id, (photoCounts.get(row.hike_id) ?? 0) + 1);
  }

  const participantsByHike = new Map<string, { id: string; displayName: string; avatarUrl: string | null }[]>();
  for (const row of participantsResult.data ?? []) {
    const list = participantsByHike.get(row.hike_id) ?? [];
    const profile = profiles.get(row.user_id);
    list.push({
      id: row.user_id,
      displayName: profile?.displayName ?? "Member",
      avatarUrl: profile?.avatarUrl ?? null,
    });
    participantsByHike.set(row.hike_id, list);
  }

  for (const list of participantsByHike.values()) {
    list.sort((a, b) => a.displayName.localeCompare(b.displayName, "en"));
  }

  const hikes = await withCoverUrls(
    supabase,
    (hikesResult.data ?? []).map((row) =>
      toHike(
        row,
        participantsByHike.get(row.id) ?? [],
        ratings.get(row.id),
        photoCounts.get(row.id) ?? 0,
      ),
    ),
  );

  return { hikes, people };
}

export async function loadHike(id: string): Promise<HikeRecord | null> {
  const supabase = await createClient();
  const hikeResult = await supabase.from("hikes").select(hikeColumns).eq("id", id).maybeSingle();

  if (hikeResult.error) {
    throw new Error("The hike could not be loaded.");
  }

  if (!hikeResult.data) {
    return null;
  }

  const [participantsResult, ratingResult, photosResult] = await Promise.all([
    supabase.from("hike_participants").select("user_id").eq("hike_id", id),
    supabase
      .from("hike_rating_summaries")
      .select("hike_id, average_score, rating_count")
      .eq("hike_id", id)
      .maybeSingle(),
    supabase.from("hike_photos").select("id").eq("hike_id", id),
  ]);

  if (participantsResult.error || ratingResult.error || photosResult.error) {
    throw new Error("The hike could not be loaded.");
  }

  const participantIds = (participantsResult.data ?? []).map((row) => row.user_id);
  const profilesResult =
    participantIds.length > 0
      ? await supabase.from("profiles").select("id, display_name, avatar_path").in("id", participantIds)
      : { data: [], error: null };

  if (profilesResult.error) {
    throw new Error("The hike could not be loaded.");
  }

  const avatarUrls = await signAvatarPaths(
    supabase,
    (profilesResult.data ?? []).map((profile) => profile.avatar_path),
  );
  const profiles = new Map(
    (profilesResult.data ?? []).map((profile) => [
      profile.id,
      {
        displayName: profile.display_name,
        avatarUrl: profile.avatar_path ? (avatarUrls.get(profile.avatar_path) ?? null) : null,
      },
    ]),
  );
  const participants = participantIds
    .map((userId) => ({
      id: userId,
      displayName: profiles.get(userId)?.displayName ?? "Member",
      avatarUrl: profiles.get(userId)?.avatarUrl ?? null,
    }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName, "en"));

  return toHike(hikeResult.data, participants, ratingResult.data, photosResult.data?.length ?? 0);
}

export async function loadTrailNumber(hikeId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("hikes").select("id, hike_date, title");
  if (error) {
    throw new Error("The hike could not be loaded.");
  }

  const ordered = [...(data ?? [])].sort((left, right) => {
    const byDate = left.hike_date.localeCompare(right.hike_date);
    return byDate === 0 ? left.title.localeCompare(right.title, "en") : byDate;
  });
  const index = ordered.findIndex((row) => row.id === hikeId);
  return index < 0 ? 0 : index + 1;
}

export type DirectoryMember = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  hikeCount: number;
  photoCount: number;
};

export async function loadMemberDirectory(): Promise<{
  members: DirectoryMember[];
  hikeCount: number;
  sinceYear: string | null;
}> {
  const supabase = await createClient();
  const [profilesResult, rolesResult, participantsResult, photosResult, hikesResult] = await Promise.all([
    supabase.from("profiles").select("id, display_name, avatar_path"),
    supabase.from("user_roles").select("user_id, status"),
    supabase.from("hike_participants").select("user_id"),
    supabase.from("hike_photos").select("user_id"),
    supabase.from("hikes").select("hike_date"),
  ]);

  if (
    profilesResult.error ||
    rolesResult.error ||
    participantsResult.error ||
    photosResult.error ||
    hikesResult.error
  ) {
    throw new Error("Members could not be loaded.");
  }

  const active = new Set(
    (rolesResult.data ?? []).filter((role) => role.status === "active").map((role) => role.user_id),
  );
  const hikeCounts = new Map<string, number>();
  for (const row of participantsResult.data ?? []) {
    if (!active.has(row.user_id)) {
      continue;
    }
    hikeCounts.set(row.user_id, (hikeCounts.get(row.user_id) ?? 0) + 1);
  }

  const photoCounts = new Map<string, number>();
  for (const row of photosResult.data ?? []) {
    if (!active.has(row.user_id)) {
      continue;
    }
    photoCounts.set(row.user_id, (photoCounts.get(row.user_id) ?? 0) + 1);
  }

  const avatarUrls = await signAvatarPaths(
    supabase,
    (profilesResult.data ?? []).map((profile) => profile.avatar_path),
  );
  const members = (profilesResult.data ?? [])
    .filter((profile) => active.has(profile.id))
    .map((profile) => ({
      id: profile.id,
      displayName: profile.display_name,
      avatarUrl: profile.avatar_path ? (avatarUrls.get(profile.avatar_path) ?? null) : null,
      hikeCount: hikeCounts.get(profile.id) ?? 0,
      photoCount: photoCounts.get(profile.id) ?? 0,
    }))
    .sort((left, right) => left.displayName.localeCompare(right.displayName, "en"));
  const years = (hikesResult.data ?? []).map((hike) => hike.hike_date.slice(0, 4)).sort();

  return {
    members,
    hikeCount: hikesResult.data?.length ?? 0,
    sinceYear: years[0] ?? null,
  };
}

export async function loadPeople(): Promise<Person[]> {
  const supabase = await createClient();
  const [profilesResult, rolesResult] = await Promise.all([
    supabase.from("profiles").select("id, display_name"),
    supabase.from("user_roles").select("user_id, status"),
  ]);

  if (profilesResult.error || rolesResult.error) {
    throw new Error("Members could not be loaded.");
  }

  return toPeople(profilesResult.data ?? [], rolesResult.data ?? []);
}

function toPeople(
  profiles: { id: string; display_name: string }[],
  roles: { user_id: string; status: string }[],
): Person[] {
  const statusByUser = new Map(roles.map((role) => [role.user_id, role.status]));

  return profiles
    .map((profile) => ({
      id: profile.id,
      displayName: profile.display_name,
      active: statusByUser.get(profile.id) === "active",
    }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName, "en"));
}

function toHike(
  row: HikeRow,
  participants: { id: string; displayName: string; avatarUrl: string | null }[],
  rating: RatingRow | null | undefined,
  photoCount: number,
): HikeRecord {
  const ratingCount = toNumber(rating?.rating_count) ?? 0;

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    hikeDate: row.hike_date,
    locationName: row.location_name,
    latitude: toNumber(row.latitude),
    longitude: toNumber(row.longitude),
    trailUrl: row.trail_url,
    distanceKm: toNumber(row.distance_km),
    difficulty: row.difficulty,
    participants,
    averageScore: ratingCount > 0 ? toNumber(rating?.average_score) : null,
    ratingCount,
    coverPhotoPath: row.cover_photo_path,
    coverUrl: null,
    photoCount,
  };
}

export async function loadContributions(hikeId: string, userId: string): Promise<HikeContributions> {
  const supabase = await createClient();
  const [ratingResult, commentsResult, photosResult] = await Promise.all([
    supabase
      .from("hike_ratings")
      .select("score")
      .eq("hike_id", hikeId)
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("hike_comments")
      .select("id, user_id, content, created_at")
      .eq("hike_id", hikeId)
      .order("created_at", { ascending: true }),
    supabase
      .from("hike_photos")
      .select("id, user_id, caption, storage_path, created_at")
      .eq("hike_id", hikeId)
      .order("created_at", { ascending: true }),
  ]);

  if (ratingResult.error || commentsResult.error || photosResult.error) {
    throw new Error("The hike could not be loaded.");
  }

  const authorIds = [
    ...new Set([
      ...(commentsResult.data ?? []).map((comment) => comment.user_id),
      ...(photosResult.data ?? []).map((photo) => photo.user_id),
    ]),
  ];
  const profilesResult =
    authorIds.length > 0
      ? await supabase.from("profiles").select("id, display_name, avatar_path").in("id", authorIds)
      : { data: [], error: null };

  if (profilesResult.error) {
    throw new Error("The hike could not be loaded.");
  }

  const avatarUrls = await signAvatarPaths(
    supabase,
    (profilesResult.data ?? []).map((profile) => profile.avatar_path),
  );
  const authors = new Map(
    (profilesResult.data ?? []).map((profile) => [
      profile.id,
      {
        displayName: profile.display_name,
        avatarUrl: profile.avatar_path ? (avatarUrls.get(profile.avatar_path) ?? null) : null,
      },
    ]),
  );
  const files = await filesInFolder(supabase, hikeId);
  const urls = await signPaths(
    supabase,
    (photosResult.data ?? [])
      .map((photo) => photo.storage_path)
      .filter((path) => files.has(path)),
  );

  return {
    ownScore: ratingResult.data?.score ?? null,
    comments: (commentsResult.data ?? []).map((comment) => ({
      id: comment.id,
      userId: comment.user_id,
      displayName: authors.get(comment.user_id)?.displayName ?? "Member",
      avatarUrl: authors.get(comment.user_id)?.avatarUrl ?? null,
      content: comment.content,
      createdAt: comment.created_at,
    })),
    photos: (photosResult.data ?? []).map((photo) => ({
      id: photo.id,
      userId: photo.user_id,
      displayName: authors.get(photo.user_id)?.displayName ?? "Member",
      avatarUrl: authors.get(photo.user_id)?.avatarUrl ?? null,
      caption: photo.caption,
      storagePath: photo.storage_path,
      imageUrl: urls.get(photo.storage_path) ?? null,
    })),
  };
}

async function withCoverUrls(
  supabase: Awaited<ReturnType<typeof createClient>>,
  hikes: HikeRecord[],
) {
  const folders = [
    ...new Set(
      hikes.flatMap((hike) => (hike.coverPhotoPath ? [hike.coverPhotoPath.split("/")[0] ?? ""] : [])),
    ),
  ].filter(Boolean);
  const present = new Set<string>();

  await Promise.all(
    folders.map(async (folder) => {
      const files = await filesInFolder(supabase, folder);
      for (const file of files) {
        present.add(file);
      }
    }),
  );

  const urls = await signPaths(
    supabase,
    hikes.flatMap((hike) =>
      hike.coverPhotoPath && present.has(hike.coverPhotoPath) ? [hike.coverPhotoPath] : [],
    ),
  );

  return hikes.map((hike) => ({
    ...hike,
    coverUrl: hike.coverPhotoPath ? (urls.get(hike.coverPhotoPath) ?? null) : null,
  }));
}

async function filesInFolder(supabase: Awaited<ReturnType<typeof createClient>>, hikeId: string) {
  const names = new Set<string>();
  const { data, error } = await supabase.storage.from("hike-photos").list(hikeId, { limit: 100 });
  if (error || !data) {
    return names;
  }

  for (const item of data) {
    if (item.name && /\.(jpg|jpeg|png|webp)$/i.test(item.name)) {
      names.add(`${hikeId}/${item.name}`);
    }
  }

  return names;
}

async function signPaths(supabase: Awaited<ReturnType<typeof createClient>>, paths: string[]) {
  const urls = new Map<string, string>();
  if (paths.length === 0) {
    return urls;
  }

  const { data, error } = await supabase.storage.from("hike-photos").createSignedUrls(paths, 60 * 60);
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

function toNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const number = Number(value);
    if (Number.isFinite(number)) {
      return number;
    }
  }

  return null;
}

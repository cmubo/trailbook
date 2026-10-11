"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireMemberAction, requireOwnerAction } from "@/lib/auth/access";
import { createClient } from "@/lib/supabase/server";

export type ContributionResult = {
  error: string;
};

const hikeIdSchema = z.uuid();
const scoreSchema = z.number().int().min(1).max(5);
const commentSchema = z
  .string()
  .trim()
  .min(1, "Write a comment.")
  .max(2000, "Keep the comment under 2,000 characters.");
const captionSchema = z.string().trim().max(300, "Keep the caption under 300 characters.");

export async function saveRating(hikeId: string, score: number): Promise<ContributionResult | undefined> {
  const member = await requireMemberAction();
  if (!member) {
    return { error: "You cannot rate hikes." };
  }

  if (!hikeIdSchema.safeParse(hikeId).success || !scoreSchema.safeParse(score).success) {
    return { error: "Choose a rating from 1 to 5." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("hike_ratings").upsert(
    {
      hike_id: hikeId,
      user_id: member.userId,
      score,
    },
    { onConflict: "hike_id,user_id" },
  );

  if (error) {
    return { error: "The rating could not be saved." };
  }

  refreshHike(hikeId);
}

export async function saveComment(
  hikeId: string,
  commentId: string | null,
  content: string,
): Promise<ContributionResult | undefined> {
  const member = await requireMemberAction();
  if (!member) {
    return { error: "You cannot comment." };
  }

  if (!hikeIdSchema.safeParse(hikeId).success) {
    return { error: "That hike could not be found." };
  }

  const parsed = commentSchema.safeParse(content);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Write a comment." };
  }

  const supabase = await createClient();

  if (commentId) {
    if (!hikeIdSchema.safeParse(commentId).success) {
      return { error: "That comment could not be found." };
    }

    const { data, error } = await supabase
      .from("hike_comments")
      .update({ content: parsed.data })
      .eq("id", commentId)
      .select("id")
      .maybeSingle();

    if (error || !data) {
      return { error: "You cannot edit that comment." };
    }
  } else {
    const { error } = await supabase.from("hike_comments").insert({
      hike_id: hikeId,
      user_id: member.userId,
      content: parsed.data,
    });

    if (error) {
      return { error: "The comment could not be saved." };
    }
  }

  refreshHike(hikeId);
}

export async function deleteComment(hikeId: string, commentId: string): Promise<ContributionResult | undefined> {
  const member = await requireMemberAction();
  if (!member) {
    return { error: "You cannot delete comments." };
  }

  if (!hikeIdSchema.safeParse(hikeId).success || !hikeIdSchema.safeParse(commentId).success) {
    return { error: "That comment could not be found." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("hike_comments")
    .delete()
    .eq("id", commentId)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return { error: "You cannot delete that comment." };
  }

  refreshHike(hikeId);
}

export async function savePhoto(
  hikeId: string,
  photoId: string,
  caption: string,
): Promise<ContributionResult | undefined> {
  const member = await requireMemberAction();
  if (!member) {
    return { error: "You cannot add photos." };
  }

  const hike = hikeIdSchema.safeParse(hikeId);
  const photo = hikeIdSchema.safeParse(photoId);
  const parsedCaption = captionSchema.safeParse(caption);
  if (!hike.success || !photo.success) {
    return { error: "The photo could not be saved." };
  }

  const path = `${hike.data.toLowerCase()}/${photo.data.toLowerCase()}.jpg`;
  const supabase = await createClient();

  if (!parsedCaption.success) {
    await supabase.storage.from("hike-photos").remove([path]);
    return { error: parsedCaption.error.issues[0]?.message ?? "Keep the caption under 300 characters." };
  }
  const { error } = await supabase.from("hike_photos").insert({
    id: photo.data.toLowerCase(),
    hike_id: hike.data.toLowerCase(),
    user_id: member.userId,
    storage_path: path,
    caption: parsedCaption.data || null,
  });

  if (error) {
    await supabase.storage.from("hike-photos").remove([path]);
    return { error: "The photo could not be saved." };
  }

  refreshHike(hike.data.toLowerCase());
}

export async function deletePhoto(hikeId: string, photoId: string): Promise<ContributionResult | undefined> {
  const member = await requireMemberAction();
  if (!member) {
    return { error: "You cannot delete photos." };
  }

  if (!hikeIdSchema.safeParse(hikeId).success || !hikeIdSchema.safeParse(photoId).success) {
    return { error: "That photo could not be found." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("hike_photos")
    .delete()
    .eq("id", photoId)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return { error: "You cannot delete that photo." };
  }

  refreshHike(hikeId);
}

export async function setCover(hikeId: string, storagePath: string | null): Promise<ContributionResult | undefined> {
  const owner = await requireOwnerAction();
  if (!owner) {
    return { error: "You cannot choose the cover." };
  }

  if (!hikeIdSchema.safeParse(hikeId).success) {
    return { error: "That hike could not be found." };
  }

  const supabase = await createClient();

  if (storagePath !== null) {
    const path = storagePath.trim();
    const folder = hikeId.toLowerCase();
    const fileName = path.startsWith(`${folder}/`) ? path.slice(folder.length + 1) : "";
    const { data: photo, error: photoError } = await supabase
      .from("hike_photos")
      .select("storage_path")
      .eq("hike_id", hikeId)
      .eq("storage_path", path)
      .maybeSingle();
    const { data: objects, error: listError } = await supabase.storage
      .from("hike-photos")
      .list(folder, { limit: 100 });
    const uploaded = (objects ?? []).some((object) => object.name === fileName);

    if (photoError || listError || !photo || !uploaded) {
      return { error: "Choose a photo that has been uploaded." };
    }
  }

  const { data, error } = await supabase
    .from("hikes")
    .update({ cover_photo_path: storagePath })
    .eq("id", hikeId)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return { error: "The cover could not be saved." };
  }

  refreshHike(hikeId);
}

function refreshHike(hikeId: string) {
  revalidatePath("/hikes");
  revalidatePath(`/hikes/${hikeId}`);
}

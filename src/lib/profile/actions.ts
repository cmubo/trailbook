"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireMemberAction } from "@/lib/auth/access";
import { createClient } from "@/lib/supabase/server";

export type ProfileResult = {
  error: string;
};

const nameSchema = z
  .string()
  .trim()
  .min(1, "Enter a name.")
  .max(80, "Keep the name under 80 characters.");

export async function saveDisplayName(name: string): Promise<ProfileResult | undefined> {
  const member = await requireMemberAction();
  if (!member) {
    return { error: "You cannot update your profile." };
  }

  const parsed = nameSchema.safeParse(name);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Enter a name." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .update({ display_name: parsed.data })
    .eq("id", member.userId)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return { error: "The name could not be saved." };
  }

  refreshProfile();
}

export async function saveAvatar(): Promise<ProfileResult | undefined> {
  const member = await requireMemberAction();
  if (!member) {
    return { error: "You cannot update your profile." };
  }

  const userId = member.userId.toLowerCase();
  const path = `${userId}/avatar.webp`;
  const supabase = await createClient();
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("avatar_path")
    .eq("id", member.userId)
    .maybeSingle();

  if (profileError || !profile) {
    return { error: "The photo could not be saved." };
  }

  const { data: objects, error: listError } = await supabase.storage.from("avatars").list(userId, {
    limit: 10,
  });
  const uploaded = (objects ?? []).some((object) => object.name === "avatar.webp");

  if (listError || !uploaded) {
    return { error: "Upload the photo before saving it." };
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({ avatar_path: path })
    .eq("id", member.userId)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    if (!profile.avatar_path) {
      await supabase.storage.from("avatars").remove([path]);
    }
    return { error: "The photo could not be saved." };
  }

  refreshProfile();
}

export async function removeAvatar(): Promise<ProfileResult | undefined> {
  const member = await requireMemberAction();
  if (!member) {
    return { error: "You cannot update your profile." };
  }

  const userId = member.userId.toLowerCase();
  const path = `${userId}/avatar.webp`;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .update({ avatar_path: null })
    .eq("id", member.userId)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return { error: "The photo could not be removed." };
  }

  await supabase.storage.from("avatars").remove([path]);
  refreshProfile();
}

function refreshProfile() {
  revalidatePath("/profile");
  revalidatePath("/hikes", "layout");
}

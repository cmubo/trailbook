"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireOwnerAction } from "@/lib/auth/access";
import { hikeFormSchema, toHikeWrite } from "@/lib/hikes/schema";
import { createClient } from "@/lib/supabase/server";

export type HikeActionResult = {
  error: string;
};

export async function saveHike(hikeId: string | null, input: unknown): Promise<HikeActionResult> {
  const owner = await requireOwnerAction();
  if (!owner) {
    return { error: "You cannot edit hikes." };
  }

  const parsed = hikeFormSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Check the hike details and try again." };
  }

  let write: ReturnType<typeof toHikeWrite>;
  try {
    write = toHikeWrite(parsed.data);
  } catch {
    return { error: "Check the hike details and try again." };
  }

  const supabase = await createClient();
  let id = hikeId;
  let created = false;

  if (id) {
    if (!z.uuid().safeParse(id).success) {
      return { error: "That hike could not be found." };
    }

    const { data, error } = await supabase
      .from("hikes")
      .update(write.row)
      .eq("id", id)
      .select("id")
      .maybeSingle();

    if (error || !data) {
      return { error: "The hike could not be saved." };
    }
  } else {
    const { data, error } = await supabase
      .from("hikes")
      .insert({
        ...write.row,
        created_by: owner.userId,
      })
      .select("id")
      .single();

    if (error || !data) {
      return { error: "The hike could not be saved." };
    }

    id = data.id;
    created = true;
  }

  const { error: participantError } = await supabase.rpc("set_hike_participants", {
    target_hike: id,
    member_ids: write.participantIds,
  });

  if (participantError) {
    if (created) {
      await supabase.from("hikes").delete().eq("id", id);
      return { error: "The hike could not be saved." };
    }

    return { error: "The hike was saved, but the people on it could not be updated." };
  }

  revalidatePath("/hikes");
  revalidatePath(`/hikes/${id}`);
  revalidatePath(`/hikes/${id}/edit`);
  redirect(`/hikes/${id}`);
}

export async function deleteHike(hikeId: string): Promise<HikeActionResult> {
  const owner = await requireOwnerAction();
  if (!owner) {
    return { error: "You cannot delete hikes." };
  }

  if (!z.uuid().safeParse(hikeId).success) {
    return { error: "That hike could not be found." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("hikes")
    .delete()
    .eq("id", hikeId)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return { error: "The hike could not be deleted." };
  }

  revalidatePath("/hikes");
  revalidatePath(`/hikes/${hikeId}`);
  redirect("/hikes");
}

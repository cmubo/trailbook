"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAuthState } from "@/lib/auth/session";
import { getEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { parseEmail } from "@/lib/validation/email";

export type MembershipResult = {
  error?: string;
  ok?: string;
};

const userIdSchema = z.uuid();

async function requireOwner(): Promise<{ userId: string } | null> {
  const auth = await getAuthState();
  if (auth.role !== "owner" || auth.status !== "active" || !auth.userId) {
    return null;
  }

  return { userId: auth.userId };
}

function refreshAdmin() {
  revalidatePath("/admin/[secret]", "page");
}

export async function inviteMember(
  _previous: MembershipResult,
  formData: FormData,
): Promise<MembershipResult> {
  const owner = await requireOwner();
  if (!owner) {
    return { error: "You cannot manage members." };
  }

  const email = parseEmail(formData.get("email"));
  if (!email) {
    return { error: "Enter a valid email address." };
  }

  const supabase = await createClient();
  const { error: insertError } = await supabase.from("invitations").insert({
    email,
    invited_by: owner.userId,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  });

  if (insertError) {
    if (insertError.message.toLowerCase().includes("already has an account")) {
      return {
        error: "That person already has an account. Restore their access instead of sending a new invitation.",
      };
    }

    return { error: "The invitation could not be saved." };
  }

  const env = getEnv();
  const admin = createAdminClient();
  const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
  });

  if (inviteError) {
    return {
      error: "The invitation was saved, but the email could not be sent. Try again.",
    };
  }

  refreshAdmin();
  return { ok: "Invitation sent." };
}

export async function revokeInvitation(
  _previous: MembershipResult,
  formData: FormData,
): Promise<MembershipResult> {
  const owner = await requireOwner();
  if (!owner) {
    return { error: "You cannot manage members." };
  }

  const parsed = userIdSchema.safeParse(formData.get("invitationId"));
  if (!parsed.success) {
    return { error: "That invitation could not be found." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("invitations")
    .update({ status: "revoked" })
    .eq("id", parsed.data)
    .eq("status", "pending")
    .select("id");

  if (error || !data?.length) {
    return { error: "That invitation could not be revoked." };
  }

  refreshAdmin();
  return { ok: "Invitation revoked." };
}

export async function revokeMember(
  _previous: MembershipResult,
  formData: FormData,
): Promise<MembershipResult> {
  const owner = await requireOwner();
  if (!owner) {
    return { error: "You cannot manage members." };
  }

  const parsed = userIdSchema.safeParse(formData.get("userId"));
  if (!parsed.success || parsed.data === owner.userId) {
    return { error: "That member could not be updated." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_roles")
    .update({ status: "revoked" })
    .eq("user_id", parsed.data)
    .eq("role", "member")
    .select("user_id");

  if (error || !data?.length) {
    return { error: "That member could not be updated." };
  }

  await revokeSessions(parsed.data);
  refreshAdmin();
  return { ok: "Access removed. Their contributions stay in the journal." };
}

export async function restoreMember(
  _previous: MembershipResult,
  formData: FormData,
): Promise<MembershipResult> {
  const owner = await requireOwner();
  if (!owner) {
    return { error: "You cannot manage members." };
  }

  const parsed = userIdSchema.safeParse(formData.get("userId"));
  if (!parsed.success) {
    return { error: "That member could not be updated." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_roles")
    .update({ status: "active" })
    .eq("user_id", parsed.data)
    .eq("role", "member")
    .eq("status", "revoked")
    .select("user_id");

  if (error || !data?.length) {
    return { error: "That member could not be restored." };
  }

  refreshAdmin();
  return { ok: "Access restored." };
}

async function revokeSessions(userId: string) {
  const env = getEnv();
  await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users/${userId}/logout`, {
    method: "POST",
    headers: {
      apikey: env.SUPABASE_SECRET_KEY,
      Authorization: `Bearer ${env.SUPABASE_SECRET_KEY}`,
    },
  });
}

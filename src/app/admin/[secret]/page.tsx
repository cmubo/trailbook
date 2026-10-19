import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { isOwnerRoute } from "@/lib/auth/owner-route";
import { getAuthState } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { MembershipPanel, type InvitationRow, type MemberRow } from "./membership-panel";

export default async function OwnerAdminPage({ params }: PageProps<"/admin/[secret]">) {
  const { secret } = await params;

  if (!isOwnerRoute(secret)) {
    notFound();
  }

  const auth = await getAuthState();
  if (auth.role !== "owner" || auth.status !== "active") {
    notFound();
  }

  const supabase = await createClient();
  const [profilesResult, rolesResult, invitationsResult] = await Promise.all([
    supabase.from("profiles").select("id, display_name"),
    supabase.from("user_roles").select("user_id, role, status"),
    supabase
      .from("invitations")
      .select("id, email, expires_at, status")
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
  ]);

  const admin = createAdminClient();
  const { data: listedUsers } = await admin.auth.admin.listUsers({ perPage: 200 });
  const emails = new Map(
    (listedUsers?.users ?? []).map((user) => [user.id, user.email ?? null]),
  );
  const profiles = new Map(
    (profilesResult.data ?? []).map((profile) => [profile.id, profile.display_name]),
  );

  const members: MemberRow[] = [];
  for (const role of rolesResult.data ?? []) {
    if (role.role !== "owner" && role.role !== "member") continue;
    if (role.status !== "active" && role.status !== "revoked") continue;

    members.push({
      userId: role.user_id,
      displayName: profiles.get(role.user_id) ?? "Member",
      email: emails.get(role.user_id) ?? null,
      role: role.role,
      status: role.status,
    });
  }
  members.sort((left, right) => left.displayName.localeCompare(right.displayName));

  const today = new Date().toISOString().slice(0, 10);
  const invitations: InvitationRow[] = (invitationsResult.data ?? []).map((invitation) => ({
    id: invitation.id,
    email: invitation.email,
    expiresOn: invitation.expires_at.slice(0, 10),
    expired: invitation.expires_at.slice(0, 10) < today,
  }));

  const loadFailed = profilesResult.error || rolesResult.error || invitationsResult.error;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-4 py-8 min-[800px]:px-8">
      <Link href="/profile" className="focus-ring inline-flex w-fit items-center gap-1 text-sm font-medium text-forest">
        <ChevronLeft className="size-4" aria-hidden="true" />
        Profile
      </Link>
      <div className="flex flex-col gap-2">
        <p className="text-[11px] font-semibold tracking-[0.14em] text-terracotta uppercase">Only you can see this</p>
        <h1 className="font-heading text-4xl font-semibold tracking-tight">Group admin</h1>
        <p className="text-ink-muted">
          Invite someone, pause access, or restore someone who has already joined.
        </p>
      </div>
      {loadFailed ? (
        <p className="rounded-[12px] bg-paper px-4 py-3 text-sm shadow-card">The member list could not be loaded.</p>
      ) : (
        <MembershipPanel members={members} invitations={invitations} />
      )}
    </main>
  );
}

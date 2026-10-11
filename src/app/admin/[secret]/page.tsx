import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
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

  const invitations: InvitationRow[] = (invitationsResult.data ?? []).map((invitation) => ({
    id: invitation.id,
    email: invitation.email,
    expiresOn: invitation.expires_at.slice(0, 10),
  }));

  const loadFailed = profilesResult.error || rolesResult.error || invitationsResult.error;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-16">
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">Owner</p>
        <h1 className="font-heading text-4xl font-semibold tracking-tight">Group admin</h1>
        <p className="max-w-xl text-muted-foreground">
          Invite people, pause access, or restore someone who has already joined. Hike tools
          come next.
        </p>
      </div>
      {loadFailed ? (
        <p className="rounded-lg border border-border bg-card px-4 py-3 text-sm">
          The member list could not be loaded.
        </p>
      ) : (
        <MembershipPanel members={members} invitations={invitations} />
      )}
      <form action="/auth/sign-out" method="post">
        <Button type="submit" variant="outline">
          Sign out
        </Button>
      </form>
    </main>
  );
}

"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import {
  inviteMember,
  restoreMember,
  revokeInvitation,
  revokeMember,
  type MembershipResult,
} from "@/lib/auth/membership";

export type MemberRow = {
  userId: string;
  displayName: string;
  email: string | null;
  role: "owner" | "member";
  status: "active" | "revoked";
};

export type InvitationRow = {
  id: string;
  email: string;
  expiresOn: string;
};

const initialResult: MembershipResult = {};

export function MembershipPanel({
  members,
  invitations,
}: {
  members: MemberRow[];
  invitations: InvitationRow[];
}) {
  return (
    <div className="flex flex-col gap-10">
      <InviteForm />
      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-2xl font-semibold tracking-tight">Members</h2>
        <ul className="flex flex-col gap-3">
          {members.map((member) => (
            <li
              key={member.userId}
              className="flex flex-col gap-3 rounded-lg border border-border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium">{member.displayName}</p>
                <p className="text-sm text-muted-foreground">{memberSummary(member)}</p>
              </div>
              {member.role === "member" ? (
                member.status === "revoked" ? (
                  <AccessForm action={restoreMember} userId={member.userId} label="Restore access" />
                ) : (
                  <AccessForm action={revokeMember} userId={member.userId} label="Remove access" />
                )
              ) : null}
            </li>
          ))}
        </ul>
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-2xl font-semibold tracking-tight">Pending invitations</h2>
        {invitations.length === 0 ? (
          <p className="text-sm text-muted-foreground">No invitations are waiting.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {invitations.map((invitation) => (
              <li
                key={invitation.id}
                className="flex flex-col gap-3 rounded-lg border border-border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium">{invitation.email}</p>
                  <p className="text-sm text-muted-foreground">Pending · expires {invitation.expiresOn}</p>
                </div>
                <InvitationForm invitationId={invitation.id} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function InviteForm() {
  const [state, action, pending] = useActionState(inviteMember, initialResult);

  return (
    <form action={action} className="flex flex-col gap-3">
      <h2 className="font-heading text-2xl font-semibold tracking-tight">Invite someone</h2>
      <label className="flex flex-col gap-2 text-sm font-medium">
        Email
        <input
          type="email"
          name="email"
          autoComplete="email"
          required
          className="h-11 rounded-lg border border-input bg-card px-3 text-base font-normal outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </label>
      <Result state={state} />
      <Button type="submit" className="h-11 w-full sm:w-auto" disabled={pending}>
        {pending ? "Sending…" : "Send invitation"}
      </Button>
    </form>
  );
}

function AccessForm({
  action,
  userId,
  label,
}: {
  action: typeof revokeMember;
  userId: string;
  label: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialResult);

  return (
    <form action={formAction} className="flex flex-col items-start gap-2">
      <input type="hidden" name="userId" value={userId} />
      <Button type="submit" variant="outline" disabled={pending}>
        {label}
      </Button>
      <Result state={state} />
    </form>
  );
}

function InvitationForm({ invitationId }: { invitationId: string }) {
  const [state, action, pending] = useActionState(revokeInvitation, initialResult);

  return (
    <form action={action} className="flex flex-col items-start gap-2">
      <input type="hidden" name="invitationId" value={invitationId} />
      <Button type="submit" variant="outline" disabled={pending}>
        Revoke invitation
      </Button>
      <Result state={state} />
    </form>
  );
}

function memberSummary(member: MemberRow) {
  const role = member.role === "owner" ? "Owner" : "Member";
  const access = member.status === "revoked" ? "Access paused" : "Active";
  return [member.email, role, access].filter(Boolean).join(" · ");
}

function Result({ state }: { state: MembershipResult }) {
  if (state.error) {
    return <p className="text-sm text-destructive">{state.error}</p>;
  }

  if (state.ok) {
    return <p className="text-sm text-muted-foreground">{state.ok}</p>;
  }

  return null;
}

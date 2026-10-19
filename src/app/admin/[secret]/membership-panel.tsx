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
  expired: boolean;
};

const initialResult: MembershipResult = {};

export function MembershipPanel({
  members,
  invitations,
}: {
  members: MemberRow[];
  invitations: InvitationRow[];
}) {
  const waiting = invitations.filter((invitation) => !invitation.expired);
  const expired = invitations.filter((invitation) => invitation.expired);

  return (
    <div className="flex flex-col gap-10">
      <InviteForm />
      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-2xl font-semibold tracking-tight">Waiting</h2>
        {waiting.length === 0 ? (
          <p className="text-sm text-ink-muted">No invitations are waiting.</p>
        ) : (
          <InvitationList invitations={waiting} />
        )}
      </section>
      {expired.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="font-heading text-2xl font-semibold tracking-tight">Expired</h2>
          <p className="text-sm text-ink-muted">Cancel an expired invite before sending that address again.</p>
          <InvitationList invitations={expired} />
        </section>
      ) : null}
      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-2xl font-semibold tracking-tight">Members</h2>
        <p className="text-sm text-ink-muted">
          Pausing someone signs them out everywhere. Their photos and comments stay on the hikes.
        </p>
        <ul className="flex flex-col gap-3">
          {members.map((member) => (
            <li
              key={member.userId}
              className="flex flex-col gap-3 rounded-[20px] bg-paper px-4 py-4 shadow-card sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium">{member.displayName}</p>
                <p className="text-sm text-ink-muted">{memberSummary(member)}</p>
              </div>
              {member.role === "member" ? (
                member.status === "revoked" ? (
                  <AccessForm action={restoreMember} userId={member.userId} label="Restore access" />
                ) : (
                  <AccessForm action={revokeMember} userId={member.userId} label="Pause access" />
                )
              ) : null}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function InvitationList({ invitations }: { invitations: InvitationRow[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {invitations.map((invitation) => (
        <li
          key={invitation.id}
          className="flex flex-col gap-3 rounded-[20px] bg-paper px-4 py-4 shadow-card sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <p className="font-medium">{invitation.email}</p>
            <p className="text-sm text-ink-muted">
              {invitation.expired ? `Expired ${invitation.expiresOn}` : `Waiting · expires ${invitation.expiresOn}`}
            </p>
          </div>
          <InvitationForm invitationId={invitation.id} />
        </li>
      ))}
    </ul>
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
          className="h-12 rounded-[12px] border border-line bg-paper px-3 text-base font-normal outline-none focus-ring"
        />
      </label>
      <Result state={state} />
      <Button type="submit" className="h-12 w-full rounded-full sm:w-auto" disabled={pending}>
        {pending ? "Sending…" : "Send invite"}
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
      <Button type="submit" variant="outline" className="h-11" disabled={pending}>
        Cancel invite
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

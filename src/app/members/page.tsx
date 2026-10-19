import { ProfileAvatar } from "@/components/profile-avatar";
import { requireActiveMember } from "@/lib/auth/access";
import { countLabel } from "@/lib/hikes/format";
import { loadMemberDirectory } from "@/lib/hikes/queries";

export const metadata = {
  title: "Members · Trailbook",
};

export default async function MembersPage() {
  await requireActiveMember();
  const directory = await loadMemberDirectory();
  const since = directory.sinceYear ? ` since ${directory.sinceYear}` : "";
  const eyebrow = `${directory.members.length} of us, ${countLabel(directory.hikeCount, "hike")}${since}`;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="text-[11px] font-semibold tracking-[0.14em] text-terracotta uppercase">{eyebrow}</p>
        <h1 className="font-heading text-[32px] leading-9 font-semibold tracking-tight">Members</h1>
        <p className="text-ink-muted">
          Only members can see each other. Nobody outside the group can find these pages.
        </p>
      </div>
      <ul className="flex flex-col gap-3">
        {directory.members.map((member) => (
          <li key={member.id} className="flex items-center gap-3 rounded-[20px] bg-paper p-4 shadow-card">
            <ProfileAvatar
              name={member.displayName}
              userId={member.id}
              avatarUrl={member.avatarUrl}
              size="md"
            />
            <div>
              <p className="font-medium">{member.displayName}</p>
              <p className="text-sm text-ink-muted">
                {countLabel(member.hikeCount, "hike")} · {countLabel(member.photoCount, "photo")}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

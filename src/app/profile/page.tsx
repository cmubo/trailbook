import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { HikeCard } from "@/components/hike-card";
import { ProfileAvatar } from "@/components/profile-avatar";
import { ProfileForm } from "@/components/profile-form";
import { requireActiveMember } from "@/lib/auth/access";
import { ownerAdminPath } from "@/lib/auth/owner-route";
import { countLabel } from "@/lib/hikes/format";
import { loadJournal, loadMemberDirectory } from "@/lib/hikes/queries";
import { loadOwnProfile } from "@/lib/profile/queries";

export const metadata = {
  title: "Profile · Trailbook",
};

export default async function ProfilePage() {
  const auth = await requireActiveMember();
  const [profile, directory, journal] = await Promise.all([
    loadOwnProfile(auth.userId),
    loadMemberDirectory(),
    loadJournal(),
  ]);
  const stats = directory.members.find((member) => member.id === auth.userId);
  const hikes = journal.hikes.filter((hike) => hike.participants.some((person) => person.id === auth.userId));
  const preview = hikes.slice(0, 4);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
      <header className="flex flex-col items-center gap-4 text-center">
        <ProfileAvatar
          name={profile.displayName}
          userId={auth.userId}
          avatarUrl={profile.avatarUrl}
          size="lg"
        />
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-4xl font-semibold tracking-tight">{profile.displayName}</h1>
          <p className="text-sm text-ink-muted">
            {countLabel(stats?.hikeCount ?? hikes.length, "hike")} · {countLabel(stats?.photoCount ?? 0, "photo")}
          </p>
        </div>
      </header>
      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-heading text-xl font-semibold">Your hikes</h2>
          {hikes.length > preview.length ? (
            <Link href={`/hikes?member=${auth.userId}`} className="focus-ring text-sm font-medium text-forest">
              See all
            </Link>
          ) : null}
        </div>
        {preview.length === 0 ? (
          <p className="text-sm text-ink-muted">You have not been on a hike yet.</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {preview.map((hike) => (
              <li key={hike.id}>
                <HikeCard hike={hike} layout="wide" />
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="flex flex-col gap-4">
        <h2 className="font-heading text-xl font-semibold">Edit profile</h2>
        <ProfileForm
          key={profile.displayName}
          userId={auth.userId}
          displayName={profile.displayName}
          avatarUrl={profile.avatarUrl}
        />
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-xl font-semibold">Account</h2>
        <p className="rounded-[20px] bg-paper px-4 py-4 text-sm shadow-card">
          Signed in as {auth.email ?? "this phone"}
        </p>
        {auth.role === "owner" ? (
          <Link
            href={ownerAdminPath()}
            className="focus-ring flex items-center justify-between rounded-[20px] bg-paper px-4 py-4 shadow-card"
          >
            <span>
              <span className="block font-medium">Group admin</span>
              <span className="block text-sm text-ink-muted">Invites, members and access</span>
            </span>
            <ChevronRight className="size-5 text-ink-faint" aria-hidden="true" />
          </Link>
        ) : null}
        <form action="/auth/sign-out" method="post">
          <button
            type="submit"
            className="focus-ring h-12 w-full rounded-full border border-line bg-paper text-sm font-medium"
          >
            Sign out of this phone
          </button>
        </form>
      </section>
    </div>
  );
}

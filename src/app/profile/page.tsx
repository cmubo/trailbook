import { JournalHeader } from "@/components/journal-header";
import { ProfileForm } from "@/components/profile-form";
import { requireActiveMember } from "@/lib/auth/access";
import { loadOwnProfile } from "@/lib/profile/queries";

export const metadata = {
  title: "Profile · Trailbook",
};

export default async function ProfilePage() {
  const auth = await requireActiveMember();
  const profile = await loadOwnProfile(auth.userId);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-8">
      <JournalHeader isOwner={auth.role === "owner"} />
      <div className="flex flex-col gap-3">
        <h1 className="font-heading text-4xl font-semibold tracking-tight">Profile</h1>
        <p className="text-muted-foreground">Your name is shown on hikes, comments, and photos.</p>
      </div>
      <ProfileForm
        key={profile.displayName}
        userId={auth.userId}
        displayName={profile.displayName}
        avatarUrl={profile.avatarUrl}
      />
    </main>
  );
}

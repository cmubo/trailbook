import { JournalNav } from "@/components/journal-nav";
import { requireActiveMember } from "@/lib/auth/access";
import { loadOwnProfile } from "@/lib/profile/queries";

export async function JournalFrame({ children }: { children: React.ReactNode }) {
  const auth = await requireActiveMember();
  const profile = await loadOwnProfile(auth.userId);

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <JournalNav
        isOwner={auth.role === "owner"}
        profile={{
          userId: auth.userId,
          displayName: profile.displayName,
          avatarUrl: profile.avatarUrl,
        }}
      />
      <div className="mx-auto flex w-full max-w-[1120px] flex-1 flex-col px-4 pt-4 pb-28 min-[800px]:px-8 min-[800px]:pt-8 min-[800px]:pb-12">
        {children}
      </div>
    </div>
  );
}

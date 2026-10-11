import { requireActiveMember } from "@/lib/auth/access";
import { JournalHeader } from "@/components/journal-header";

export default async function HikesLayout({ children }: { children: React.ReactNode }) {
  const auth = await requireActiveMember();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-8">
      <JournalHeader isOwner={auth.role === "owner"} />
      {children}
    </main>
  );
}

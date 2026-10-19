import { JournalFrame } from "@/components/journal-frame";

export default function MembersLayout({ children }: { children: React.ReactNode }) {
  return <JournalFrame>{children}</JournalFrame>;
}
import { JournalFrame } from "@/components/journal-frame";

export default function HikesLayout({ children }: { children: React.ReactNode }) {
  return <JournalFrame>{children}</JournalFrame>;
}

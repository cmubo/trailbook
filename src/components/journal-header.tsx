import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";

export function JournalHeader({ isOwner }: { isOwner: boolean }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4">
      <Link href="/hikes" className="font-heading text-2xl font-semibold tracking-tight">
        Trailbook
      </Link>
      <div className="flex flex-wrap items-center gap-2">
        {isOwner ? (
          <Link href="/hikes/new" className={buttonVariants({ className: "h-11 px-4" })}>
            New hike
          </Link>
        ) : null}
        <Link href="/profile" className={buttonVariants({ variant: "outline", className: "h-11 px-4" })}>
          Profile
        </Link>
        <form action="/auth/sign-out" method="post">
          <Button type="submit" variant="outline" className="h-11 px-4">
            Sign out
          </Button>
        </form>
      </div>
    </header>
  );
}

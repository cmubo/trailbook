"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Mountain, User, Users } from "lucide-react";
import { Logo } from "@/components/logo";
import { ProfileAvatar } from "@/components/profile-avatar";

type Profile = {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
};

const items = [
  { href: "/hikes", label: "Hikes", icon: Mountain },
  { href: "/members", label: "Members", icon: Users },
  { href: "/profile", label: "Profile", icon: User },
] as const;

export function JournalNav({ isOwner, profile }: { isOwner: boolean; profile: Profile }) {
  const pathname = usePathname();

  return (
    <>
      <header className="sticky top-0 z-30 hidden border-b border-line bg-cream/95 backdrop-blur min-[800px]:block">
        <div className="mx-auto flex h-16 w-full max-w-[1120px] items-center gap-8 px-8">
          <Link href="/hikes" className="focus-ring rounded-lg">
            <Logo />
          </Link>
          <nav className="flex items-center gap-6" aria-label="Journal">
            {items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`focus-ring rounded-md text-sm ${active ? "font-semibold text-forest" : "text-ink-muted"}`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            {isOwner ? (
              <Link
                href="/hikes/new"
                className="focus-ring inline-flex h-11 items-center rounded-full bg-forest px-4 text-sm font-medium text-paper hover:bg-forest-hover"
              >
                New hike
              </Link>
            ) : null}
            <Link href="/profile" aria-label="Your profile" className="focus-ring rounded-full">
              <ProfileAvatar
                name={profile.displayName}
                userId={profile.userId}
                avatarUrl={profile.avatarUrl}
                size="md"
              />
            </Link>
          </div>
        </div>
      </header>
      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper min-[800px]:hidden"
        aria-label="Journal"
      >
        <ul className="mx-auto grid h-16 max-w-lg grid-cols-3">
          {items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`focus-ring flex h-full flex-col items-center justify-center gap-1 text-xs ${active ? "font-semibold text-forest" : "text-ink-muted"}`}
                >
                  <Icon className="size-5" aria-hidden="true" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}

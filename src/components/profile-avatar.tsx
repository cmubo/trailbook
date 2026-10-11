import { avatarColor, initials } from "@/lib/profile/avatar";

export function ProfileAvatar({
  name,
  userId,
  avatarUrl,
  size = "sm",
}: {
  name: string;
  userId: string;
  avatarUrl: string | null;
  size?: "sm" | "lg";
}) {
  const sizeClass = size === "lg" ? "size-24 text-2xl" : "size-8 text-xs";

  if (avatarUrl) {
    return (
      // Signed URLs expire and point at the private storage host.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={avatarUrl} alt="" className={`${sizeClass} shrink-0 rounded-full object-cover`} />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={`${sizeClass} inline-flex shrink-0 items-center justify-center rounded-full font-medium text-[var(--paper)]`}
      style={{ backgroundColor: avatarColor(userId) }}
    >
      {initials(name)}
    </span>
  );
}

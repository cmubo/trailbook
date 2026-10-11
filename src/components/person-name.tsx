import { ProfileAvatar } from "@/components/profile-avatar";

export function PersonName({
  name,
  userId,
  avatarUrl,
}: {
  name: string;
  userId: string;
  avatarUrl: string | null;
}) {
  return (
    <span className="inline-flex items-center gap-2">
      <ProfileAvatar name={name} userId={userId} avatarUrl={avatarUrl} />
      {name}
    </span>
  );
}

export function PersonName({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  return (
    <span className="inline-flex items-center gap-2">
      {avatarUrl ? (
        // Signed URLs expire and point at the private storage host.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt="" className="size-8 rounded-full object-cover" />
      ) : null}
      {name}
    </span>
  );
}

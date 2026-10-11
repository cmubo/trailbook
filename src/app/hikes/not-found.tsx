import Link from "next/link";

export default function HikeNotFound() {
  return (
    <div className="flex flex-col gap-3">
      <h1 className="font-heading text-4xl font-semibold tracking-tight">Page not found</h1>
      <p className="text-muted-foreground">That page is not available.</p>
      <Link href="/hikes" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
        All hikes
      </Link>
    </div>
  );
}

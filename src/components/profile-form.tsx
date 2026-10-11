"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ProfileAvatar } from "@/components/profile-avatar";
import { Button } from "@/components/ui/button";
import { removeAvatar, saveAvatar, saveDisplayName } from "@/lib/profile/actions";
import { resizeToAvatar } from "@/lib/profile/resize-avatar";
import { createClient } from "@/lib/supabase/client";

const fieldClass =
  "h-11 w-full rounded-lg border border-input bg-background px-3 text-base font-normal outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function ProfileForm({
  userId,
  displayName,
  avatarUrl,
}: {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
}) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(displayName);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function saveName() {
    setPending(true);
    setError(null);
    const result = await saveDisplayName(name);
    if (result?.error) {
      setError(result.error);
      setPending(false);
      return;
    }

    setPending(false);
    router.refresh();
  }

  async function uploadAvatar() {
    const file = fileInput.current?.files?.[0];
    if (!file) {
      setError("Choose a photo.");
      return;
    }

    setPending(true);
    setError(null);

    try {
      const blob = await resizeToAvatar(file);
      const path = `${userId.toLowerCase()}/avatar.webp`;
      const supabase = createClient();
      const { error: uploadError } = await supabase.storage.from("avatars").upload(path, blob, {
        contentType: "image/webp",
        upsert: true,
      });

      if (uploadError) {
        setError("The photo could not be uploaded.");
        setPending(false);
        return;
      }

      const result = await saveAvatar();
      if (result?.error) {
        setError(result.error);
        setPending(false);
        return;
      }

      if (fileInput.current) {
        fileInput.current.value = "";
      }
      setPending(false);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The photo could not be prepared.");
      setPending(false);
    }
  }

  async function clearAvatar() {
    setPending(true);
    setError(null);
    const result = await removeAvatar();
    if (result?.error) {
      setError(result.error);
      setPending(false);
      return;
    }

    setPending(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <ProfileAvatar
          name={name.trim() ? name : displayName}
          userId={userId}
          avatarUrl={avatarUrl}
          size="lg"
        />
        <label className="flex flex-col gap-2 text-sm font-medium">
          Photo
          <input
            ref={fileInput}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="text-sm font-normal"
          />
        </label>
        <p className="text-sm text-muted-foreground">JPEG, PNG, or WebP. It is cropped and resized before upload.</p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" className="h-11 w-fit px-4" disabled={pending} onClick={uploadAvatar}>
            {pending ? "Saving…" : "Save photo"}
          </Button>
          {avatarUrl ? (
            <Button
              type="button"
              variant="outline"
              className="h-11 w-fit px-4"
              disabled={pending}
              onClick={clearAvatar}
            >
              Remove photo
            </Button>
          ) : null}
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-2 text-sm font-medium">
          Name
          <input value={name} onChange={(event) => setName(event.target.value)} className={fieldClass} />
        </label>
        <Button type="button" className="h-11 w-fit px-4" disabled={pending} onClick={saveName}>
          {pending ? "Saving…" : "Save name"}
        </Button>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}

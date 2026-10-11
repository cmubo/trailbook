"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PersonName } from "@/components/person-name";
import { Button } from "@/components/ui/button";
import { deletePhoto, savePhoto, setCover } from "@/lib/hikes/contributions";
import { resizeToJpeg } from "@/lib/hikes/resize-photo";
import { createClient } from "@/lib/supabase/client";

export type PhotoItem = {
  id: string;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  caption: string | null;
  storagePath: string;
  imageUrl: string | null;
};

const fieldClass =
  "h-11 w-full rounded-lg border border-input bg-background px-3 text-base font-normal outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function HikePhotos({
  hikeId,
  currentUserId,
  isOwner,
  coverPath,
  photos,
}: {
  hikeId: string;
  currentUserId: string;
  isOwner: boolean;
  coverPath: string | null;
  photos: PhotoItem[];
}) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [caption, setCaption] = useState("");
  const [pending, setPending] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function uploadPhoto() {
    const file = fileInput.current?.files?.[0];
    if (!file) {
      setError("Choose a photo.");
      return;
    }

    if (caption.trim().length > 300) {
      setError("Keep the caption under 300 characters.");
      return;
    }

    setPending(true);
    setError(null);

    try {
      const blob = await resizeToJpeg(file);
      const photoId = crypto.randomUUID().toLowerCase();
      const path = `${hikeId}/${photoId}.jpg`;
      const supabase = createClient();
      const { error: uploadError } = await supabase.storage.from("hike-photos").upload(path, blob, {
        contentType: "image/jpeg",
        upsert: false,
      });

      if (uploadError) {
        setError("The photo could not be uploaded.");
        setPending(false);
        return;
      }

      const result = await savePhoto(hikeId, photoId, caption);
      if (result?.error) {
        setError(result.error);
        setPending(false);
        return;
      }

      setCaption("");
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

  async function removePhoto(photoId: string) {
    setPending(true);
    setError(null);
    const result = await deletePhoto(hikeId, photoId);
    if (result?.error) {
      setError(result.error);
      setPending(false);
      return;
    }

    setConfirmingId(null);
    setPending(false);
    router.refresh();
  }

  async function chooseCover(storagePath: string | null) {
    setPending(true);
    setError(null);
    const result = await setCover(hikeId, storagePath);
    if (result?.error) {
      setError(result.error);
      setPending(false);
      return;
    }

    setPending(false);
    router.refresh();
  }

  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-heading text-xl font-semibold">Photos</h2>
      {photos.length === 0 ? (
        <p className="text-sm text-muted-foreground">No photos yet.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {photos.map((photo) => {
            const canDelete = isOwner || photo.userId === currentUserId;
            const isCover = coverPath === photo.storagePath;
            return (
              <li key={photo.id} className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
                {photo.imageUrl ? (
                  // Signed URLs expire and point at the private storage host.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photo.imageUrl}
                    alt={photo.caption ?? "Hike photo"}
                    className="h-48 w-full rounded-xl object-cover"
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">This photo was not uploaded.</p>
                )}
                {photo.caption ? <p>{photo.caption}</p> : null}
                <p className="text-sm text-muted-foreground">
                  <PersonName name={photo.displayName} avatarUrl={photo.avatarUrl} />
                </p>
                {isCover ? <p className="text-sm font-medium">Cover photo</p> : null}
                <div className="flex flex-wrap gap-2">
                  {isOwner && photo.imageUrl ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 px-4"
                      disabled={pending}
                      onClick={() => chooseCover(isCover ? null : photo.storagePath)}
                    >
                      {isCover ? "Remove cover" : "Use as cover"}
                    </Button>
                  ) : null}
                  {canDelete && confirmingId === photo.id ? (
                    <>
                      <Button
                        type="button"
                        variant="destructive"
                        className="h-11 px-4"
                        disabled={pending}
                        onClick={() => removePhoto(photo.id)}
                      >
                        Delete this photo
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-11 px-4"
                        disabled={pending}
                        onClick={() => setConfirmingId(null)}
                      >
                        Cancel
                      </Button>
                    </>
                  ) : null}
                  {canDelete && confirmingId !== photo.id ? (
                    <Button
                      type="button"
                      variant="destructive"
                      className="h-11 px-4"
                      disabled={pending}
                      onClick={() => setConfirmingId(photo.id)}
                    >
                      Delete
                    </Button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-2 text-sm font-medium">
          Photo
          <input
            ref={fileInput}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="text-sm font-normal"
          />
        </label>
        <p className="text-sm text-muted-foreground">JPEG, PNG, or WebP. It is resized before upload.</p>
        <label className="flex flex-col gap-2 text-sm font-medium">
          Caption
          <input
            value={caption}
            onChange={(event) => setCaption(event.target.value)}
            className={fieldClass}
          />
        </label>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="button" className="h-11 w-fit px-4" disabled={pending} onClick={uploadPhoto}>
          {pending ? "Saving…" : "Upload photo"}
        </Button>
      </div>
    </section>
  );
}

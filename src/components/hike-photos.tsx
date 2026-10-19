"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { PersonName } from "@/components/person-name";
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

const previewCount = 6;

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
  const dialogRef = useRef<HTMLDivElement>(null);
  const [caption, setCaption] = useState("");
  const [pending, setPending] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [queue, setQueue] = useState<File[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    if (viewerIndex !== null) {
      dialogRef.current?.focus();
    }
  }, [viewerIndex]);

  const visible = expanded ? photos : photos.slice(0, previewCount);
  const viewer = viewerIndex === null ? null : photos[viewerIndex];

  async function uploadQueue(files: File[]) {
    if (files.length === 0) {
      return;
    }

    const firstCaption = files.length === 1 ? caption.trim() : "";
    if (firstCaption.length > 300) {
      setError("Keep the caption under 300 characters.");
      return;
    }

    setPending(true);
    setError(null);

    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      if (!file) {
        continue;
      }
      setProgress(files.length === 1 ? "Uploading…" : `Uploading ${index + 1} of ${files.length}`);
      const uploaded = await uploadOne(file, index === 0 ? firstCaption : "");
      if (!uploaded) {
        setQueue(files.slice(index));
        setPending(false);
        setProgress(null);
        return;
      }
    }

    setQueue(null);
    setCaption("");
    setProgress(null);
    setPending(false);
    if (fileInput.current) {
      fileInput.current.value = "";
    }
    router.refresh();
  }

  async function uploadOne(file: File, text: string) {
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
        setError(`${file.name} could not be uploaded.`);
        return false;
      }

      const result = await savePhoto(hikeId, photoId, text);
      if (result?.error) {
        setError(result.error);
        return false;
      }

      return true;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : `${file.name} could not be prepared.`);
      return false;
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

    setViewerIndex(null);
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
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-heading text-xl font-semibold">Photos</h2>
        {photos.length > previewCount && !expanded ? (
          <button type="button" className="focus-ring text-sm font-medium text-forest" onClick={() => setExpanded(true)}>
            Show all
          </button>
        ) : null}
      </div>
      <ul className="grid grid-cols-2 gap-3 min-[800px]:grid-cols-3">
        {visible.map((photo) => {
          const index = photos.findIndex((item) => item.id === photo.id);
          return (
            <li key={photo.id}>
              <button
                type="button"
                className="focus-ring block aspect-square w-full overflow-hidden rounded-[20px] bg-sage-100"
                onClick={() => {
                  setConfirmingDelete(false);
                  setViewerIndex(index);
                }}
              >
                {photo.imageUrl ? (
                  // Signed URLs expire and point at the private storage host.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photo.imageUrl} alt={photo.caption ?? "Hike photo"} className="size-full object-cover" />
                ) : (
                  <span className="flex size-full items-center justify-center px-3 text-center text-sm text-ink-muted">
                    Photo not uploaded
                  </span>
                )}
              </button>
            </li>
          );
        })}
        <li>
          <button
            type="button"
            disabled={pending}
            className="focus-ring flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-[20px] border border-dashed border-line-strong bg-sage-50 text-forest disabled:opacity-50"
            onClick={() => fileInput.current?.click()}
          >
            <Plus className="size-6" aria-hidden="true" />
            Add
          </button>
        </li>
      </ul>
      <input
        ref={fileInput}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="sr-only"
        onChange={(event) => {
          const files = [...(event.target.files ?? [])];
          if (files.length > 0) {
            void uploadQueue(files);
          }
        }}
      />
      <label className="flex flex-col gap-2 text-sm font-medium">
        Caption for a single photo
        <input
          value={caption}
          onChange={(event) => setCaption(event.target.value)}
          className="h-12 rounded-[12px] border border-line bg-paper px-3 text-base font-normal outline-none focus-ring"
        />
      </label>
      <p className="text-sm text-ink-muted">JPEG, PNG, or WebP. Each photo is resized before upload.</p>
      {progress ? <p className="text-sm text-ink-muted">{progress}</p> : null}
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {queue ? (
        <button
          type="button"
          className="focus-ring h-11 w-fit rounded-full border border-line px-4 text-sm font-medium"
          disabled={pending}
          onClick={() => void uploadQueue(queue)}
        >
          Try that photo again
        </button>
      ) : null}
      {viewer ? (
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label="Photo"
          tabIndex={-1}
          className="fixed inset-0 z-50 flex flex-col bg-[#171815] text-cream outline-none"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setViewerIndex(null);
            }
            if (event.key === "ArrowRight") {
              setViewerIndex((index) => (index === null ? index : (index + 1) % photos.length));
            }
            if (event.key === "ArrowLeft") {
              setViewerIndex((index) =>
                index === null ? index : (index - 1 + photos.length) % photos.length,
              );
            }
          }}
        >
          <div className="flex items-center justify-between px-4 py-3">
            <button type="button" className="focus-ring inline-flex items-center gap-1 rounded-full px-2 py-1" onClick={() => setViewerIndex(null)}>
              <X className="size-5" aria-hidden="true" />
              Close
            </button>
            <p className="text-sm">
              {(viewerIndex ?? 0) + 1} of {photos.length}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                className="focus-ring rounded-full px-2 py-1 text-sm"
                onClick={() =>
                  setViewerIndex((index) =>
                    index === null ? index : (index - 1 + photos.length) % photos.length,
                  )
                }
              >
                Previous
              </button>
              <button
                type="button"
                className="focus-ring rounded-full px-2 py-1 text-sm"
                onClick={() => setViewerIndex((index) => (index === null ? index : (index + 1) % photos.length))}
              >
                Next
              </button>
            </div>
          </div>
          <div className="flex min-h-0 flex-1 items-center justify-center px-4">
            {viewer.imageUrl ? (
              // Signed URLs expire and point at the private storage host.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={viewer.imageUrl}
                alt={viewer.caption ?? "Hike photo"}
                className="max-h-full max-w-full object-contain"
              />
            ) : (
              <p>This photo was not uploaded.</p>
            )}
          </div>
          <div className="flex flex-col gap-3 px-4 py-5">
            {viewer.caption ? <p>{viewer.caption}</p> : null}
            <p className="text-sm">
              <PersonName name={viewer.displayName} userId={viewer.userId} avatarUrl={viewer.avatarUrl} />
            </p>
            {coverPath === viewer.storagePath ? <p className="text-sm">Cover photo</p> : null}
            <div className="flex flex-wrap gap-2">
              {isOwner && viewer.imageUrl ? (
                <button
                  type="button"
                  disabled={pending}
                  className="focus-ring h-11 rounded-full bg-paper px-4 text-sm font-medium text-ink"
                  onClick={() =>
                    void chooseCover(coverPath === viewer.storagePath ? null : viewer.storagePath)
                  }
                >
                  {coverPath === viewer.storagePath ? "Remove cover" : "Use as cover"}
                </button>
              ) : null}
              {isOwner || viewer.userId === currentUserId ? (
                confirmingDelete ? (
                  <>
                    <button
                      type="button"
                      disabled={pending}
                      className="focus-ring h-11 rounded-full bg-danger px-4 text-sm font-medium text-paper"
                      onClick={() => void removePhoto(viewer.id)}
                    >
                      Delete this photo
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      className="focus-ring h-11 rounded-full bg-paper px-4 text-sm font-medium text-ink"
                      onClick={() => setConfirmingDelete(false)}
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    disabled={pending}
                    className="focus-ring h-11 rounded-full bg-danger px-4 text-sm font-medium text-paper"
                    onClick={() => setConfirmingDelete(true)}
                  >
                    Delete photo
                  </button>
                )
              ) : null}
            </div>
            {error ? <p className="text-sm">{error}</p> : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}

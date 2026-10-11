"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PersonName } from "@/components/person-name";
import { Button } from "@/components/ui/button";
import { deleteComment, saveComment } from "@/lib/hikes/contributions";
import { formatHikeDate } from "@/lib/hikes/format";

export type CommentItem = {
  id: string;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  content: string;
  createdAt: string;
};

const fieldClass =
  "min-h-28 w-full rounded-lg border border-input bg-background px-3 py-2 text-base font-normal outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function HikeComments({
  hikeId,
  currentUserId,
  comments,
}: {
  hikeId: string;
  currentUserId: string;
  comments: CommentItem[];
}) {
  const router = useRouter();
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addComment() {
    setPending(true);
    setError(null);
    const result = await saveComment(hikeId, null, draft);
    if (result?.error) {
      setError(result.error);
      setPending(false);
      return;
    }

    setDraft("");
    setPending(false);
    router.refresh();
  }

  async function updateComment(commentId: string) {
    setPending(true);
    setError(null);
    const result = await saveComment(hikeId, commentId, editingText);
    if (result?.error) {
      setError(result.error);
      setPending(false);
      return;
    }

    setEditingId(null);
    setPending(false);
    router.refresh();
  }

  async function removeComment(commentId: string) {
    setPending(true);
    setError(null);
    const result = await deleteComment(hikeId, commentId);
    if (result?.error) {
      setError(result.error);
      setPending(false);
      return;
    }

    setConfirmingId(null);
    setPending(false);
    router.refresh();
  }

  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-heading text-xl font-semibold">Comments</h2>
      {comments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No comments yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {comments.map((comment) => {
            const mine = comment.userId === currentUserId;
            const editing = editingId === comment.id;
            return (
              <li key={comment.id} className="rounded-2xl border border-border bg-card p-4">
                <p className="text-sm font-medium">
                  <PersonName name={comment.displayName} userId={comment.userId} avatarUrl={comment.avatarUrl} />
                </p>
                <p className="text-sm text-muted-foreground">{formatHikeDate(comment.createdAt.slice(0, 10))}</p>
                {editing ? (
                  <textarea
                    value={editingText}
                    onChange={(event) => setEditingText(event.target.value)}
                    className={`${fieldClass} mt-3`}
                  />
                ) : (
                  <p className="mt-3 whitespace-pre-wrap">{comment.content}</p>
                )}
                {mine ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {editing ? (
                      <>
                        <Button
                          type="button"
                          className="h-11 px-4"
                          disabled={pending}
                          onClick={() => updateComment(comment.id)}
                        >
                          Save
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-11 px-4"
                          disabled={pending}
                          onClick={() => setEditingId(null)}
                        >
                          Cancel
                        </Button>
                      </>
                    ) : confirmingId === comment.id ? (
                      <>
                        <Button
                          type="button"
                          variant="destructive"
                          className="h-11 px-4"
                          disabled={pending}
                          onClick={() => removeComment(comment.id)}
                        >
                          Delete this comment
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
                    ) : (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-11 px-4"
                          onClick={() => {
                            setEditingId(comment.id);
                            setEditingText(comment.content);
                            setConfirmingId(null);
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          className="h-11 px-4"
                          onClick={() => {
                            setConfirmingId(comment.id);
                            setEditingId(null);
                          }}
                        >
                          Delete
                        </Button>
                      </>
                    )}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
      <label className="flex flex-col gap-2 text-sm font-medium">
        Add a comment
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          className={fieldClass}
        />
      </label>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="button" className="h-11 w-fit px-4" disabled={pending} onClick={addComment}>
        {pending ? "Saving…" : "Post comment"}
      </Button>
    </section>
  );
}

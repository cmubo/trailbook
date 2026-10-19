"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { PersonName } from "@/components/person-name";
import { ProfileAvatar } from "@/components/profile-avatar";
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
  "min-h-24 w-full rounded-[12px] border border-line bg-paper px-3 py-2 text-base font-normal outline-none focus-ring";

export function HikeComments({
  hikeId,
  currentUserId,
  comments,
  author,
}: {
  hikeId: string;
  currentUserId: string;
  comments: CommentItem[];
  author: { userId: string; displayName: string; avatarUrl: string | null };
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
      {comments.length === 0 ? <p className="text-sm text-ink-muted">No comments yet.</p> : null}
      <ul className="flex flex-col gap-5">
        {comments.map((comment) => {
          const mine = comment.userId === currentUserId;
          const editing = editingId === comment.id;
          return (
            <li key={comment.id} className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-3">
                <PersonName name={comment.displayName} userId={comment.userId} avatarUrl={comment.avatarUrl} />
                <time className="text-sm text-ink-faint" dateTime={comment.createdAt}>
                  {formatHikeDate(comment.createdAt.slice(0, 10))}
                </time>
              </div>
              {editing ? (
                <textarea
                  value={editingText}
                  onChange={(event) => setEditingText(event.target.value)}
                  className={fieldClass}
                />
              ) : (
                <p className="whitespace-pre-wrap leading-7">{comment.content}</p>
              )}
              {mine ? (
                <div className="flex flex-wrap gap-2">
                  {editing ? (
                    <>
                      <TextButton disabled={pending} onClick={() => updateComment(comment.id)}>
                        Save
                      </TextButton>
                      <TextButton disabled={pending} onClick={() => setEditingId(null)}>
                        Cancel
                      </TextButton>
                    </>
                  ) : confirmingId === comment.id ? (
                    <>
                      <TextButton disabled={pending} onClick={() => removeComment(comment.id)} danger>
                        Delete this comment
                      </TextButton>
                      <TextButton disabled={pending} onClick={() => setConfirmingId(null)}>
                        Cancel
                      </TextButton>
                    </>
                  ) : (
                    <>
                      <TextButton
                        onClick={() => {
                          setEditingId(comment.id);
                          setEditingText(comment.content);
                          setConfirmingId(null);
                        }}
                      >
                        Edit
                      </TextButton>
                      <TextButton
                        danger
                        onClick={() => {
                          setConfirmingId(comment.id);
                          setEditingId(null);
                        }}
                      >
                        Delete
                      </TextButton>
                    </>
                  )}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
      <div className="flex items-start gap-3">
        <ProfileAvatar
          name={author.displayName}
          userId={author.userId}
          avatarUrl={author.avatarUrl}
          size="sm"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <label className="flex flex-col gap-2 text-sm font-medium">
            Add a comment
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              className={fieldClass}
            />
          </label>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <button
            type="button"
            className="focus-ring inline-flex h-11 w-fit items-center gap-2 rounded-full bg-forest px-4 text-sm font-medium text-paper hover:bg-forest-hover disabled:opacity-50"
            disabled={pending}
            onClick={addComment}
          >
            <Send className="size-4" aria-hidden="true" />
            {pending ? "Saving…" : "Post comment"}
          </button>
        </div>
      </div>
    </section>
  );
}

function TextButton({
  children,
  onClick,
  disabled,
  danger = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`focus-ring h-10 rounded-full px-3 text-sm font-medium disabled:opacity-50 ${danger ? "text-danger" : "text-forest"}`}
    >
      {children}
    </button>
  );
}

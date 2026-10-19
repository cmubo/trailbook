"use client";

import { useState, type FormEvent } from "react";
import { Logo } from "@/components/logo";
import { createClient } from "@/lib/supabase/client";
import { parseEmail } from "@/lib/validation/email";

type Notice = "link" | "access" | null;

const fieldClass =
  "h-12 w-full rounded-[12px] border border-line bg-paper px-3 text-base font-normal outline-none focus-ring";

export function LoginForm({ siteUrl, notice }: { siteUrl: string; notice: Notice }) {
  const [email, setEmail] = useState("");
  const [phase, setPhase] = useState<"request" | "sent">("request");
  const [showExpired, setShowExpired] = useState(notice === "link");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    const address = parseEmail(email);
    if (!address) {
      setMessage("Enter a valid email address.");
      return;
    }

    setPending(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: address,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: `${siteUrl}/auth/callback`,
      },
    });
    setPending(false);

    if (error) {
      setMessage(messageForOtpError(error.code, error.message));
      return;
    }

    setShowExpired(false);
    setPhase("sent");
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-8 px-6 py-16">
      <Logo />
      {phase === "sent" ? (
        <div className="flex flex-col gap-4">
          <h1 className="font-heading text-4xl font-semibold tracking-tight">Check your email</h1>
          <p className="text-lg leading-7 text-ink-muted">
            A sign-in link is on its way to <span className="font-medium text-ink">{email}</span>. Open it on this
            phone and you&apos;re in.
          </p>
          <p className="text-sm leading-6 text-ink-muted">
            The link works once and lasts an hour. Nothing yet? Have a look in spam.
            {isLocalSite(siteUrl) ? " On this computer it arrives in Mailpit, not a real inbox." : ""}
          </p>
          {isLocalSite(siteUrl) ? (
            <a className="focus-ring w-fit text-sm font-medium text-forest" href="http://127.0.0.1:54324">
              Open Mailpit
            </a>
          ) : null}
          <button
            type="button"
            className="focus-ring h-12 w-full rounded-full border border-line bg-paper text-sm font-medium"
            onClick={() => {
              setPhase("request");
              setMessage(null);
            }}
          >
            Use a different email
          </button>
        </div>
      ) : showExpired ? (
        <div className="flex flex-col gap-4">
          <h1 className="font-heading text-4xl font-semibold tracking-tight">That link has had its day</h1>
          <p className="text-lg leading-7 text-ink-muted">
            Sign-in links work once and only for an hour. We&apos;ll send you a fresh one.
          </p>
          <p className="text-sm leading-6 text-ink-muted">
            It&apos;s been a while since you visited, so we&apos;ve signed you out to keep the group&apos;s photos safe.
          </p>
          <EmailForm
            email={email}
            setEmail={setEmail}
            message={message}
            pending={pending}
            onSubmit={onSubmit}
            buttonLabel="Send me a new link"
          />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <p className="text-[11px] font-semibold tracking-[0.14em] text-terracotta uppercase">Our hiking journal</p>
            <h1 className="font-heading text-4xl font-semibold tracking-tight">Sign in</h1>
          </div>
          <p className="text-lg leading-7 text-ink-muted">
            Trailbook is private to our little group. Pop in your email and we&apos;ll send you a link to sign in. No
            password to remember.
          </p>
          {notice === "access" ? (
            <p className="rounded-[12px] bg-danger-soft px-4 py-3 text-sm text-ink">
              Your access to the group has ended. Ask the organiser if you need it back.
            </p>
          ) : null}
          <EmailForm
            email={email}
            setEmail={setEmail}
            message={message}
            pending={pending}
            onSubmit={onSubmit}
            buttonLabel="Send me a sign-in link"
          />
          <p className="text-sm leading-6 text-ink-muted">
            New here? You&apos;ll need an invite from Callum first. Once you&apos;re in, you stay signed in on this
            phone.
          </p>
        </div>
      )}
    </main>
  );
}

function EmailForm({
  email,
  setEmail,
  message,
  pending,
  onSubmit,
  buttonLabel,
}: {
  email: string;
  setEmail: (value: string) => void;
  message: string | null;
  pending: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  buttonLabel: string;
}) {
  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit}>
      <label className="flex flex-col gap-2 text-sm font-medium">
        Email
        <input
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={fieldClass}
        />
      </label>
      {message ? <p className="text-sm text-danger">{message}</p> : null}
      <button
        type="submit"
        className="focus-ring h-12 w-full rounded-full bg-forest text-sm font-medium text-paper hover:bg-forest-hover disabled:opacity-50"
        disabled={pending}
      >
        {pending ? "Sending…" : buttonLabel}
      </button>
    </form>
  );
}

function isLocalSite(siteUrl: string) {
  try {
    const host = new URL(siteUrl).hostname;
    return host === "localhost" || host === "127.0.0.1";
  } catch {
    return false;
  }
}

function messageForOtpError(code: string | undefined, message: string) {
  const normalised = `${code ?? ""} ${message}`.toLowerCase();
  if (
    normalised.includes("user_not_found") ||
    normalised.includes("user not found") ||
    normalised.includes("otp_disabled") ||
    normalised.includes("signup") ||
    normalised.includes("not allowed")
  ) {
    return "That email is not in the group. An invitation is required.";
  }

  if (normalised.includes("rate")) {
    return "Wait a moment, then request another link.";
  }

  return "The link could not be sent. Try again in a moment.";
}

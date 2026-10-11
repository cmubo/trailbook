"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { parseEmail } from "@/lib/validation/email";

type Notice = "link" | "access" | null;

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
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">Trailbook</p>
        <h1 className="font-heading text-5xl font-semibold tracking-tight">
          {phase === "sent" ? "Check your email" : "Sign in"}
        </h1>
        <p className="text-lg text-muted-foreground">
          {phase === "sent"
            ? "The link works once and lasts an hour."
            : "This journal is private. Ask the organiser for an invitation, then request a link for that email address."}
        </p>
      </div>

      {notice === "access" ? (
        <p className="rounded-lg border border-border bg-card px-4 py-3 text-sm">
          Your access to the group has ended. Ask the organiser if you need it back.
        </p>
      ) : null}

      {showExpired ? (
        <p className="rounded-lg border border-border bg-card px-4 py-3 text-sm">
          That sign-in link is invalid or has expired. Request a new one.
        </p>
      ) : null}

      {phase === "sent" ? (
        <div className="flex flex-col gap-4">
          <p className="rounded-lg border border-border bg-card px-4 py-3 text-sm">
            A sign-in link is on its way to <span className="font-medium text-foreground">{email}</span>.
            {isLocalSite(siteUrl)
              ? " On this computer it arrives in Mailpit, not a real inbox."
              : " Open it on this device."}
          </p>
          {isLocalSite(siteUrl) ? (
            <a
              className="text-sm font-medium text-primary underline-offset-4 hover:underline"
              href="http://127.0.0.1:54324"
            >
              Open Mailpit
            </a>
          ) : null}
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full"
            onClick={() => {
              setPhase("request");
              setMessage(null);
            }}
          >
            Use a different email
          </Button>
        </div>
      ) : (
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
              className="h-11 rounded-lg border border-input bg-card px-3 text-base font-normal outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </label>
          {message ? <p className="text-sm text-destructive">{message}</p> : null}
          <Button type="submit" className="h-11 w-full" disabled={pending}>
            {pending ? "Sending…" : "Email me a link"}
          </Button>
        </form>
      )}
    </main>
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

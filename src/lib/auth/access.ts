import "server-only";

import { notFound, redirect } from "next/navigation";
import { getAuthState, type AuthState } from "@/lib/auth/session";

export async function requireActiveMember(): Promise<AuthState & { userId: string; role: "owner" | "member" }> {
  const auth = await getAuthState();

  if (!auth.userId) {
    redirect("/login");
  }

  if (auth.status !== "active" || !auth.role) {
    redirect("/auth/sign-out?reason=access");
  }

  return { ...auth, userId: auth.userId, role: auth.role };
}

export async function requireOwnerPage() {
  const auth = await requireActiveMember();
  if (auth.role !== "owner") {
    notFound();
  }

  return auth;
}

export async function requireOwnerAction() {
  const auth = await getAuthState();
  if (auth.role !== "owner" || auth.status !== "active" || !auth.userId) {
    return null;
  }

  return { userId: auth.userId };
}

export async function requireMemberAction() {
  const auth = await getAuthState();
  if (!auth.userId || auth.status !== "active" || !auth.role) {
    return null;
  }

  return { userId: auth.userId, role: auth.role };
}

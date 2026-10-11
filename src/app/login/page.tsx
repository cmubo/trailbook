import { redirect } from "next/navigation";
import { getAuthState } from "@/lib/auth/session";
import { getPublicEnv } from "@/lib/env-public";
import { LoginForm } from "./login-form";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const auth = await getAuthState();

  if (auth.status === "active" && auth.role) {
    redirect("/");
  }

  if (auth.userId) {
    redirect("/auth/sign-out?reason=access");
  }

  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : null;
  const notice = error === "link" || error === "access" ? error : null;

  return <LoginForm siteUrl={getPublicEnv().NEXT_PUBLIC_SITE_URL} notice={notice} />;
}

import { redirect } from "next/navigation";
import { getAuthState } from "@/lib/auth/session";

export default async function Home() {
  const auth = await getAuthState();

  if (!auth.userId) {
    redirect("/login");
  }

  if (auth.status !== "active" || !auth.role) {
    redirect("/auth/sign-out?reason=access");
  }

  redirect("/hikes");
}

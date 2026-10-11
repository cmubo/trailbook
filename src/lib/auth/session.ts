import { createClient } from "@/lib/supabase/server";

export type AuthState = {
  userId: string | null;
  email: string | null;
  role: "owner" | "member" | null;
  status: "active" | "revoked" | null;
};

export async function getAuthState(): Promise<AuthState> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = error ? null : (data?.claims.sub ?? null);

  if (!userId) {
    return { userId: null, email: null, role: null, status: null };
  }

  const emailClaim = data?.claims.email;
  const email = typeof emailClaim === "string" ? emailClaim : null;

  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role, status")
    .eq("user_id", userId)
    .maybeSingle();

  const role = roleRow?.role === "owner" || roleRow?.role === "member" ? roleRow.role : null;
  const status =
    roleRow?.status === "active" || roleRow?.status === "revoked" ? roleRow.status : null;

  return { userId, email, role, status };
}

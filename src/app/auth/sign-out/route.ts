import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function signOut(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  const incoming = new URL(request.url);
  const destination = new URL("/login", incoming.origin);
  if (incoming.searchParams.get("reason") === "access") {
    destination.searchParams.set("error", "access");
  }

  return NextResponse.redirect(destination, { status: 303 });
}

export function GET(request: Request) {
  return signOut(request);
}

export function POST(request: Request) {
  return signOut(request);
}

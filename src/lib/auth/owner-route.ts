import { timingSafeEqual } from "node:crypto";
import { getEnv } from "@/lib/env";

export function ownerAdminPath() {
  return `/admin/${getEnv().OWNER_ROUTE_SECRET}`;
}

export function isOwnerRoute(secret: string) {
  const configured = getEnv().OWNER_ROUTE_SECRET;
  const left = Buffer.from(secret);
  const right = Buffer.from(configured);

  if (left.length !== right.length) {
    return false;
  }

  return timingSafeEqual(left, right);
}

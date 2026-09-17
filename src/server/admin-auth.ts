import { timingSafeEqual } from "node:crypto";
import { DomainError } from "../domain";

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

export function requireAdmin(
  request: Request,
  configuredSecret = process.env.PARTYMAKER_ADMIN_SECRET,
): void {
  if (!configuredSecret) {
    return;
  }

  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const suppliedSecret =
    request.headers.get("x-partymaker-admin-secret") ?? bearer ?? "";
  if (!safeEqual(configuredSecret, suppliedSecret)) {
    throw new DomainError("admin-unauthorized", "Admin access is required.", 401);
  }
}

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

export const ADMIN_USERNAME = "admin";
export const ADMIN_AUTH_CHALLENGE =
  'Basic realm="PartyMaker Admin", charset="UTF-8"';

function decodeBasicCredentials(
  authorization: string | null,
): { username: string; password: string } | null {
  const encoded = authorization?.match(/^Basic\s+(.+)$/i)?.[1];
  if (!encoded) return null;

  try {
    const decoded = Buffer.from(encoded, "base64").toString("utf8");
    const separator = decoded.indexOf(":");
    if (separator < 0) return null;
    return {
      username: decoded.slice(0, separator),
      password: decoded.slice(separator + 1),
    };
  } catch {
    return null;
  }
}

export function isAdminAuthorized(
  request: Request,
  configuredSecret = process.env.PARTYMAKER_ADMIN_SECRET,
): boolean {
  if (!configuredSecret) return true;

  const authorization = request.headers.get("authorization");
  const basic = decodeBasicCredentials(authorization);
  if (
    basic &&
    safeEqual(ADMIN_USERNAME, basic.username) &&
    safeEqual(configuredSecret, basic.password)
  ) {
    return true;
  }

  const bearer = authorization?.replace(/^Bearer\s+/i, "");
  const suppliedSecret =
    request.headers.get("x-partymaker-admin-secret") ?? bearer ?? "";
  return safeEqual(configuredSecret, suppliedSecret);
}

export function requireAdmin(
  request: Request,
  configuredSecret = process.env.PARTYMAKER_ADMIN_SECRET,
): void {
  if (!isAdminAuthorized(request, configuredSecret)) {
    throw new DomainError("admin-unauthorized", "Admin access is required.", 401);
  }
}

export function adminUnauthorizedResponse(): Response {
  return new Response("Admin access is required.", {
    status: 401,
    headers: {
      "Cache-Control": "no-store, max-age=0",
      "WWW-Authenticate": ADMIN_AUTH_CHALLENGE,
    },
  });
}

import { describe, expect, it } from "vitest";

import { DomainError } from "../domain";
import {
  ADMIN_AUTH_CHALLENGE,
  adminUnauthorizedResponse,
  isAdminAuthorized,
  requireAdmin,
} from "./admin-auth";
import { errorResponse } from "./http";

const SECRET = "party:password";

function requestWithAuthorization(authorization?: string) {
  return new Request("https://partymaker.test/admin", {
    headers: authorization ? { authorization } : undefined,
  });
}

function basic(username: string, password: string) {
  return `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
}

describe("PartyMaker admin authentication", () => {
  it("leaves the local demo open when no secret is configured", () => {
    expect(isAdminAuthorized(requestWithAuthorization(), "")).toBe(true);
  });

  it("accepts the fixed admin username and configured password", () => {
    const request = requestWithAuthorization(basic("admin", SECRET));

    expect(isAdminAuthorized(request, SECRET)).toBe(true);
    expect(() => requireAdmin(request, SECRET)).not.toThrow();
  });

  it("rejects a wrong username or password", () => {
    expect(
      isAdminAuthorized(requestWithAuthorization(basic("mc", SECRET)), SECRET),
    ).toBe(false);
    expect(
      isAdminAuthorized(requestWithAuthorization(basic("admin", "wrong")), SECRET),
    ).toBe(false);
    expect(() => requireAdmin(requestWithAuthorization(), SECRET)).toThrowError(
      DomainError,
    );
  });

  it("keeps bearer and explicit secret headers compatible", () => {
    expect(
      isAdminAuthorized(
        requestWithAuthorization(`Bearer ${SECRET}`),
        SECRET,
      ),
    ).toBe(true);
    expect(
      isAdminAuthorized(
        new Request("https://partymaker.test/admin", {
          headers: { "x-partymaker-admin-secret": SECRET },
        }),
        SECRET,
      ),
    ).toBe(true);
  });

  it("returns a Basic challenge for page and API authentication failures", async () => {
    const pageResponse = adminUnauthorizedResponse();
    const apiResponse = errorResponse(
      new DomainError("admin-unauthorized", "Admin access is required.", 401),
    );

    expect(pageResponse.status).toBe(401);
    expect(pageResponse.headers.get("www-authenticate")).toBe(
      ADMIN_AUTH_CHALLENGE,
    );
    expect(apiResponse.status).toBe(401);
    expect(apiResponse.headers.get("www-authenticate")).toBe(
      ADMIN_AUTH_CHALLENGE,
    );
    await expect(apiResponse.json()).resolves.toMatchObject({
      error: { code: "admin-unauthorized" },
    });
  });
});

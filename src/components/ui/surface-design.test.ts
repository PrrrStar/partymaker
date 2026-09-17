import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("PartyMaker role-aware surface design", () => {
  const css = source("src/app/globals.css");
  const guest = source("src/features/guest/guest-app.tsx");
  const admin = source("src/features/admin/admin-app.tsx");
  const screen = source("src/features/screen/screen-app.tsx");

  it("defines distinct Guest and Admin surface systems", () => {
    expect(css).toContain(".pm-guest-shell");
    expect(css).toContain(".pm-admin-shell");
    expect(css).toContain("--pm-wedding-champagne: #f2d492");
    expect(guest).toContain("pm-guest-shell");
    expect(admin).toContain("pm-admin-shell");
  });

  it("keeps WebGL on the Main Screen only", () => {
    expect(screen).toContain('import("@/components/scene/party-scene")');
    expect(guest).not.toContain("party-scene");
    expect(guest).not.toContain("@react-three");
    expect(admin).not.toContain("party-scene");
    expect(admin).not.toContain("@react-three");
  });

  it("uses compact panel radii instead of the previous oversized cards", () => {
    expect(css).toContain("--pm-radius-lg: 0.875rem");
    expect(guest).not.toContain("rounded-[1.75rem]");
    expect(admin).not.toContain("rounded-2xl");
  });
});

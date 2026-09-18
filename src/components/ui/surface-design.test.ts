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
    expect(css).toContain("--pm-brand-black: #050505");
    expect(css).toContain("--pm-brand-orange: #f54b1e");
    expect(css).toContain("--pm-brand-white: #ffffff");
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

  it("wires recovery and content CRUD controls to authoritative commands", () => {
    const manager = source("src/features/admin/content-manager.tsx");
    expect(admin).toContain('data-testid="admin-reopen"');
    expect(admin).toContain('type: "interaction.reopen"');
    expect(admin).toContain('data-testid="admin-reset-interaction"');
    expect(admin).toContain('type: "interaction.reset"');
    expect(admin).toContain('data-testid="admin-content-manager"');
    expect(manager).toContain('type: "content.create"');
    expect(manager).toContain('type: "content.update"');
    expect(manager).toContain('type: "content.delete"');
  });

  it("uses compact panel radii instead of the previous oversized cards", () => {
    expect(css).toContain("--pm-radius-lg: 0.875rem");
    expect(guest).not.toContain("rounded-[1.75rem]");
    expect(admin).not.toContain("rounded-2xl");
  });

  it("uses only the black, orange, and white visible brand palette", () => {
    const uiSource = [
      css,
      guest,
      admin,
      screen,
      source("src/features/admin/content-manager.tsx"),
      source("src/features/screen/join-qr.tsx"),
      source("src/components/live/result-bars.tsx"),
    ].join("\n");

    for (const legacyColor of ["#d7ff3f", "#ff5d73", "#7c5cff", "#45d7ff", "#b9a9ff"]) {
      expect(uiSource.toLowerCase()).not.toContain(legacyColor);
    }
    expect(css).toContain("--pm-lime: var(--pm-brand-orange)");
    expect(css).toContain("--pm-coral: var(--pm-brand-orange)");
    expect(css).toContain("--pm-violet: var(--pm-brand-orange)");
    expect(css).toContain("--pm-cyan: var(--pm-brand-orange)");
  });

  it("keeps Admin content forms and modal keyboard accessible", () => {
    const manager = source("src/features/admin/content-manager.tsx");
    expect(manager).toContain('aria-modal="true"');
    expect(manager).toContain('aria-describedby="content-manager-description"');
    expect(manager).toContain('event.key === "Escape"');
    expect(manager).toContain('name="cueTitle"');
    expect(manager).toContain('name="prompt"');
    expect(manager).toContain('autoComplete="off"');
  });

  it("wires modular games and the direct-control lobby across role boundaries", () => {
    const moduleManager = source("src/features/admin/module-manager.tsx");
    const joystick = source("src/features/guest/lobby-joystick.tsx");
    const scene = source("src/components/scene/party-scene.tsx");
    const worker = source("src/cloudflare/worker.ts");
    expect(admin).toContain('data-testid="admin-module-manager"');
    expect(moduleManager).toContain('type: "module.create"');
    expect(moduleManager).toContain('type: "module.delete"');
    expect(moduleManager).toContain('type: "module.timer.start"');
    expect(joystick).toContain("onPointerMove");
    expect(joystick).toContain("ArrowUp");
    expect(guest).toContain('name="yearsKnownText"');
    expect(guest).toContain('name="companionGroup"');
    expect(guest).not.toContain("대기방 캐릭터");
    expect(guest).not.toContain("내 테이블");
    expect(scene).toContain("LobbyCrowd");
    expect(scene).toContain("LobbyWorld");
    expect(scene).toContain("<Html center");
    expect(scene).not.toContain("AdaptiveDpr");
    const durableObject = source("src/cloudflare/party-event-do.ts");
    expect(durableObject).toContain("신랑 김성민");
    expect(durableObject).toContain("신부 김훈정");
    expect(screen).toContain("김성민 & 김훈정의 파티");
    expect(screen).toContain("sceneReady");
    expect(screen).toContain("pm-screen-scene pm-scene-fallback");
    const liveViewHook = source("src/client/use-live-event-view.ts");
    expect(liveViewHook).toContain("refreshAgainRef");
    expect(liveViewHook).not.toContain("if (connected) void refresh()");
    expect(worker).toContain("view|commands|stream|lobby");
  });
});

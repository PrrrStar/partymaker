import { describe, expect, it } from "vitest";

import {
  deterministicLobbyPosition,
  LOBBY_BOUNDS,
  moveLobbyAvatar,
  parseLobbyMessage,
  type LobbyAvatar,
} from "./protocol";

function avatar(overrides: Partial<LobbyAvatar> = {}): LobbyAvatar {
  return {
    guestId: "guest-test",
    displayName: "테스트",
    tableId: "table-a",
    color: "#f54b1e",
    style: "round",
    x: 0,
    z: 0,
    heading: 0,
    ready: false,
    connected: true,
    updatedAt: 1_000,
    ...overrides,
  };
}

describe("PartyMaker lobby protocol", () => {
  it("creates deterministic in-bounds spawn positions", () => {
    expect(deterministicLobbyPosition("guest-a")).toEqual(
      deterministicLobbyPosition("guest-a"),
    );
    const position = deterministicLobbyPosition("guest-b");
    expect(position.x).toBeGreaterThanOrEqual(LOBBY_BOUNDS.minX);
    expect(position.x).toBeLessThanOrEqual(LOBBY_BOUNDS.maxX);
    expect(position.z).toBeGreaterThanOrEqual(LOBBY_BOUNDS.minZ);
    expect(position.z).toBeLessThanOrEqual(LOBBY_BOUNDS.maxZ);
  });

  it("normalizes joystick input and clamps server-authoritative movement", () => {
    const moved = moveLobbyAvatar(avatar({ x: 5.9, z: 3.7 }), { x: 20, z: 20 }, 1_200);
    expect(moved.x).toBeLessThanOrEqual(LOBBY_BOUNDS.maxX);
    expect(moved.z).toBeLessThanOrEqual(LOBBY_BOUNDS.maxZ);
    expect(moved.heading).not.toBe(0);
  });

  it("accepts valid messages and rejects malformed movement", () => {
    expect(parseLobbyMessage({ type: "move", x: 2, z: -2, sequence: 4 })).toEqual({
      type: "move",
      x: 1,
      z: -1,
      sequence: 4,
    });
    expect(parseLobbyMessage({ type: "move", x: "fast", z: 0, sequence: 5 })).toBeNull();
    expect(parseLobbyMessage({ type: "emote", emote: "heart" })).toEqual({
      type: "emote",
      emote: "heart",
    });
    expect(parseLobbyMessage({ type: "emote", emote: "explode" })).toBeNull();
  });
});

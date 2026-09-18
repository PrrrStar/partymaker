export type LobbyAvatarStyle = "round" | "tall" | "star";
export type LobbyEmote = "hello" | "clap" | "heart";

export interface LobbyAvatar {
  guestId: string;
  displayName: string;
  tableId: string;
  color: string;
  style: LobbyAvatarStyle;
  x: number;
  z: number;
  heading: number;
  ready: boolean;
  connected: boolean;
  emote?: LobbyEmote;
  emoteAt?: number;
  updatedAt: number;
}

export type LobbyClientMessage =
  | { type: "move"; x: number; z: number; sequence: number }
  | { type: "emote"; emote: LobbyEmote }
  | { type: "ready"; ready: boolean }
  | { type: "request-snapshot" };

export type LobbyServerMessage =
  | { type: "snapshot"; avatars: LobbyAvatar[]; serverTime: number }
  | { type: "avatar"; avatar: LobbyAvatar; serverTime: number }
  | { type: "error"; message: string };

export const LOBBY_BOUNDS = {
  minX: -6,
  maxX: 6,
  minZ: -3.8,
  maxZ: 3.8,
} as const;

const MAX_SPEED_PER_SECOND = 2.4;

export function deterministicLobbyPosition(guestId: string) {
  let hash = 2166136261;
  for (const character of guestId) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  const normalized = Math.abs(hash >>> 0);
  return {
    x: -4.8 + (normalized % 960) / 100,
    z: -2.8 + (Math.floor(normalized / 997) % 560) / 100,
  };
}

export function moveLobbyAvatar(
  avatar: LobbyAvatar,
  input: { x: number; z: number },
  now: number,
): LobbyAvatar {
  const magnitude = Math.hypot(input.x, input.z);
  const normalizedX = magnitude > 1 ? input.x / magnitude : input.x;
  const normalizedZ = magnitude > 1 ? input.z / magnitude : input.z;
  const elapsedSeconds = Math.min(0.2, Math.max(0.016, (now - avatar.updatedAt) / 1_000));
  const nextX = avatar.x + normalizedX * MAX_SPEED_PER_SECOND * elapsedSeconds;
  const nextZ = avatar.z + normalizedZ * MAX_SPEED_PER_SECOND * elapsedSeconds;
  const moving = Math.abs(normalizedX) + Math.abs(normalizedZ) > 0.02;

  return {
    ...avatar,
    x: Math.max(LOBBY_BOUNDS.minX, Math.min(LOBBY_BOUNDS.maxX, nextX)),
    z: Math.max(LOBBY_BOUNDS.minZ, Math.min(LOBBY_BOUNDS.maxZ, nextZ)),
    heading: moving ? Math.atan2(normalizedX, normalizedZ) : avatar.heading,
    updatedAt: now,
  };
}

export function parseLobbyMessage(value: unknown): LobbyClientMessage | null {
  if (!value || typeof value !== "object" || !("type" in value)) return null;
  const message = value as Record<string, unknown>;
  if (message.type === "move") {
    if (
      typeof message.x !== "number" ||
      typeof message.z !== "number" ||
      typeof message.sequence !== "number" ||
      !Number.isFinite(message.x) ||
      !Number.isFinite(message.z)
    ) return null;
    return {
      type: "move",
      x: Math.max(-1, Math.min(1, message.x)),
      z: Math.max(-1, Math.min(1, message.z)),
      sequence: message.sequence,
    };
  }
  if (message.type === "emote" && ["hello", "clap", "heart"].includes(String(message.emote))) {
    return { type: "emote", emote: message.emote as LobbyEmote };
  }
  if (message.type === "ready" && typeof message.ready === "boolean") {
    return { type: "ready", ready: message.ready };
  }
  if (message.type === "request-snapshot") return { type: "request-snapshot" };
  return null;
}

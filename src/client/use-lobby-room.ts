"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type {
  LobbyAvatar,
  LobbyClientMessage,
  LobbyEmote,
  LobbyServerMessage,
} from "@/lobby/protocol";

export type LobbyConnectionState = "idle" | "connecting" | "live" | "reconnecting";

function lobbySocketUrl(eventId: string, role: "guest" | "screen", guestId?: string | null) {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const url = new URL(`${protocol}//${window.location.host}/api/events/${encodeURIComponent(eventId)}/lobby`);
  url.searchParams.set("role", role);
  if (guestId) url.searchParams.set("guestId", guestId);
  return url.toString();
}

export function useLobbyRoom({
  eventId,
  role,
  guestId,
  enabled = true,
}: {
  eventId: string;
  role: "guest" | "screen";
  guestId?: string | null;
  enabled?: boolean;
}) {
  const [avatars, setAvatars] = useState<LobbyAvatar[]>([]);
  const [status, setStatus] = useState<LobbyConnectionState>(enabled ? "connecting" : "idle");
  const socketRef = useRef<WebSocket | null>(null);
  const sequenceRef = useRef(0);
  const retryRef = useRef(0);

  useEffect(() => {
    if (!enabled || (role === "guest" && !guestId)) {
      return;
    }

    let disposed = false;
    let reconnectTimer: number | undefined;

    const connect = () => {
      if (disposed) return;
      setStatus(retryRef.current === 0 ? "connecting" : "reconnecting");
      const socket = new WebSocket(lobbySocketUrl(eventId, role, guestId));
      socketRef.current = socket;

      socket.addEventListener("open", () => {
        retryRef.current = 0;
        setStatus("live");
        socket.send(JSON.stringify({ type: "request-snapshot" } satisfies LobbyClientMessage));
      });
      socket.addEventListener("message", (event) => {
        if (typeof event.data !== "string") return;
        let message: LobbyServerMessage;
        try {
          message = JSON.parse(event.data) as LobbyServerMessage;
        } catch {
          return;
        }
        if (message.type === "snapshot") {
          setAvatars(message.avatars);
        } else if (message.type === "avatar") {
          setAvatars((current) => {
            const index = current.findIndex((avatar) => avatar.guestId === message.avatar.guestId);
            if (index < 0) return [...current, message.avatar];
            const next = [...current];
            next[index] = message.avatar;
            return next;
          });
        }
      });
      socket.addEventListener("close", () => {
        if (disposed) return;
        setStatus("reconnecting");
        retryRef.current += 1;
        const delay = Math.min(5_000, 600 * 2 ** Math.min(3, retryRef.current));
        reconnectTimer = window.setTimeout(connect, delay);
      });
      socket.addEventListener("error", () => socket.close());
    };

    connect();
    return () => {
      disposed = true;
      if (reconnectTimer !== undefined) window.clearTimeout(reconnectTimer);
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [enabled, eventId, guestId, role]);

  const send = useCallback((message: LobbyClientMessage) => {
    if (socketRef.current?.readyState !== WebSocket.OPEN) return false;
    socketRef.current.send(JSON.stringify(message));
    return true;
  }, []);

  const move = useCallback(
    (x: number, z: number) => {
      sequenceRef.current += 1;
      return send({ type: "move", x, z, sequence: sequenceRef.current });
    },
    [send],
  );
  const emote = useCallback((value: LobbyEmote) => send({ type: "emote", emote: value }), [send]);
  const setReady = useCallback((ready: boolean) => send({ type: "ready", ready }), [send]);

  return {
    avatars,
    status: !enabled || (role === "guest" && !guestId) ? "idle" : status,
    self: guestId ? avatars.find((avatar) => avatar.guestId === guestId) ?? null : null,
    move,
    emote,
    setReady,
  };
}

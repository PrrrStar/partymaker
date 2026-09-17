"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  type EventSurface,
  fetchEventView,
  subscribeToEventVersions,
} from "@/client/event-gateway";

export type LiveConnectionState = "connecting" | "live" | "reconnecting";

type VersionedView = { version: number };

export function useLiveEventView<TView extends VersionedView>({
  eventId,
  surface,
  guestId,
  enabled = true,
}: {
  eventId: string;
  surface: EventSurface;
  guestId?: string | null;
  enabled?: boolean;
}) {
  const [view, setView] = useState<TView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connection, setConnection] =
    useState<LiveConnectionState>("connecting");
  const viewRef = useRef<TView | null>(null);
  const requestRef = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) return;

    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;

    try {
      const nextView = await fetchEventView<TView>({
        eventId,
        surface,
        guestId,
        signal: controller.signal,
      });
      viewRef.current = nextView;
      setView(nextView);
      setError(null);
    } catch (nextError) {
      if (controller.signal.aborted) return;
      setError(
        nextError instanceof Error
          ? nextError.message
          : "라이브 상태를 불러오지 못했습니다.",
      );
    }
  }, [enabled, eventId, guestId, surface]);

  useEffect(() => {
    if (!enabled) {
      requestRef.current?.abort();
      viewRef.current = null;
      return;
    }

    const initialRefresh = window.setTimeout(() => void refresh(), 0);
    const unsubscribe = subscribeToEventVersions({
      eventId,
      onVersion: (version) => {
        if (!viewRef.current || version > viewRef.current.version) {
          void refresh();
        }
      },
      onConnectionChange: (connected) => {
        setConnection(connected ? "live" : "reconnecting");
        if (connected) void refresh();
      },
    });

    return () => {
      window.clearTimeout(initialRefresh);
      requestRef.current?.abort();
      unsubscribe();
    };
  }, [enabled, eventId, refresh]);

  return {
    view: enabled ? view : null,
    error: enabled ? error : null,
    connection: enabled ? connection : "connecting",
    refresh,
  };
}

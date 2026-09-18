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
  const latestNoticeRef = useRef(0);
  const refreshAgainRef = useRef(false);
  const refreshRef = useRef<() => Promise<void>>(async () => undefined);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    if (requestRef.current) {
      refreshAgainRef.current = true;
      return;
    }

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
    } finally {
      if (requestRef.current === controller) requestRef.current = null;
      const shouldRefreshAgain = refreshAgainRef.current;
      refreshAgainRef.current = false;
      if (
        shouldRefreshAgain &&
        latestNoticeRef.current > (viewRef.current?.version ?? 0)
      ) {
        window.setTimeout(() => void refreshRef.current(), 0);
      }
    }
  }, [enabled, eventId, guestId, surface]);
  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  useEffect(() => {
    if (!enabled) {
      requestRef.current?.abort();
      requestRef.current = null;
      refreshAgainRef.current = false;
      viewRef.current = null;
      return;
    }

    const initialRefresh = window.setTimeout(() => void refresh(), 0);
    const unsubscribe = subscribeToEventVersions({
      eventId,
      onVersion: (version) => {
        latestNoticeRef.current = Math.max(latestNoticeRef.current, version);
        if (requestRef.current) {
          refreshAgainRef.current = true;
          return;
        }
        if (!viewRef.current || version > viewRef.current.version) {
          void refresh();
        }
      },
      onConnectionChange: (connected) => {
        setConnection(connected ? "live" : "reconnecting");
      },
    });

    return () => {
      window.clearTimeout(initialRefresh);
      requestRef.current?.abort();
      requestRef.current = null;
      refreshAgainRef.current = false;
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

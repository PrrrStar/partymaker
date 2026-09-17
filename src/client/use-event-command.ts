"use client";

import { useCallback, useRef, useState } from "react";

import {
  createCommandId,
  dispatchEventCommand,
} from "@/client/event-gateway";
import type { CommandReceipt, EventCommand } from "@/domain";

export function useEventCommand(
  eventId: string,
  onApplied?: (receipt: CommandReceipt) => void | Promise<void>,
) {
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pendingRef = useRef(false);

  const run = useCallback(
    async (
      command: EventCommand,
      options?: { expectedVersion?: number; commandId?: string },
    ) => {
      if (pendingRef.current) return null;

      pendingRef.current = true;
      setPending(command.type);
      setError(null);

      try {
        const { receipt } = await dispatchEventCommand<
          EventCommand,
          CommandReceipt
        >({
          eventId,
          request: {
            commandId:
              options?.commandId ?? createCommandId(command.type.replaceAll(".", "-")),
            expectedVersion: options?.expectedVersion,
            command,
          },
        });
        await onApplied?.(receipt);
        return receipt;
      } catch (nextError) {
        setError(
          nextError instanceof Error
            ? nextError.message
            : "요청을 처리하지 못했습니다.",
        );
        return null;
      } finally {
        pendingRef.current = false;
        setPending(null);
      }
    },
    [eventId, onApplied],
  );

  return { run, pending, error, clearError: () => setError(null) };
}

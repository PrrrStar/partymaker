import {
  createDemoEventState,
  DomainError,
  invariant,
  reduceEvent,
  type CommandEnvelope,
  type CommandReceipt,
  type EventState,
} from "../domain";
import type {
  EventStore,
  EventVersionListener,
  EventVersionNotice,
} from "./event-store";

const MAX_COMMAND_RECEIPTS = 2_000;

export class MemoryEventStore implements EventStore {
  private readonly states = new Map<string, EventState>();
  private readonly receipts = new Map<string, CommandReceipt>();
  private readonly listeners = new Map<string, Set<EventVersionListener>>();
  private queue: Promise<void> = Promise.resolve();

  constructor(initialStates: EventState[] = [createDemoEventState()]) {
    for (const state of initialStates) {
      this.states.set(state.event.id, state);
    }
  }

  getState(eventId: string): EventState | null {
    return this.states.get(eventId) ?? null;
  }

  dispatch(eventId: string, envelope: CommandEnvelope): Promise<CommandReceipt> {
    return this.serialized(() => {
      invariant(
        typeof envelope.commandId === "string" &&
          envelope.commandId.trim().length > 0 &&
          envelope.commandId.length <= 120,
        "invalid-command-id",
        "commandId is required and must be 120 characters or fewer.",
      );

      const receiptKey = `${eventId}:${envelope.commandId}`;
      const previousReceipt = this.receipts.get(receiptKey);
      if (previousReceipt) {
        return previousReceipt;
      }

      const state = this.states.get(eventId);
      invariant(state, "event-not-found", `Event ${eventId} does not exist.`, 404);
      if (envelope.expectedVersion !== undefined) {
        invariant(
          Number.isInteger(envelope.expectedVersion) && envelope.expectedVersion >= 0,
          "invalid-version",
          "expectedVersion must be a non-negative integer.",
        );
        if (envelope.expectedVersion !== state.version) {
          throw new DomainError(
            "version-conflict",
            "The event changed before this command was applied.",
            409,
            { expectedVersion: envelope.expectedVersion, currentVersion: state.version },
          );
        }
      }

      const now = new Date().toISOString();
      const outcome = reduceEvent(state, envelope.command, {
        commandId: envelope.commandId,
        now,
      });
      const nextState = outcome.changed
        ? {
            ...outcome.state,
            version: state.version + 1,
            event: { ...outcome.state.event, id: eventId, updatedAt: now },
          }
        : state;
      if (outcome.changed) {
        this.states.set(eventId, nextState);
      }

      const receipt: CommandReceipt = {
        commandId: envelope.commandId,
        eventId,
        status: outcome.changed ? "applied" : "noop",
        version: nextState.version,
        result: outcome.result,
      };
      this.rememberReceipt(receiptKey, receipt);
      if (outcome.changed) {
        this.publish({ eventId, version: nextState.version });
      }
      return receipt;
    });
  }

  subscribe(eventId: string, listener: EventVersionListener): () => void {
    let eventListeners = this.listeners.get(eventId);
    if (!eventListeners) {
      eventListeners = new Set();
      this.listeners.set(eventId, eventListeners);
    }
    eventListeners.add(listener);

    return () => {
      const current = this.listeners.get(eventId);
      current?.delete(listener);
      if (current?.size === 0) {
        this.listeners.delete(eventId);
      }
    };
  }

  private serialized<T>(work: () => T | Promise<T>): Promise<T> {
    const result = this.queue.then(work, work);
    this.queue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  private rememberReceipt(key: string, receipt: CommandReceipt): void {
    this.receipts.set(key, receipt);
    while (this.receipts.size > MAX_COMMAND_RECEIPTS) {
      const oldestKey = this.receipts.keys().next().value as string | undefined;
      if (!oldestKey) break;
      this.receipts.delete(oldestKey);
    }
  }

  private publish(notice: EventVersionNotice): void {
    for (const listener of this.listeners.get(notice.eventId) ?? []) {
      try {
        listener(notice);
      } catch (error) {
        console.error("PartyMaker event listener failed", error);
      }
    }
  }
}

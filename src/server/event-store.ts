import type { CommandEnvelope, CommandReceipt, EventState } from "../domain";

export interface EventVersionNotice {
  eventId: string;
  version: number;
}

export type EventVersionListener = (notice: EventVersionNotice) => void;

export interface EventStore {
  getState(eventId: string): EventState | null;
  dispatch(eventId: string, envelope: CommandEnvelope): Promise<CommandReceipt>;
  subscribe(eventId: string, listener: EventVersionListener): () => void;
}

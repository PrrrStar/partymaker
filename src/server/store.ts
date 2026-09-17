import { MemoryEventStore } from "./memory-event-store";

const globalStore = globalThis as typeof globalThis & {
  __partyMakerEventStore?: MemoryEventStore;
};

export function getEventStore(): MemoryEventStore {
  globalStore.__partyMakerEventStore ??= new MemoryEventStore();
  return globalStore.__partyMakerEventStore;
}

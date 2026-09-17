/// <reference types="@cloudflare/workers-types" />

interface CloudflareEnv {
  ASSETS: Fetcher;
  PARTY_EVENTS: DurableObjectNamespace<
    import("./src/cloudflare/party-event-do").PartyEventDurableObject
  >;
  PARTYMAKER_ADMIN_SECRET?: string;
}

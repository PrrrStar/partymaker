import vinextWorker from "vinext/server/fetch-handler";

export { PartyEventDurableObject } from "./party-event-do";

const eventApiPattern = /^\/api\/events\/([^/]+)\/(view|commands|stream)\/?$/;

export default {
  async fetch(
    request: Request,
    env: CloudflareEnv,
    context: ExecutionContext,
  ): Promise<Response> {
    const match = new URL(request.url).pathname.match(eventApiPattern);
    if (match) {
      const eventId = decodeURIComponent(match[1]);
      const id = env.PARTY_EVENTS.idFromName(eventId);
      return env.PARTY_EVENTS.get(id).fetch(request);
    }

    return vinextWorker.fetch(request, env, context);
  },
} satisfies ExportedHandler<CloudflareEnv>;

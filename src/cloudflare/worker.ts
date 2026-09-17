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
      if (eventId !== "demo") {
        return Response.json(
          { error: { code: "event-not-found", message: `Event ${eventId} does not exist.` } },
          { status: 404 },
        );
      }
      return env.PARTY_EVENTS.getByName(eventId).fetch(request);
    }

    return vinextWorker.fetch(request, env, context);
  },
} satisfies ExportedHandler<CloudflareEnv>;

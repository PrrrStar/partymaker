import vinextWorker from "vinext/server/fetch-handler";

import {
  adminUnauthorizedResponse,
  isAdminAuthorized,
} from "../server/admin-auth";

export { PartyEventDurableObject } from "./party-event-do";

const eventApiPattern = /^\/api\/events\/([^/]+)\/(view|commands|stream)\/?$/;

export default {
  async fetch(
    request: Request,
    env: CloudflareEnv,
    context: ExecutionContext,
  ): Promise<Response> {
    const url = new URL(request.url);
    if (
      (url.pathname === "/admin" || url.pathname.startsWith("/admin/")) &&
      !isAdminAuthorized(request, env.PARTYMAKER_ADMIN_SECRET)
    ) {
      return adminUnauthorizedResponse();
    }

    const match = url.pathname.match(eventApiPattern);
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

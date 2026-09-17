import { DurableObject } from "cloudflare:workers";

import {
  commandGuestId,
  createDemoEventState,
  DomainError,
  invariant,
  isGuestCommand,
  reduceEvent,
  selectView,
  type CommandReceipt,
  type EventState,
} from "../domain";
import { requireAdmin } from "../server/admin-auth";
import { isSurface, parseCommandRequest } from "../server/command-request";
import { errorResponse, NO_STORE_HEADERS } from "../server/http";

const STATE_KEY = "event-state";
const encoder = new TextEncoder();

function receiptKey(commandId: string) {
  return `receipt:${commandId}`;
}

export class PartyEventDurableObject extends DurableObject<CloudflareEnv> {
  private readonly streams = new Set<
    ReadableStreamDefaultController<Uint8Array>
  >();

  private async getState(eventId: string): Promise<EventState | null> {
    const existing = await this.ctx.storage.get<EventState>(STATE_KEY);
    if (existing) return existing;
    if (eventId !== "demo") return null;

    const seeded = createDemoEventState();
    await this.ctx.storage.put(STATE_KEY, seeded);
    return seeded;
  }

  private async dispatch(
    eventId: string,
    body: ReturnType<typeof parseCommandRequest>,
  ): Promise<{ receipt: CommandReceipt; state: EventState; changed: boolean }> {
    invariant(
      body.commandId.trim().length > 0 && body.commandId.length <= 120,
      "invalid-command-id",
      "commandId is required and must be 120 characters or fewer.",
    );

    let result:
      | { receipt: CommandReceipt; state: EventState; changed: boolean }
      | undefined;

    await this.ctx.storage.transaction(async (transaction) => {
      const previousReceipt = await transaction.get<CommandReceipt>(
        receiptKey(body.commandId),
      );
      let state = await transaction.get<EventState>(STATE_KEY);
      if (!state && eventId === "demo") {
        state = createDemoEventState();
      }
      invariant(state, "event-not-found", `Event ${eventId} does not exist.`, 404);

      if (previousReceipt) {
        result = { receipt: previousReceipt, state, changed: false };
        return;
      }

      if (body.expectedVersion !== undefined) {
        if (body.expectedVersion !== state.version) {
          throw new DomainError(
            "version-conflict",
            "The event changed before this command was applied.",
            409,
            {
              expectedVersion: body.expectedVersion,
              currentVersion: state.version,
            },
          );
        }
      }

      const now = new Date().toISOString();
      const outcome = reduceEvent(state, body.command, {
        commandId: body.commandId,
        now,
      });
      const nextState = outcome.changed
        ? {
            ...outcome.state,
            version: state.version + 1,
            event: { ...outcome.state.event, id: eventId, updatedAt: now },
          }
        : state;
      const receipt: CommandReceipt = {
        commandId: body.commandId,
        eventId,
        status: outcome.changed ? "applied" : "noop",
        version: nextState.version,
        result: outcome.result,
      };

      await transaction.put({
        [STATE_KEY]: nextState,
        [receiptKey(body.commandId)]: receipt,
      });
      result = { receipt, state: nextState, changed: outcome.changed };
    });

    invariant(result, "dispatch-failed", "The command could not be applied.", 500);
    return result;
  }

  private publish(eventId: string, version: number) {
    const message = encoder.encode(
      `id: ${version}\nevent: version\ndata: ${JSON.stringify({ eventId, version })}\n\n`,
    );
    for (const controller of this.streams) {
      try {
        controller.enqueue(message);
      } catch {
        this.streams.delete(controller);
      }
    }
  }

  private async handleView(request: Request, eventId: string) {
    const url = new URL(request.url);
    const surface = url.searchParams.get("surface");
    if (!isSurface(surface)) {
      throw new DomainError(
        "invalid-surface",
        "surface must be guest, admin, or screen.",
      );
    }
    if (surface === "admin") {
      requireAdmin(request, this.env.PARTYMAKER_ADMIN_SECRET);
    }

    const state = await this.getState(eventId);
    invariant(state, "event-not-found", `Event ${eventId} does not exist.`, 404);
    const guestId = url.searchParams.get("guestId") ?? undefined;
    return Response.json(
      { view: selectView(state, surface, guestId) },
      { headers: NO_STORE_HEADERS },
    );
  }

  private async handleCommand(request: Request, eventId: string) {
    const body = parseCommandRequest(await request.json());
    const requiresAdmin =
      !isGuestCommand(body.command) || body.view?.surface === "admin";
    if (requiresAdmin) {
      requireAdmin(request, this.env.PARTYMAKER_ADMIN_SECRET);
    }

    const { receipt, state, changed } = await this.dispatch(eventId, body);
    if (changed) {
      this.publish(eventId, state.version);
    }

    const commandGuest = commandGuestId(body.command);
    const requestedView = body.view ?? {
      surface: isGuestCommand(body.command) ? ("guest" as const) : ("admin" as const),
      guestId: commandGuest,
    };
    const guestId = requestedView.guestId ?? commandGuest;
    return Response.json(
      {
        receipt,
        view: selectView(state, requestedView.surface, guestId),
      },
      { headers: NO_STORE_HEADERS },
    );
  }

  private async handleStream(request: Request, eventId: string) {
    const state = await this.getState(eventId);
    invariant(state, "event-not-found", `Event ${eventId} does not exist.`, 404);

    let cleanup = () => undefined;
    const readable = new ReadableStream<Uint8Array>({
      start: (controller) => {
        this.streams.add(controller);
        controller.enqueue(encoder.encode("retry: 1500\n\n"));
        controller.enqueue(
          encoder.encode(
            `id: ${state.version}\nevent: version\ndata: ${JSON.stringify({ eventId, version: state.version })}\n\n`,
          ),
        );
        cleanup = () => {
          this.streams.delete(controller);
          try {
            controller.close();
          } catch {
            // The browser may already have closed the stream.
          }
        };
        request.signal.addEventListener("abort", cleanup, { once: true });
      },
      cancel: () => cleanup(),
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
      },
    });
  }

  async fetch(request: Request): Promise<Response> {
    try {
      const url = new URL(request.url);
      const match = url.pathname.match(
        /^\/api\/events\/([^/]+)\/(view|commands|stream)\/?$/,
      );
      if (!match) {
        return new Response("Not found", { status: 404 });
      }

      const eventId = decodeURIComponent(match[1]);
      const action = match[2];
      if (action === "view" && request.method === "GET") {
        return await this.handleView(request, eventId);
      }
      if (action === "commands" && request.method === "POST") {
        return await this.handleCommand(request, eventId);
      }
      if (action === "stream" && request.method === "GET") {
        return await this.handleStream(request, eventId);
      }
      return new Response("Method not allowed", { status: 405 });
    } catch (error) {
      return errorResponse(error);
    }
  }
}

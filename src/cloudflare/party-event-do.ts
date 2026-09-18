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
import {
  deterministicLobbyPosition,
  moveLobbyAvatar,
  parseLobbyMessage,
  type LobbyAvatar,
  type LobbyServerMessage,
} from "../lobby/protocol";

const STATE_KEY = "event-state";
const LOBBY_KEY = "lobby-state";
const encoder = new TextEncoder();

function coupleLobbyAvatars(now: number): LobbyAvatar[] {
  return [
    {
      guestId: "host-groom",
      displayName: "신랑 김성민",
      tableId: "couple",
      color: "#050505",
      style: "groom",
      x: -0.9,
      z: -2.35,
      heading: 0,
      ready: true,
      connected: true,
      updatedAt: now,
    },
    {
      guestId: "host-bride",
      displayName: "신부 김훈정",
      tableId: "couple",
      color: "#ffffff",
      style: "bride",
      x: 0.9,
      z: -2.35,
      heading: 0,
      ready: true,
      connected: true,
      updatedAt: now,
    },
  ];
}

type LobbyConnection = {
  eventId: string;
  role: "guest" | "screen";
  guestId?: string;
};

function receiptKey(commandId: string) {
  return `receipt:${commandId}`;
}

export class PartyEventDurableObject extends DurableObject<CloudflareEnv> {
  private readonly streams = new Set<
    ReadableStreamDefaultController<Uint8Array>
  >();
  private readonly lobbySockets = new Map<WebSocket, LobbyConnection>();
  private readonly lobbyAvatars = new Map<string, LobbyAvatar>();
  private readonly lobbySequences = new Map<string, number>();
  private readonly lobbyLastMoveAt = new Map<string, number>();
  private lobbyLoaded = false;
  private lobbyLastPersistedAt = 0;
  private lobbyStageOpen = true;

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

  private async ensureLobby(state: EventState) {
    if (this.lobbyLoaded) return;
    const saved = await this.ctx.storage.get<LobbyAvatar[]>(LOBBY_KEY);
    for (const avatar of saved ?? []) {
      this.lobbyAvatars.set(avatar.guestId, { ...avatar, connected: false });
    }
    for (const host of coupleLobbyAvatars(Date.now())) {
      this.lobbyAvatars.set(host.guestId, host);
    }
    for (const guest of Object.values(state.guests)) {
      if (this.lobbyAvatars.has(guest.id)) continue;
      const position = deterministicLobbyPosition(guest.id);
      this.lobbyAvatars.set(guest.id, {
        guestId: guest.id,
        displayName: guest.consentToDisplay ? guest.displayName : "하객",
        tableId: guest.tableId,
        color: state.tables[guest.tableId]?.color ?? "#f54b1e",
        style: guest.avatarStyle ?? "round",
        ...position,
        heading: 0,
        ready: false,
        connected: false,
        updatedAt: Date.now(),
      });
    }
    this.lobbyLoaded = true;
  }

  private lobbyMessage(message: LobbyServerMessage) {
    return JSON.stringify(message);
  }

  private lobbySnapshot() {
    return this.lobbyMessage({
      type: "snapshot",
      avatars: [...this.lobbyAvatars.values()]
        .sort((left, right) => Number(right.guestId.startsWith("host-")) - Number(left.guestId.startsWith("host-")))
        .slice(0, 80),
      serverTime: Date.now(),
    });
  }

  private broadcastLobby(message: LobbyServerMessage) {
    const payload = this.lobbyMessage(message);
    for (const socket of this.lobbySockets.keys()) {
      if (socket.readyState !== 1) continue;
      try {
        socket.send(payload);
      } catch {
        this.lobbySockets.delete(socket);
      }
    }
  }

  private persistLobby(now: number) {
    if (now - this.lobbyLastPersistedAt < 1_000) return;
    this.lobbyLastPersistedAt = now;
    this.ctx.waitUntil(this.ctx.storage.put(LOBBY_KEY, [...this.lobbyAvatars.values()]));
  }

  private async handleLobbySocket(request: Request, eventId: string) {
    invariant(
      request.headers.get("Upgrade")?.toLowerCase() === "websocket",
      "websocket-required",
      "Lobby movement requires a WebSocket upgrade.",
      426,
    );
    const url = new URL(request.url);
    const role = url.searchParams.get("role");
    invariant(role === "guest" || role === "screen", "invalid-lobby-role", "role must be guest or screen.");
    const state = await this.getState(eventId);
    invariant(state, "event-not-found", `Event ${eventId} does not exist.`, 404);
    this.lobbyStageOpen = state.runtime.activeStageId === "stage-check-in";
    const guestId = role === "guest" ? url.searchParams.get("guestId") : undefined;
    if (role === "guest") {
      invariant(guestId && state.guests[guestId], "guest-not-found", "Join the party before entering the lobby.", 404);
    }
    await this.ensureLobby(state);
    if (guestId && !this.lobbyAvatars.has(guestId)) {
      const guest = state.guests[guestId];
      const position = deterministicLobbyPosition(guestId);
      this.lobbyAvatars.set(guestId, {
        guestId,
        displayName: guest.consentToDisplay ? guest.displayName : "하객",
        tableId: guest.tableId,
        color: state.tables[guest.tableId]?.color ?? "#f54b1e",
        style: guest.avatarStyle ?? "round",
        ...position,
        heading: 0,
        ready: false,
        connected: false,
        updatedAt: Date.now(),
      });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair) as [WebSocket, WebSocket];
    server.accept();
    const connection: LobbyConnection = { eventId, role, guestId: guestId ?? undefined };
    if (guestId) {
      for (const [socket, existingConnection] of this.lobbySockets) {
        if (existingConnection.guestId !== guestId) continue;
        this.lobbySockets.delete(socket);
        try {
          socket.close(1000, "새 대기방 연결로 교체되었습니다.");
        } catch {
          // The previous socket may already be closed.
        }
      }
    }
    this.lobbySockets.set(server, connection);

    if (guestId) {
      this.lobbySequences.delete(guestId);
      this.lobbyLastMoveAt.delete(guestId);
      const avatar = this.lobbyAvatars.get(guestId);
      if (avatar) {
        const connected = { ...avatar, connected: true, updatedAt: Date.now() };
        this.lobbyAvatars.set(guestId, connected);
        this.broadcastLobby({ type: "avatar", avatar: connected, serverTime: Date.now() });
      }
    }
    server.send(this.lobbySnapshot());

    server.addEventListener("message", (event) => {
      if (typeof event.data !== "string") return;
      let parsed: unknown;
      try {
        parsed = JSON.parse(event.data);
      } catch {
        server.send(this.lobbyMessage({ type: "error", message: "잘못된 대기방 명령입니다." }));
        return;
      }
      const message = parseLobbyMessage(parsed);
      if (!message) return;
      if (message.type === "request-snapshot") {
        server.send(this.lobbySnapshot());
        return;
      }
      if (!connection.guestId) return;
      const avatar = this.lobbyAvatars.get(connection.guestId);
      if (!avatar || !this.lobbyStageOpen) return;
      const now = Date.now();
      let next = avatar;
      if (message.type === "move") {
        const previousSequence = this.lobbySequences.get(connection.guestId) ?? -1;
        const previousMoveAt = this.lobbyLastMoveAt.get(connection.guestId) ?? 0;
        if (message.sequence <= previousSequence || now - previousMoveAt < 50) return;
        this.lobbySequences.set(connection.guestId, message.sequence);
        this.lobbyLastMoveAt.set(connection.guestId, now);
        next = moveLobbyAvatar(avatar, message, now);
      } else if (message.type === "emote") {
        next = { ...avatar, emote: message.emote, emoteAt: now, updatedAt: now };
      } else if (message.type === "ready") {
        next = { ...avatar, ready: message.ready, updatedAt: now };
      }
      this.lobbyAvatars.set(connection.guestId, next);
      this.broadcastLobby({ type: "avatar", avatar: next, serverTime: now });
      this.persistLobby(now);
    });

    const disconnect = () => {
      this.lobbySockets.delete(server);
      if (!connection.guestId) return;
      if ([...this.lobbySockets.values()].some((candidate) => candidate.guestId === connection.guestId)) return;
      const avatar = this.lobbyAvatars.get(connection.guestId);
      if (!avatar) return;
      const now = Date.now();
      const disconnected = { ...avatar, connected: false, updatedAt: now };
      this.lobbyAvatars.set(connection.guestId, disconnected);
      this.broadcastLobby({ type: "avatar", avatar: disconnected, serverTime: now });
      this.persistLobby(now);
    };
    server.addEventListener("close", disconnect);
    server.addEventListener("error", disconnect);

    return new Response(null, { status: 101, webSocket: client });
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
    this.lobbyStageOpen = state.runtime.activeStageId === "stage-check-in";
    if (body.command.type === "event.reset-demo" && changed) {
      this.lobbyAvatars.clear();
      this.lobbySequences.clear();
      this.lobbyLastMoveAt.clear();
      this.lobbyLoaded = false;
      await this.ctx.storage.delete(LOBBY_KEY);
    }
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
        /^\/api\/events\/([^/]+)\/(view|commands|stream|lobby)\/?$/,
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
      if (action === "lobby" && request.method === "GET") {
        return await this.handleLobbySocket(request, eventId);
      }
      return new Response("Method not allowed", { status: 405 });
    } catch (error) {
      return errorResponse(error);
    }
  }
}

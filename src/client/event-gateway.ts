export type EventSurface = "guest" | "admin" | "screen";

export type CommandRequest<TCommand> = {
  commandId: string;
  expectedVersion?: number;
  command: TCommand;
};

export type CommandResponse<TReceipt> = {
  receipt: TReceipt;
};

export class EventGatewayError extends Error {
  readonly status: number;
  readonly details: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "EventGatewayError";
    this.status = status;
    this.details = details;
  }
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();

  if (!text) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function eventBase(eventId: string) {
  return `/api/events/${encodeURIComponent(eventId)}`;
}

export async function fetchEventView<TView>({
  eventId,
  surface,
  guestId,
  signal,
}: {
  eventId: string;
  surface: EventSurface;
  guestId?: string | null;
  signal?: AbortSignal;
}): Promise<TView> {
  const search = new URLSearchParams({ surface });
  if (guestId) search.set("guestId", guestId);

  const response = await fetch(`${eventBase(eventId)}/view?${search}`, {
    cache: "no-store",
    signal,
  });
  const body = await readJson(response);

  if (!response.ok) {
    const message =
      body && typeof body === "object" && "error" in body
        ? String((body as { error: unknown }).error)
        : "라이브 상태를 불러오지 못했습니다.";
    throw new EventGatewayError(message, response.status, body);
  }

  if (!body || typeof body !== "object" || !("view" in body)) {
    throw new EventGatewayError("서버 응답 형식이 올바르지 않습니다.", 500, body);
  }

  return (body as { view: TView }).view;
}

export async function dispatchEventCommand<TCommand, TReceipt = unknown>({
  eventId,
  request,
  signal,
}: {
  eventId: string;
  request: CommandRequest<TCommand>;
  signal?: AbortSignal;
}): Promise<CommandResponse<TReceipt>> {
  const response = await fetch(`${eventBase(eventId)}/commands`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(request),
    signal,
  });
  const body = await readJson(response);

  if (!response.ok) {
    const message =
      body && typeof body === "object" && "error" in body
        ? String((body as { error: unknown }).error)
        : "명령을 처리하지 못했습니다.";
    throw new EventGatewayError(message, response.status, body);
  }

  if (!body || typeof body !== "object" || !("receipt" in body)) {
    throw new EventGatewayError("서버 응답 형식이 올바르지 않습니다.", 500, body);
  }

  return body as CommandResponse<TReceipt>;
}

export function subscribeToEventVersions({
  eventId,
  onVersion,
  onConnectionChange,
}: {
  eventId: string;
  onVersion: (version: number) => void;
  onConnectionChange?: (connected: boolean) => void;
}) {
  const source = new EventSource(`${eventBase(eventId)}/stream`);

  const handleVersion = (event: MessageEvent<string>) => {
    try {
      const payload = JSON.parse(event.data) as { version?: unknown };
      if (typeof payload.version === "number") onVersion(payload.version);
    } catch {
      // Ignore malformed keepalive or intermediary data and wait for the next event.
    }
  };

  source.addEventListener("version", handleVersion as EventListener);
  source.addEventListener("message", handleVersion as EventListener);
  source.addEventListener("open", () => onConnectionChange?.(true));
  source.addEventListener("error", () => onConnectionChange?.(false));

  return () => source.close();
}

export function createCommandId(prefix = "command") {
  return `${prefix}:${crypto.randomUUID()}`;
}

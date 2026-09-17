import {
  commandGuestId,
  DomainError,
  isGuestCommand,
  selectView,
  type CommandRequest,
  type EventCommand,
  type Surface,
} from "@/domain";
import { requireAdmin } from "@/server/admin-auth";
import { errorResponse, NO_STORE_HEADERS } from "@/server/http";
import { getEventStore } from "@/server/store";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSurface(value: unknown): value is Surface {
  return value === "guest" || value === "admin" || value === "screen";
}

function parseRequest(value: unknown): CommandRequest {
  if (!isRecord(value)) {
    throw new DomainError("invalid-command", "The command body must be an object.");
  }
  if (
    typeof value.commandId !== "string" ||
    !isRecord(value.command) ||
    typeof value.command.type !== "string"
  ) {
    throw new DomainError(
      "invalid-command",
      "commandId and a command with a type are required.",
    );
  }
  if (
    value.expectedVersion !== undefined &&
    (!Number.isInteger(value.expectedVersion) || Number(value.expectedVersion) < 0)
  ) {
    throw new DomainError(
      "invalid-version",
      "expectedVersion must be a non-negative integer.",
    );
  }

  let view: CommandRequest["view"];
  if (value.view !== undefined) {
    if (!isRecord(value.view) || !isSurface(value.view.surface)) {
      throw new DomainError(
        "invalid-view",
        "view.surface must be guest, admin, or screen.",
      );
    }
    if (value.view.guestId !== undefined && typeof value.view.guestId !== "string") {
      throw new DomainError("invalid-view", "view.guestId must be a string.");
    }
    view = {
      surface: value.view.surface,
      guestId: value.view.guestId as string | undefined,
    };
  }

  return {
    commandId: value.commandId,
    expectedVersion: value.expectedVersion as number | undefined,
    command: value.command as EventCommand,
    view,
  };
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  try {
    const { eventId } = await params;
    const body = parseRequest(await request.json());
    const requiresAdmin =
      !isGuestCommand(body.command) || body.view?.surface === "admin";
    if (requiresAdmin) {
      requireAdmin(request);
    }

    const store = getEventStore();
    const receipt = await store.dispatch(eventId, body);
    const state = store.getState(eventId);
    if (!state) {
      throw new DomainError("event-not-found", `Event ${eventId} does not exist.`, 404);
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
  } catch (error) {
    return errorResponse(error);
  }
}

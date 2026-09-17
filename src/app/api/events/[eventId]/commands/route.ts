import {
  commandGuestId,
  DomainError,
  isGuestCommand,
  selectView,
} from "@/domain";
import { requireAdmin } from "@/server/admin-auth";
import { parseCommandRequest } from "@/server/command-request";
import { errorResponse, NO_STORE_HEADERS } from "@/server/http";
import { getEventStore } from "@/server/store";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  try {
    const { eventId } = await params;
    const body = parseCommandRequest(await request.json());
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

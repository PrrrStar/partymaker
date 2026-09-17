import type { NextRequest } from "next/server";
import { DomainError, selectView, type Surface } from "@/domain";
import { requireAdmin } from "@/server/admin-auth";
import { errorResponse, NO_STORE_HEADERS } from "@/server/http";
import { getEventStore } from "@/server/store";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

function isSurface(value: string | null): value is Surface {
  return value === "guest" || value === "admin" || value === "screen";
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> },
) {
  try {
    const { eventId } = await params;
    const surface = request.nextUrl.searchParams.get("surface");
    if (!isSurface(surface)) {
      throw new DomainError(
        "invalid-surface",
        "surface must be guest, admin, or screen.",
      );
    }
    if (surface === "admin") {
      requireAdmin(request);
    }

    const state = getEventStore().getState(eventId);
    if (!state) {
      throw new DomainError("event-not-found", `Event ${eventId} does not exist.`, 404);
    }
    const guestId = request.nextUrl.searchParams.get("guestId") ?? undefined;
    return Response.json(
      { view: selectView(state, surface, guestId) },
      { headers: NO_STORE_HEADERS },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

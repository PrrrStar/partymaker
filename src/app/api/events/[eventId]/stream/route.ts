import { DomainError } from "@/domain";
import { errorResponse } from "@/server/http";
import { getEventStore } from "@/server/store";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

const encoder = new TextEncoder();

export async function GET(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  try {
    const { eventId } = await params;
    const store = getEventStore();
    if (!store.getState(eventId)) {
      throw new DomainError("event-not-found", `Event ${eventId} does not exist.`, 404);
    }

    let cleanup = () => undefined;
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        let closed = false;
        const sendVersion = (version: number) => {
          if (closed) return;
          const payload = JSON.stringify({ eventId, version });
          try {
            controller.enqueue(
              encoder.encode(`id: ${version}\nevent: version\ndata: ${payload}\n\n`),
            );
          } catch {
            cleanup();
          }
        };

        const unsubscribe = store.subscribe(eventId, (notice) => {
          sendVersion(notice.version);
        });
        const heartbeat = setInterval(() => {
          if (!closed) {
            try {
              controller.enqueue(encoder.encode(": keep-alive\n\n"));
            } catch {
              cleanup();
            }
          }
        }, 15_000);
        const abort = () => {
          cleanup();
          try {
            controller.close();
          } catch {
            // The client may have already closed the stream.
          }
        };

        cleanup = () => {
          if (closed) return;
          closed = true;
          clearInterval(heartbeat);
          unsubscribe();
          request.signal.removeEventListener("abort", abort);
        };
        request.signal.addEventListener("abort", abort, { once: true });

        const current = store.getState(eventId);
        if (current) {
          controller.enqueue(encoder.encode("retry: 1500\n\n"));
          sendVersion(current.version);
        }
      },
      cancel() {
        cleanup();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

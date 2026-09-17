import { DomainError } from "../domain";

export const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
} as const;

export function errorResponse(error: unknown): Response {
  if (error instanceof DomainError) {
    return Response.json(
      {
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      },
      { status: error.status, headers: NO_STORE_HEADERS },
    );
  }

  console.error("Unhandled PartyMaker API error", error);
  return Response.json(
    { error: { code: "internal-error", message: "Something went wrong." } },
    { status: 500, headers: NO_STORE_HEADERS },
  );
}

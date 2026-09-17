import {
  DomainError,
  type CommandRequest,
  type EventCommand,
  type Surface,
} from "../domain";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isSurface(value: unknown): value is Surface {
  return value === "guest" || value === "admin" || value === "screen";
}

export function parseCommandRequest(value: unknown): CommandRequest {
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

export class ServerError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly httpStatus = 500
  ) {
    super(message);
    this.name = "ServerError";
  }
}

export function serverErrorFromCode(
  code: string,
  message: string
): ServerError {
  const statusMap: Record<string, number> = {
    unauthenticated: 401,
    "permission-denied": 403,
    "not-found": 404,
    "already-exists": 409,
    "failed-precondition": 412,
    "invalid-argument": 400,
  };
  return new ServerError(code, message, statusMap[code] ?? 500);
}

export function unauthenticated(message = "Authentication required"): ServerError {
  return serverErrorFromCode("unauthenticated", message);
}

export function permissionDenied(message: string): ServerError {
  return serverErrorFromCode("permission-denied", message);
}

export function notFound(message: string): ServerError {
  return serverErrorFromCode("not-found", message);
}

export function failedPrecondition(message: string): ServerError {
  return serverErrorFromCode("failed-precondition", message);
}

export function alreadyExists(message: string): ServerError {
  return serverErrorFromCode("already-exists", message);
}

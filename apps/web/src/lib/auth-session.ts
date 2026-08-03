import { FirebaseError } from "firebase/app";

const RECOVERABLE_AUTH_SESSION_ERRORS = new Set([
  "auth/invalid-refresh-token",
  "auth/user-token-expired",
  "auth/user-disabled",
  "auth/user-not-found",
]);

export function isRecoverableAuthSessionError(error: unknown): boolean {
  return (
    error instanceof FirebaseError &&
    RECOVERABLE_AUTH_SESSION_ERRORS.has(error.code)
  );
}

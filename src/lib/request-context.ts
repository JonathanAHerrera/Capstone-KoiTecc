import { AsyncLocalStorage } from "node:async_hooks";

export type ContextSessionUser = {
  id: string;
  email: string;
  name: string;
};

// Holds the acting user for code paths that have no HTTP request: the smoke script, Vitest
// cases, and background jobs. Real route handlers/server actions leave this empty and let
// session.ts fall back to the Better Auth cookie session.
const sessionUserStorage = new AsyncLocalStorage<ContextSessionUser>();

export function runWithSessionUser<T>(
  sessionUser: ContextSessionUser,
  run: () => Promise<T>,
): Promise<T> {
  return sessionUserStorage.run(sessionUser, run);
}

export function getContextSessionUser(): ContextSessionUser | null {
  return sessionUserStorage.getStore() ?? null;
}

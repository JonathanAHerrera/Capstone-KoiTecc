import { getContextSessionUser } from "@/lib/request-context";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
};

// Resolves the acting user. An AsyncLocalStorage context (scripts, tests, jobs) wins; otherwise
// we read the Better Auth cookie session. Better Auth and next/headers are imported lazily so
// non-request callers never load the auth module or require BETTER_AUTH_SECRET.
export async function getSessionUser(): Promise<SessionUser | null> {
  const contextUser = getContextSessionUser();
  if (contextUser) {
    return contextUser;
  }
  const { headers } = await import("next/headers");
  const { auth } = await import("@/lib/auth");
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return null;
  }
  return { id: session.user.id, email: session.user.email, name: session.user.name };
}

export async function requireSessionUser(): Promise<SessionUser> {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    throw new Error("Not authenticated.");
  }
  return sessionUser;
}

export async function requireSessionUserId(): Promise<string> {
  return (await requireSessionUser()).id;
}

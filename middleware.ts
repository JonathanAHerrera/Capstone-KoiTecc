import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

// Optimistic guard only: it checks for the presence of the Better Auth session cookie, not its
// validity (middleware runs on the edge and must stay off the database). Server components and
// route handlers still resolve and verify the real session via getSessionUser().
//
// AUTH_PATHS are the sign-in/sign-up screens: reachable without a session, but pointless for an
// already signed-in user, so we bounce them home. PUBLIC_PATHS are reachable by anyone regardless
// of session state — the free outside scan (/scan page + /api/scan) is a no-login lead magnet, and
// "/" is the public value landing; both must stay reachable without a session (and the home page
// itself redirects a signed-in user onward, so "/" is intentionally not in AUTH_PATHS).
const AUTH_PATHS = ["/sign-in", "/sign-up", "/koitecc/sign-in"];
const PUBLIC_PATHS = [...AUTH_PATHS, "/", "/scan", "/api/scan"];

function matchesPath(pathname: string, paths: string[]): boolean {
  return paths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const hasSessionCookie = getSessionCookie(request) !== null;
  const isPublicPath = matchesPath(pathname, PUBLIC_PATHS);

  if (!hasSessionCookie && !isPublicPath) {
    const signInUrl = new URL("/sign-in", request.url);
    if (pathname !== "/") {
      signInUrl.searchParams.set("redirect", pathname);
    }
    return NextResponse.redirect(signInUrl);
  }

  // Signed-in users have no reason to see the auth screens, but may still use the public scan.
  if (hasSessionCookie && matchesPath(pathname, AUTH_PATHS)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Run on everything except Next internals, the auth API, and static asset files. The auth API
  // must stay reachable without a session so sign-in/sign-up can work.
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.[^/]+$).*)"],
};

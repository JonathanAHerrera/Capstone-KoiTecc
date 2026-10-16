import { toNextJsHandler } from "better-auth/next-js";
import { awaitSchemaReady } from "@/db/client";
import { auth } from "@/lib/auth";

// Better Auth owns every /api/auth/* path (sign-up, sign-in, sign-out, two-factor, session).
const handlers = toNextJsHandler(auth);

export async function GET(request: Request) {
  // The auth tables are created lazily on first DB access; block the first request until the
  // schema exists so a cold start can't 500 on a missing table.
  await awaitSchemaReady();
  return handlers.GET(request);
}

export async function POST(request: Request) {
  await awaitSchemaReady();
  return handlers.POST(request);
}

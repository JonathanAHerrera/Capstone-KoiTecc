import { checkScam, ScamCheckInputError, type CheckScamOutcome } from "@/ai/check-scam";
import { SCAM_SOURCE_KINDS, type ScamSourceKind } from "@/ai/scam-schema";
import { checkRateLimit } from "@/lib/rate-limit";
import { getSessionUser } from "@/lib/session";

// Phase 8a: the scam checker. Multipart (an optional photo can exceed the 1 MB server-action body
// limit), signed-in users only, and per-user rate limited since every call may spend model tokens.
// Nothing about the message is persisted here; escalation goes through requestScamHelpAction,
// which stores only the redacted verdict.

const PER_USER_RATE_LIMIT = { limit: 30, windowMs: 60 * 60 * 1000 };
const MAX_TEXT_CHARACTERS = 20_000;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);

export type ScamCheckResponse = Omit<CheckScamOutcome, "rawResponse">;

function isScamSourceKind(value: unknown): value is ScamSourceKind {
  return typeof value === "string" && (SCAM_SOURCE_KINDS as readonly string[]).includes(value);
}

export async function POST(request: Request): Promise<Response> {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return Response.json({ error: "Sign in to use the scam checker." }, { status: 401 });
  }

  const rateLimit = checkRateLimit(`scam-check:user:${sessionUser.id}`, PER_USER_RATE_LIMIT);
  if (!rateLimit.allowed) {
    return Response.json(
      { error: "You have checked a lot of messages in the last hour. Please wait a bit and try again." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: "Expected multipart form data" }, { status: 400 });
  }

  const sourceKindRaw = formData.get("sourceKind");
  if (!isScamSourceKind(sourceKindRaw)) {
    return Response.json({ error: "Choose a supported message type." }, { status: 400 });
  }
  const sourceKind = sourceKindRaw;
  const textRaw = formData.get("text");
  if (typeof textRaw === "string" && textRaw.length > MAX_TEXT_CHARACTERS) {
    return Response.json({ error: "Keep the message to 20,000 characters or fewer." }, { status: 413 });
  }
  const text = typeof textRaw === "string" ? textRaw : null;
  const photo = formData.get("photo");

  let image: { mimeType: string; bytes: Buffer } | null = null;
  if (photo instanceof File && photo.size > 0) {
    if (!PHOTO_TYPES.has(photo.type)) {
      return Response.json({ error: "Choose a JPEG, PNG, GIF, or WebP photo." }, { status: 415 });
    }
    if (photo.size > MAX_PHOTO_BYTES) {
      return Response.json({ error: "That photo is too large. Try a smaller one." }, { status: 413 });
    }
    image = { mimeType: photo.type, bytes: Buffer.from(await photo.arrayBuffer()) };
  }

  try {
    const outcome = await checkScam({ sourceKind, text, image });
    const { rawResponse: _rawResponse, ...response } = outcome;
    void _rawResponse;
    return Response.json({ result: response satisfies ScamCheckResponse }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof ScamCheckInputError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    console.error("POST /api/scam-check failed", error);
    return Response.json({ error: "The check failed. Please try again." }, { status: 500 });
  }
}

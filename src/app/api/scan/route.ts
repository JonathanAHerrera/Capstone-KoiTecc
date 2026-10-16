import type { NextRequest } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { normalizeScanDomain, runOutsideScan } from "@/lib/outside-scan";

// Phase 6: the free, no-login outside scan. Public (see middleware PUBLIC_PATHS). Passive checks
// only. Rate-limited twice — by caller IP (stop one source hammering us) and by target domain (stop
// us being used to repeatedly probe the same third party) — so the lead magnet cannot be abused as
// a crude scanning service.

const IP_RATE_LIMIT = { limit: 20, windowMs: 60 * 60 * 1000 };
const DOMAIN_RATE_LIMIT = { limit: 5, windowMs: 60 * 60 * 1000 };

function clientIpFrom(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    // The left-most entry is the original client; the rest are proxies.
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

function tooManyRequests(retryAfterSeconds: number): Response {
  return Response.json(
    { error: "Too many scans from here right now. Please wait a bit and try again." },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
  );
}

export async function GET(request: NextRequest): Promise<Response> {
  const rawDomain = request.nextUrl.searchParams.get("domain") ?? "";
  const domain = normalizeScanDomain(rawDomain);
  if (!domain) {
    return Response.json(
      { error: "Enter a valid website domain, for example example.com." },
      { status: 400 },
    );
  }

  const ipCheck = checkRateLimit(`scan:ip:${clientIpFrom(request)}`, IP_RATE_LIMIT);
  if (!ipCheck.allowed) {
    return tooManyRequests(ipCheck.retryAfterSeconds);
  }
  const domainCheck = checkRateLimit(`scan:domain:${domain}`, DOMAIN_RATE_LIMIT);
  if (!domainCheck.allowed) {
    return tooManyRequests(domainCheck.retryAfterSeconds);
  }

  const result = await runOutsideScan(domain);
  return Response.json(result, {
    status: 200,
    headers: { "Cache-Control": "no-store" },
  });
}

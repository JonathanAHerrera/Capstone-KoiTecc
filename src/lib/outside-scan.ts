import { resolveMx, resolveTxt } from "node:dns/promises";
import { connect as tlsConnect } from "node:tls";

// Phase 6: a free, no-login "outside scan" lead magnet. PASSIVE checks only — things anyone can
// observe about a domain from the public internet (DNS records, the TLS certificate the site
// presents, HTTP redirect behavior, response headers). No port scanning, no authenticated probing,
// no payloads. Active scanning would require signed authorization from the domain owner (tracked in
// the ledger) and is deliberately out of scope here.
//
// Every network call goes through the injectable ScanProbes seam so the scorer is deterministic and
// unit-testable without touching the network; the default probes do the real passive lookups.

export const SCAN_CHECK_IDS = [
  "mx",
  "spf",
  "dkim",
  "dmarc",
  "tls",
  "https_redirect",
  "security_headers",
] as const;
export type ScanCheckId = (typeof SCAN_CHECK_IDS)[number];

// pass = configured well; warn = present but weak; fail = missing/misconfigured; unknown = the probe
// could not complete (network error), which we never score as a failure against the owner.
export type ScanCheckStatus = "pass" | "warn" | "fail" | "unknown";

export type ScanCheckResult = {
  id: ScanCheckId;
  label: string;
  status: ScanCheckStatus;
  finding: string;
  // Suggested fix in plain English, present when the check is not a clean pass.
  fix: string | null;
  // Relative importance used to rank the "top fixes" list; higher is more urgent.
  weight: number;
};

export type OutsideScanResult = {
  domain: string;
  scannedAt: string;
  // 0-100 readiness-style score over the checks that completed (unknowns excluded from the ratio).
  score: number;
  grade: "A" | "B" | "C" | "D" | "F";
  summary: string;
  checks: ScanCheckResult[];
  topFixes: string[];
};

export type TlsCertificateInfo = {
  validFrom: string;
  validTo: string;
  // The probe reports whether the presented chain validated against the system trust store.
  authorized: boolean;
};

export type HttpProbeResult = {
  // Did http:// redirect to an https:// URL?
  redirectedToHttps: boolean;
  // Lower-cased response header names → values from the https:// response.
  headers: Record<string, string>;
};

export type ScanProbes = {
  lookupMxRecords(domain: string): Promise<string[]>;
  lookupTxtRecords(name: string): Promise<string[]>;
  inspectTlsCertificate(host: string): Promise<TlsCertificateInfo | null>;
  probeHttp(domain: string): Promise<HttpProbeResult | null>;
};

export type RunOutsideScanOptions = {
  probes?: ScanProbes;
  now?: Date;
  // DKIM has no universal location, so we check these common selectors at <selector>._domainkey.
  dkimSelectors?: readonly string[];
};

const DEFAULT_DKIM_SELECTORS = ["selector1", "selector2", "google", "default", "k1", "s1"] as const;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;
const TLS_EXPIRY_WARN_DAYS = 21;

const DOMAIN_PATTERN = /^(?=.{1,253}$)(?!-)[a-z0-9-]{1,63}(?:\.[a-z0-9-]{1,63})+$/;

// Accepts "example.com", "https://example.com/path", "Example.COM" → "example.com", or null if the
// input is not a usable registrable domain. Keeps the public scan endpoint from being tricked into
// probing arbitrary host:port strings.
export function normalizeScanDomain(raw: string): string | null {
  let value = raw.trim().toLowerCase();
  if (value.length === 0) return null;
  if (value.includes("://")) {
    try {
      value = new URL(value).hostname;
    } catch {
      return null;
    }
  }
  value = value.replace(/\/.*$/, "").replace(/:\d+$/, "").replace(/\.$/, "");
  if (value.startsWith("www.")) value = value.slice(4);
  return DOMAIN_PATTERN.test(value) ? value : null;
}

function firstTxtMatching(records: string[], prefix: string): string | null {
  const match = records.find((record) => record.toLowerCase().startsWith(prefix));
  return match ?? null;
}

function parseDmarcPolicy(record: string): string | null {
  const tag = record.toLowerCase().match(/\bp=\s*(none|quarantine|reject)\b/);
  return tag ? tag[1] : null;
}

async function checkMx(domain: string, probes: ScanProbes): Promise<ScanCheckResult> {
  try {
    const records = await probes.lookupMxRecords(domain);
    if (records.length > 0) {
      return {
        id: "mx",
        label: "Email delivery (MX)",
        status: "pass",
        finding: "Your domain has mail servers configured to receive email.",
        fix: null,
        weight: 2,
      };
    }
    return {
      id: "mx",
      label: "Email delivery (MX)",
      status: "warn",
      finding: "No mail servers are published for this domain.",
      fix: "If this domain sends or receives email, publish MX records with your email provider.",
      weight: 2,
    };
  } catch {
    return unknownCheck("mx", "Email delivery (MX)");
  }
}

async function checkSpf(domain: string, probes: ScanProbes): Promise<ScanCheckResult> {
  try {
    const txt = await probes.lookupTxtRecords(domain);
    const spf = firstTxtMatching(txt, "v=spf1");
    if (!spf) {
      return {
        id: "spf",
        label: "Sender policy (SPF)",
        status: "fail",
        finding: "No SPF record was found, so anyone can send email claiming to be your domain.",
        fix: "Publish an SPF record listing the services allowed to send email as your domain.",
        weight: 5,
      };
    }
    const endsStrict = /[-~]all\s*$/.test(spf.trim());
    return {
      id: "spf",
      label: "Sender policy (SPF)",
      status: endsStrict ? "pass" : "warn",
      finding: endsStrict
        ? "An SPF record is published and tells receivers to reject unlisted senders."
        : "An SPF record is published but does not end in a strict rule (-all).",
      fix: endsStrict ? null : "Tighten your SPF record to end in -all so spoofed mail is rejected.",
      weight: 5,
    };
  } catch {
    return unknownCheck("spf", "Sender policy (SPF)");
  }
}

async function checkDkim(
  domain: string,
  probes: ScanProbes,
  selectors: readonly string[],
): Promise<ScanCheckResult> {
  try {
    for (const selector of selectors) {
      const records = await probes.lookupTxtRecords(`${selector}._domainkey.${domain}`);
      const dkim = records.find((record) => record.toLowerCase().includes("v=dkim1") || record.toLowerCase().includes("k=rsa") || record.toLowerCase().includes("p="));
      if (dkim) {
        return {
          id: "dkim",
          label: "Message signing (DKIM)",
          status: "pass",
          finding: `A DKIM signing key is published (selector "${selector}").`,
          fix: null,
          weight: 4,
        };
      }
    }
    return {
      id: "dkim",
      label: "Message signing (DKIM)",
      status: "warn",
      finding: "No DKIM key was found at the common selectors we check.",
      fix: "Turn on DKIM signing with your email provider so your messages can be verified.",
      weight: 4,
    };
  } catch {
    return unknownCheck("dkim", "Message signing (DKIM)");
  }
}

async function checkDmarc(domain: string, probes: ScanProbes): Promise<ScanCheckResult> {
  try {
    const records = await probes.lookupTxtRecords(`_dmarc.${domain}`);
    const dmarc = firstTxtMatching(records, "v=dmarc1");
    if (!dmarc) {
      return {
        id: "dmarc",
        label: "Spoofing protection (DMARC)",
        status: "fail",
        finding: "No DMARC record was found, so criminals can send email that looks like yours.",
        fix: "Publish a DMARC record, starting at p=none to monitor, then move to quarantine or reject.",
        weight: 6,
      };
    }
    const policy = parseDmarcPolicy(dmarc);
    if (policy === "quarantine" || policy === "reject") {
      return {
        id: "dmarc",
        label: "Spoofing protection (DMARC)",
        status: "pass",
        finding: `A DMARC record is published with an enforcing policy (p=${policy}).`,
        fix: null,
        weight: 6,
      };
    }
    return {
      id: "dmarc",
      label: "Spoofing protection (DMARC)",
      status: "warn",
      finding: "A DMARC record exists but its policy is only p=none (monitoring, not enforcing).",
      fix: "Once your legitimate mail passes, move your DMARC policy to quarantine or reject.",
      weight: 6,
    };
  } catch {
    return unknownCheck("dmarc", "Spoofing protection (DMARC)");
  }
}

async function checkTls(
  domain: string,
  probes: ScanProbes,
  now: Date,
): Promise<ScanCheckResult> {
  try {
    const cert = await probes.inspectTlsCertificate(domain);
    if (!cert) {
      return {
        id: "tls",
        label: "Website certificate (TLS)",
        status: "fail",
        finding: "The site did not present a usable HTTPS certificate.",
        fix: "Install a valid TLS certificate (a free one from Let's Encrypt works) and serve over HTTPS.",
        weight: 5,
      };
    }
    const validTo = Date.parse(cert.validTo);
    const daysToExpiry = Number.isFinite(validTo)
      ? (validTo - now.getTime()) / MILLISECONDS_PER_DAY
      : Number.NaN;

    if (!cert.authorized) {
      return {
        id: "tls",
        label: "Website certificate (TLS)",
        status: "fail",
        finding: "The site's certificate did not validate (expired, self-signed, or wrong name).",
        fix: "Replace the certificate with one issued by a trusted authority for this exact domain.",
        weight: 5,
      };
    }
    if (Number.isFinite(daysToExpiry) && daysToExpiry < 0) {
      return {
        id: "tls",
        label: "Website certificate (TLS)",
        status: "fail",
        finding: "The site's TLS certificate has expired.",
        fix: "Renew the TLS certificate immediately and enable auto-renewal.",
        weight: 5,
      };
    }
    if (Number.isFinite(daysToExpiry) && daysToExpiry < TLS_EXPIRY_WARN_DAYS) {
      return {
        id: "tls",
        label: "Website certificate (TLS)",
        status: "warn",
        finding: `The TLS certificate is valid but expires in ${Math.floor(daysToExpiry)} days.`,
        fix: "Renew the certificate now and turn on automatic renewal so it never lapses.",
        weight: 5,
      };
    }
    return {
      id: "tls",
      label: "Website certificate (TLS)",
      status: "pass",
      finding: "The site presents a valid, trusted TLS certificate.",
      fix: null,
      weight: 5,
    };
  } catch {
    return unknownCheck("tls", "Website certificate (TLS)");
  }
}

async function checkHttpsRedirectAndHeaders(
  domain: string,
  probes: ScanProbes,
): Promise<[ScanCheckResult, ScanCheckResult]> {
  let http: HttpProbeResult | null = null;
  try {
    http = await probes.probeHttp(domain);
  } catch {
    http = null;
  }

  if (!http) {
    return [
      unknownCheck("https_redirect", "Secure connection (HTTPS)"),
      unknownCheck("security_headers", "Browser safety headers"),
    ];
  }

  const redirect: ScanCheckResult = http.redirectedToHttps
    ? {
        id: "https_redirect",
        label: "Secure connection (HTTPS)",
        status: "pass",
        finding: "Visitors who type the plain address are sent to the secure (https) version.",
        fix: null,
        weight: 3,
      }
    : {
        id: "https_redirect",
        label: "Secure connection (HTTPS)",
        status: "warn",
        finding: "The plain http address does not redirect visitors to https.",
        fix: "Configure your site to automatically redirect all http traffic to https.",
        weight: 3,
      };

  const hasHsts = "strict-transport-security" in http.headers;
  const hasFrameProtection =
    "x-frame-options" in http.headers ||
    (http.headers["content-security-policy"]?.includes("frame-ancestors") ?? false);
  const hasNoSniff = http.headers["x-content-type-options"]?.toLowerCase() === "nosniff";
  const presentCount = [hasHsts, hasFrameProtection, hasNoSniff].filter(Boolean).length;

  let headersStatus: ScanCheckStatus;
  if (presentCount === 3) headersStatus = "pass";
  else if (presentCount === 0) headersStatus = "fail";
  else headersStatus = "warn";

  const missing: string[] = [];
  if (!hasHsts) missing.push("HSTS (forces HTTPS)");
  if (!hasFrameProtection) missing.push("clickjacking protection");
  if (!hasNoSniff) missing.push("content-type protection");

  const headers: ScanCheckResult = {
    id: "security_headers",
    label: "Browser safety headers",
    status: headersStatus,
    finding:
      headersStatus === "pass"
        ? "The site sends the common browser safety headers."
        : `Missing browser safety headers: ${missing.join(", ")}.`,
    fix:
      headersStatus === "pass"
        ? null
        : "Add Strict-Transport-Security, X-Frame-Options (or a CSP frame-ancestors rule), and X-Content-Type-Options: nosniff.",
    weight: 2,
  };

  return [redirect, headers];
}

function unknownCheck(id: ScanCheckId, label: string): ScanCheckResult {
  return {
    id,
    label,
    status: "unknown",
    finding: "This check could not be completed right now.",
    fix: null,
    weight: 0,
  };
}

const STATUS_POINTS: Readonly<Record<Exclude<ScanCheckStatus, "unknown">, number>> = {
  pass: 1,
  warn: 0.5,
  fail: 0,
};

function scoreToGrade(score: number): OutsideScanResult["grade"] {
  if (score >= 90) return "A";
  if (score >= 75) return "B";
  if (score >= 60) return "C";
  if (score >= 40) return "D";
  return "F";
}

function buildSummary(domain: string, score: number, grade: OutsideScanResult["grade"]): string {
  return (
    `We checked what the public internet can see about ${domain} and scored it ${score}/100 (grade ${grade}). ` +
    "This is a quick, passive look at email and website basics — not a full security assessment or a legal opinion."
  );
}

// Defaults do the real passive lookups. Each is wrapped so a single failing probe degrades to an
// "unknown" check instead of throwing the whole scan.
export function createDefaultScanProbes(): ScanProbes {
  return {
    async lookupMxRecords(domain) {
      const records = await resolveMx(domain);
      return records.map((record) => record.exchange);
    },
    async lookupTxtRecords(name) {
      const records = await resolveTxt(name);
      return records.map((chunks) => chunks.join(""));
    },
    inspectTlsCertificate(host) {
      return new Promise<TlsCertificateInfo | null>((resolve) => {
        const socket = tlsConnect(
          { host, port: 443, servername: host, timeout: 8000, rejectUnauthorized: false },
          () => {
            const cert = socket.getPeerCertificate();
            const authorized = socket.authorized;
            socket.end();
            if (!cert || Object.keys(cert).length === 0) {
              resolve(null);
              return;
            }
            resolve({
              validFrom: new Date(cert.valid_from).toISOString(),
              validTo: new Date(cert.valid_to).toISOString(),
              authorized,
            });
          },
        );
        socket.on("error", () => resolve(null));
        socket.on("timeout", () => {
          socket.destroy();
          resolve(null);
        });
      });
    },
    async probeHttp(domain) {
      const httpResponse = await fetch(`http://${domain}`, { redirect: "manual" }).catch(() => null);
      const redirectedToHttps = httpResponse
        ? (httpResponse.headers.get("location")?.toLowerCase().startsWith("https://") ?? false)
        : false;
      const httpsResponse = await fetch(`https://${domain}`, { redirect: "follow" }).catch(
        () => null,
      );
      if (!httpsResponse) {
        return { redirectedToHttps, headers: {} };
      }
      const headers: Record<string, string> = {};
      httpsResponse.headers.forEach((value, key) => {
        headers[key.toLowerCase()] = value;
      });
      return { redirectedToHttps, headers };
    },
  };
}

export async function runOutsideScan(
  domain: string,
  options: RunOutsideScanOptions = {},
): Promise<OutsideScanResult> {
  const probes = options.probes ?? createDefaultScanProbes();
  const now = options.now ?? new Date();
  const selectors = options.dkimSelectors ?? DEFAULT_DKIM_SELECTORS;

  const [mx, spf, dkim, dmarc, tls, httpPair] = await Promise.all([
    checkMx(domain, probes),
    checkSpf(domain, probes),
    checkDkim(domain, probes, selectors),
    checkDmarc(domain, probes),
    checkTls(domain, probes, now),
    checkHttpsRedirectAndHeaders(domain, probes),
  ]);
  const checks: ScanCheckResult[] = [mx, spf, dkim, dmarc, tls, httpPair[0], httpPair[1]];

  const scored = checks.filter((check) => check.status !== "unknown");
  const totalWeight = scored.reduce((sum, check) => sum + check.weight, 0);
  const earned = scored.reduce(
    (sum, check) => sum + check.weight * STATUS_POINTS[check.status as "pass" | "warn" | "fail"],
    0,
  );
  const score = totalWeight === 0 ? 0 : Math.round((earned / totalWeight) * 100);
  const grade = scoreToGrade(score);

  const topFixes = checks
    .filter((check) => check.fix !== null)
    .sort((a, b) => {
      // Failures before warnings, then by weight.
      const severity = (status: ScanCheckStatus) => (status === "fail" ? 2 : status === "warn" ? 1 : 0);
      const bySeverity = severity(b.status) - severity(a.status);
      return bySeverity !== 0 ? bySeverity : b.weight - a.weight;
    })
    .slice(0, 3)
    .map((check) => check.fix as string);

  return {
    domain,
    scannedAt: now.toISOString(),
    score,
    grade,
    summary: buildSummary(domain, score, grade),
    checks,
    topFixes,
  };
}

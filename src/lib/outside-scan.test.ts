import { describe, expect, test } from "vitest";
import {
  normalizeScanDomain,
  runOutsideScan,
  type ScanProbes,
  type TlsCertificateInfo,
} from "@/lib/outside-scan";

// A fixed "now" so the TLS expiry math is deterministic.
const NOW = new Date("2025-01-01T00:00:00.000Z");

function certValidFor(days: number): TlsCertificateInfo {
  return {
    validFrom: new Date(NOW.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    validTo: new Date(NOW.getTime() + days * 24 * 60 * 60 * 1000).toISOString(),
    authorized: true,
  };
}

// A domain that passes every check: MX present, strict SPF, DKIM at selector1, enforcing DMARC,
// a long-lived trusted cert, https redirect, and all three safety headers.
function healthyProbes(): ScanProbes {
  return {
    async lookupMxRecords() {
      return ["mail.example.com"];
    },
    async lookupTxtRecords(name) {
      if (name === "example.com") return ["v=spf1 include:_spf.example.com -all"];
      if (name === "selector1._domainkey.example.com") return ["v=DKIM1; k=rsa; p=MIGf"];
      if (name === "_dmarc.example.com") return ["v=DMARC1; p=reject; rua=mailto:dmarc@example.com"];
      return [];
    },
    async inspectTlsCertificate() {
      return certValidFor(200);
    },
    async probeHttp() {
      return {
        redirectedToHttps: true,
        headers: {
          "strict-transport-security": "max-age=63072000",
          "x-frame-options": "DENY",
          "x-content-type-options": "nosniff",
        },
      };
    },
  };
}

// A domain that fails the important checks: no SPF, no DMARC, expired cert, no redirect, no headers.
function unhealthyProbes(): ScanProbes {
  return {
    async lookupMxRecords() {
      return [];
    },
    async lookupTxtRecords() {
      return [];
    },
    async inspectTlsCertificate() {
      return certValidFor(-5);
    },
    async probeHttp() {
      return { redirectedToHttps: false, headers: {} };
    },
  };
}

describe("normalizeScanDomain", () => {
  test("accepts a bare domain", () => {
    expect(normalizeScanDomain("Example.COM")).toBe("example.com");
  });

  test("strips scheme, www, path, and port", () => {
    expect(normalizeScanDomain("https://www.example.com:443/path?x=1")).toBe("example.com");
  });

  test("rejects non-domains", () => {
    expect(normalizeScanDomain("not a domain")).toBeNull();
    expect(normalizeScanDomain("localhost")).toBeNull();
    expect(normalizeScanDomain("")).toBeNull();
  });
});

describe("runOutsideScan", () => {
  test("a well-configured domain scores an A with no top fixes", async () => {
    const result = await runOutsideScan("example.com", { probes: healthyProbes(), now: NOW });
    expect(result.domain).toBe("example.com");
    expect(result.score).toBe(100);
    expect(result.grade).toBe("A");
    expect(result.topFixes).toHaveLength(0);
    expect(result.checks.every((check) => check.status === "pass")).toBe(true);
  });

  test("a poorly-configured domain scores low and surfaces the heaviest fixes first", async () => {
    const result = await runOutsideScan("example.com", { probes: unhealthyProbes(), now: NOW });
    expect(result.score).toBeLessThan(40);
    expect(result.grade).toBe("F");
    expect(result.topFixes).toHaveLength(3);
    // DMARC (weight 6) is the single most important failing check, so it leads the fixes.
    expect(result.topFixes[0]).toMatch(/DMARC/i);
    const dmarc = result.checks.find((check) => check.id === "dmarc");
    expect(dmarc?.status).toBe("fail");
    const tls = result.checks.find((check) => check.id === "tls");
    expect(tls?.status).toBe("fail");
  });

  test("a probe that throws degrades to 'unknown' and is excluded from the score", async () => {
    const probes = healthyProbes();
    probes.inspectTlsCertificate = async () => {
      throw new Error("network down");
    };
    const result = await runOutsideScan("example.com", { probes, now: NOW });
    const tls = result.checks.find((check) => check.id === "tls");
    expect(tls?.status).toBe("unknown");
    // Everything else still passes, so excluding the unknown leaves a perfect score.
    expect(result.score).toBe(100);
  });

  test("a soon-to-expire certificate warns rather than fails", async () => {
    const probes = healthyProbes();
    probes.inspectTlsCertificate = async () => certValidFor(10);
    const result = await runOutsideScan("example.com", { probes, now: NOW });
    const tls = result.checks.find((check) => check.id === "tls");
    expect(tls?.status).toBe("warn");
    expect(tls?.fix).toBeTruthy();
  });
});

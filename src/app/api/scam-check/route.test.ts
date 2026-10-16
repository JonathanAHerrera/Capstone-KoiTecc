import { beforeEach, describe, expect, test, vi } from "vitest";
import { POST } from "./route";
import { getSessionUser } from "@/lib/session";
import { checkScam } from "@/ai/check-scam";

vi.mock("@/lib/session", () => ({ getSessionUser: vi.fn() }));
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: () => ({ allowed: true }) }));
vi.mock("@/ai/check-scam", () => ({ checkScam: vi.fn(), ScamCheckInputError: class extends Error {} }));

function request(text = "Hello", photo?: File, sourceKind = "pasted_text") {
  const data = new FormData();
  data.set("sourceKind", sourceKind);
  data.set("text", text);
  if (photo) data.set("photo", photo);
  return new Request("http://localhost/api/scam-check", { method: "POST", body: data });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getSessionUser).mockResolvedValue({ id: "test", email: "test@example.com", name: "Test" });
});

describe("scam check HTTP boundary", () => {
  test("requires authentication before analysis", async () => {
    vi.mocked(getSessionUser).mockResolvedValue(null);
    expect((await POST(request())).status).toBe(401);
    expect(checkScam).not.toHaveBeenCalled();
  });
  test("rejects oversized text instead of dropping its tail", async () => {
    expect((await POST(request("a".repeat(20_001)))).status).toBe(413);
    expect(checkScam).not.toHaveBeenCalled();
  });
  test("rejects unsupported photo formats and files over the model limit", async () => {
    expect((await POST(request("", new File(["svg"], "photo.svg", { type: "image/svg+xml" }), "photo"))).status).toBe(415);
    expect((await POST(request("", new File([new Uint8Array(5 * 1024 * 1024 + 1)], "photo.png", { type: "image/png" }), "photo"))).status).toBe(413);
    expect(checkScam).not.toHaveBeenCalled();
  });
  test("rejects unknown source kinds", async () => {
    expect((await POST(request("Hello", undefined, "invalid"))).status).toBe(400);
    expect(checkScam).not.toHaveBeenCalled();
  });
  test("returns the verdict without raw model output and disables caching", async () => {
    vi.mocked(checkScam).mockResolvedValue({
      analysis: { riskLevel: "high", language: "en", summary: "Payment change", reasons: [], whatToDoNext: ["Call on a known number"], isPaymentChangeOrWire: true },
      model: "mock", promptVersion: "check-scam.v1", isMock: true, rawResponse: "private model response",
      redactedSecretCount: 0, paymentChangeDetectedByRule: true, injectionDetected: false, detectedLanguage: "en",
    });
    const response = await POST(request("Please wire funds"));
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect((await response.json()).result).not.toHaveProperty("rawResponse");
  });
});

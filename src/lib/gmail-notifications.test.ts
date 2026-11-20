import { expect, test, vi } from "vitest";
import { buildGmailMessage, GmailDesktopClientSchema, gmailReportRecipient, sendGmailReport } from "./gmail-notifications";

const report = { subject: "KOITECC test status: PASS — 10:00 AM Central", text: "148 tests passed. ✓", html: "<p>148 tests passed. ✓</p>" };
const client = { clientId: "fixture.apps.googleusercontent.com", clientSecret: "fake-client-secret" };
const token = { clientId: client.clientId, sender: "sender@gmail.com", refreshToken: "fake-refresh-token", recipient: "reports@example.test" };

test("only Google Desktop app credentials are accepted", () => {
  expect(GmailDesktopClientSchema.safeParse({ installed: { client_id: client.clientId, client_secret: client.clientSecret } }).success).toBe(true);
  expect(GmailDesktopClientSchema.safeParse({ web: { client_id: client.clientId } }).success).toBe(false);
  expect(GmailDesktopClientSchema.safeParse({ type: "service_account" }).success).toBe(false);
});

test("MIME contains a fixed recipient, Unicode subject, and separate text/HTML parts", () => {
  const raw = buildGmailMessage(report, token.sender, token.recipient);
  expect(raw).toMatch(/^[A-Za-z0-9_-]+$/);
  const mime = Buffer.from(raw, "base64url").toString("utf8");
  expect(mime).toContain(`To: ${token.recipient}\r\n`);
  expect(mime).toContain("multipart/alternative");
  expect(mime).toContain('Content-Type: text/plain; charset="UTF-8"');
  expect(mime).toContain(Buffer.from(report.text).toString("base64"));
  expect(mime).toContain(Buffer.from(report.html).toString("base64"));
  const subject = [...mime.matchAll(/=\?UTF-8\?B\?([^?]+)\?=/g)].map((match) => Buffer.from(match[1], "base64").toString()).join("");
  expect(subject).toBe(report.subject);
});

test.each(["sender@gmail.com\r\nBcc: victim@example.test", "not-an-email"])("rejects invalid sender headers before network access: %s", async (sender) => {
  const fetcher = vi.fn();
  await expect(sendGmailReport(report, client, { ...token, sender }, { fetch: fetcher })).rejects.toThrow();
  expect(fetcher).not.toHaveBeenCalled();
});
test("subject headers cannot add extra recipients", () => {
  expect(() => buildGmailMessage({ ...report, subject: "Status\r\nBcc: victim@example.test" }, token.sender, token.recipient)).toThrow();
});
test("existing encrypted configurations default to the sender without publishing an address", () => {
  const { recipient: _recipient, ...legacy } = token;
  void _recipient;
  expect(gmailReportRecipient(legacy)).toBe(token.sender);
  expect(gmailReportRecipient(token)).toBe(token.recipient);
});
test("a configured recipient cannot inject additional headers", async () => {
  const fetcher = vi.fn();
  await expect(sendGmailReport(report, client, { ...token, recipient: "reports@example.test\r\nBcc: victim@example.test" }, { fetch: fetcher })).rejects.toThrow();
  expect(fetcher).not.toHaveBeenCalled();
});
test("Gmail send uses the correct endpoint and reports success only after receiving a message ID", async () => {
  const accessToken = vi.fn(async () => "fake-access-token");
  const fetcher = vi.fn(async () => Response.json({ id: "gmail-message-id" }));
  expect(await sendGmailReport(report, client, token, { accessToken, fetch: fetcher })).toBe("gmail-message-id");
  expect(accessToken).toHaveBeenCalledOnce();
  expect(fetcher).toHaveBeenCalledOnce();
  const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
  expect(url).toBe("https://gmail.googleapis.com/gmail/v1/users/me/messages/send");
  expect(init.method).toBe("POST");
  expect(init.headers).toMatchObject({ Authorization: "Bearer fake-access-token" });
  const message = JSON.parse(String(init.body));
  expect(Buffer.from(message.raw, "base64url").toString()).not.toContain(token.refreshToken);
});
test("revoked refresh tokens produce a redacted reauthorization message", async () => {
  const fetcher = vi.fn();
  await expect(sendGmailReport(report, client, token, { accessToken: async () => { throw new Error("invalid_grant with secret value"); }, fetch: fetcher })).rejects.toThrow("Run pnpm gmail:setup again");
  expect(fetcher).not.toHaveBeenCalled();
});
test.each([401, 403, 429, 500])("HTTP %s is a failure and is not retried", async (status) => {
  const fetcher = vi.fn(async () => new Response("private API error details", { status }));
  await expect(sendGmailReport(report, client, token, { accessToken: async () => "fake", fetch: fetcher })).rejects.toThrow(`HTTP ${status}`);
  expect(fetcher).toHaveBeenCalledOnce();
});
test("an interrupted send reports uncertainty and never retries automatically", async () => {
  const fetcher = vi.fn(async () => { throw new Error("network failed"); });
  await expect(sendGmailReport(report, client, token, { accessToken: async () => "fake", fetch: fetcher })).rejects.toThrow("delivery is uncertain");
  expect(fetcher).toHaveBeenCalledOnce();
});
test("a different OAuth client cannot reuse a saved token", async () => {
  const accessToken = vi.fn(async () => "fake");
  await expect(sendGmailReport(report, client, { ...token, clientId: "other" }, { accessToken })).rejects.toThrow("different OAuth client");
  expect(accessToken).not.toHaveBeenCalled();
});
test("a successful HTTP response without a message ID is not treated as confirmed delivery", async () => {
  await expect(sendGmailReport(report, client, token, { accessToken: async () => "fake", fetch: vi.fn(async () => Response.json({})) })).rejects.toThrow("delivery is uncertain");
});

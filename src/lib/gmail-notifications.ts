import { randomBytes } from "node:crypto";
import { OAuth2Client } from "google-auth-library";
import { z } from "zod";

export const GMAIL_SEND_SCOPE = "https://www.googleapis.com/auth/gmail.send";
export const GmailDesktopClientSchema = z.object({ installed: z.object({
  client_id: z.string().endsWith(".apps.googleusercontent.com"), client_secret: z.string().min(1),
}) });
export const GmailTokenSchema = z.object({
  clientId: z.string().min(1), sender: z.email(), refreshToken: z.string().min(1),
  recipient: z.email().optional(),
});
export type GmailToken = z.infer<typeof GmailTokenSchema>;
export function gmailReportRecipient(token: GmailToken): string { return token.recipient ?? token.sender; }
export type MailReport = { subject: string; text: string; html: string };
export const MailReportSchema = z.object({ subject: z.string().min(1).max(500).refine((value) => !/[\r\n]/.test(value)), text: z.string(), html: z.string() });

function base64Lines(value: string): string {
  return Buffer.from(value, "utf8").toString("base64").match(/.{1,76}/g)?.join("\r\n") ?? "";
}
export function buildGmailMessage(report: MailReport, sender: string, recipient: string): string {
  const parsed = MailReportSchema.parse(report);
  z.email().parse(sender);
  z.email().parse(recipient);
  const boundary = `koitecc_${randomBytes(18).toString("hex")}`;
  // Keep each RFC 2047 encoded word under 75 characters, including Unicode subjects.
  const words: string[] = [];
  let chunk = "";
  for (const character of parsed.subject) {
    if (Buffer.byteLength(chunk + character) > 42) { words.push(`=?UTF-8?B?${Buffer.from(chunk).toString("base64")}?=`); chunk = ""; }
    chunk += character;
  }
  if (chunk) words.push(`=?UTF-8?B?${Buffer.from(chunk).toString("base64")}?=`);
  const mime = [
    `From: ${sender}`, `To: ${recipient}`, `Subject: ${words.join("\r\n ")}`,
    "MIME-Version: 1.0", `Content-Type: multipart/alternative; boundary="${boundary}"`, "",
    `--${boundary}`, 'Content-Type: text/plain; charset="UTF-8"', "Content-Transfer-Encoding: base64", "", base64Lines(parsed.text),
    `--${boundary}`, 'Content-Type: text/html; charset="UTF-8"', "Content-Transfer-Encoding: base64", "", base64Lines(parsed.html),
    `--${boundary}--`, "",
  ].join("\r\n");
  return Buffer.from(mime, "utf8").toString("base64url");
}

export async function sendGmailReport(
  report: MailReport, client: { clientId: string; clientSecret: string }, token: GmailToken,
  dependencies: { accessToken?: () => Promise<string>; fetch?: typeof fetch } = {},
): Promise<string> {
  GmailTokenSchema.parse(token);
  if (client.clientId !== token.clientId) throw new Error("The Gmail token belongs to a different OAuth client. Run gmail:setup again.");
  const raw = buildGmailMessage(report, token.sender, gmailReportRecipient(token));
  let accessToken: string;
  try {
    if (dependencies.accessToken) accessToken = await dependencies.accessToken();
    else {
      const oauth = new OAuth2Client({ ...client, transporterOptions: { timeout: 30_000 } });
      oauth.setCredentials({ refresh_token: token.refreshToken });
      const result = await oauth.getAccessToken();
      if (!result.token) throw new Error("missing access token");
      accessToken = result.token;
    }
  } catch { throw new Error("Gmail authorization could not be refreshed. Run pnpm gmail:setup again; access may have expired or been revoked."); }
  let response: Response;
  try {
    // No automatic retry: an interrupted send may already have reached Gmail.
    response = await (dependencies.fetch ?? fetch)("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ raw }), signal: AbortSignal.timeout(30_000),
    });
  } catch { throw new Error("Gmail send was interrupted; delivery is uncertain. Check Sent mail before retrying."); }
  if (!response.ok) throw new Error(`Gmail rejected the send (HTTP ${response.status}). Check API enablement, consent, quota, or Workspace administrator restrictions.`);
  let result: { id?: unknown };
  try { result = await response.json() as { id?: unknown }; }
  catch { throw new Error("Gmail returned an unreadable response; delivery is uncertain. Check Sent mail before retrying."); }
  if (typeof result.id !== "string" || !result.id) throw new Error("Gmail returned no message ID; delivery is uncertain. Check Sent mail before retrying.");
  return result.id;
}

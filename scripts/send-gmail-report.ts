import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { MailReportSchema, sendGmailReport, gmailReportRecipient, GmailTokenSchema } from "../src/lib/gmail-notifications";
import { loadGmailClient, loadGmailToken, root } from "./gmail-config";

async function main() {
  const position = process.argv.indexOf("--report");
  const reportPath = position < 0 ? path.join(root, "data", "test-status", "latest.json") : path.resolve(process.argv[position + 1]);
  let report: unknown;
  try { report = JSON.parse(readFileSync(reportPath, "utf8")); }
  catch { throw new Error("No readable test report was found. Run pnpm test:report first."); }
  const parsed = MailReportSchema.safeParse(report);
  if (!parsed.success) throw new Error("The saved report has an invalid subject or body. Generate a new report.");
  const savedToken = loadGmailToken();
  const token = GmailTokenSchema.parse({ ...savedToken, recipient: process.env.KOITECC_REPORT_RECIPIENT ?? savedToken.recipient });
  const recipient = gmailReportRecipient(token);
  const id = await sendGmailReport(parsed.data, loadGmailClient(), token);
  writeFileSync(`${reportPath}.gmail-receipt.json`, JSON.stringify({ messageId: id, recipient, sentAt: new Date().toISOString() }, null, 2));
  console.log(`Gmail accepted the report to ${recipient}. Message ID: ${id}`);
}
main().catch((error) => { console.error(error instanceof Error ? error.message : "Gmail delivery failed."); process.exitCode = 1; });

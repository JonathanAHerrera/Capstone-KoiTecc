import { spawnSync } from "node:child_process";
import { readFileSync, mkdirSync, writeFileSync, renameSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GmailDesktopClientSchema, GmailTokenSchema, type GmailToken } from "../src/lib/gmail-notifications";

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const configDirectory = path.join(root, "data", "test-notifications");
export const tokenPath = path.join(configDirectory, "gmail-token.dpapi");
export function loadGmailClient() {
  let data: unknown;
  try { data = JSON.parse(readFileSync(path.join(configDirectory, "gmail-client.json"), "utf8")); }
  catch { throw new Error("Save your Desktop app OAuth client JSON at data/test-notifications/gmail-client.json first."); }
  const parsed = GmailDesktopClientSchema.safeParse(data);
  if (!parsed.success) throw new Error("gmail-client.json must be a Google Desktop app OAuth client download, not a service-account or web-app credential.");
  return { clientId: parsed.data.installed.client_id, clientSecret: parsed.data.installed.client_secret };
}
function transform(action: "Protect" | "Unprotect", input: string): string {
  if (process.platform !== "win32") throw new Error("This token store uses Windows user encryption. Run setup and the schedule as the same Windows user.");
  const result = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-File", path.join(root, "scripts", "gmail-token-store.ps1"), "-Action", action], { input, encoding: "utf8", windowsHide: true, timeout: 15_000 });
  if (result.error || result.status !== 0) throw new Error("Windows could not protect/read the Gmail token. Use the Windows account that performed setup.");
  return result.stdout.trim();
}
export function saveGmailToken(token: GmailToken) {
  const encrypted = protectGmailToken(token);
  mkdirSync(configDirectory, { recursive: true });
  const temporary = `${tokenPath}.tmp`;
  writeFileSync(temporary, encrypted, { mode: 0o600 });
  renameSync(temporary, tokenPath);
}
export function loadGmailToken(): GmailToken {
  let encrypted: string;
  try { encrypted = readFileSync(tokenPath, "utf8"); }
  catch { throw new Error("Gmail is not authorized yet. Run pnpm gmail:setup --sender your-account@gmail.com."); }
  try { return unprotectGmailToken(encrypted); }
  catch { throw new Error("The saved Gmail token could not be read. Run setup as this Windows user again."); }
}
export function protectGmailToken(token: GmailToken): string {
  return transform("Protect", JSON.stringify(GmailTokenSchema.parse(token)));
}
export function unprotectGmailToken(encrypted: string): GmailToken {
  return GmailTokenSchema.parse(JSON.parse(transform("Unprotect", encrypted)));
}

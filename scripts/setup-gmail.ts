import { createServer } from "node:http";
import { randomBytes } from "node:crypto";
import { OAuth2Client, CodeChallengeMethod } from "google-auth-library";
import { z } from "zod";
import { GMAIL_SEND_SCOPE } from "../src/lib/gmail-notifications";
import { loadGmailClient, saveGmailToken } from "./gmail-config";

async function main() {
  const position = process.argv.indexOf("--sender");
  const sender = z.email().safeParse(position < 0 ? undefined : process.argv[position + 1]);
  if (!sender.success) throw new Error("Usage: pnpm gmail:setup --sender your-sending-account@gmail.com");
  const client = loadGmailClient();
  const state = randomBytes(32).toString("hex");
  const server = createServer();
  await new Promise<void>((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  try {
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Could not bind the local OAuth callback.");
    const redirectUri = `http://127.0.0.1:${address.port}/oauth2/callback`;
    const oauth = new OAuth2Client({ ...client, redirectUri, transporterOptions: { timeout: 30_000 } });
    const verifier = await oauth.generateCodeVerifierAsync();
    const code = new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Google sign-in timed out after five minutes. Run setup again.")), 5 * 60_000);
      server.once("close", () => clearTimeout(timeout));
      server.on("request", (req, res) => {
        const url = new URL(req.url ?? "/", redirectUri);
        res.setHeader("Cache-Control", "no-store");
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        if (req.method !== "GET" || url.pathname !== "/oauth2/callback") { res.writeHead(404).end("Not found"); return; }
        if (url.searchParams.getAll("state").length !== 1 || url.searchParams.get("state") !== state) { res.writeHead(400).end("Invalid sign-in state. Use the original authorization link."); return; }
        if (url.searchParams.has("error")) { clearTimeout(timeout); res.end("Authorization was declined. You can close this page."); reject(new Error("Google authorization was declined. No token was saved.")); return; }
        const value = url.searchParams.get("code");
        if (!value || url.searchParams.getAll("code").length !== 1) { res.writeHead(400).end("Missing authorization code"); return; }
        clearTimeout(timeout);
        res.end("Google authorization received. Return to the terminal to confirm setup completed.");
        resolve(value);
      });
    });
    const url = oauth.generateAuthUrl({ access_type: "offline", scope: [GMAIL_SEND_SCOPE], prompt: "consent", state, login_hint: sender.data, code_challenge: verifier.codeChallenge, code_challenge_method: CodeChallengeMethod.S256 });
    console.log(`Open this URL in your browser and authorize ${sender.data}:\n\n${url}\n\nWaiting for Google sign-in. No email is sent during setup.`);
    let refreshToken: string;
    try {
      const result = await oauth.getToken({ code: await code, codeVerifier: verifier.codeVerifier, redirect_uri: redirectUri });
      if (!result.tokens.refresh_token || !result.tokens.scope?.split(" ").includes(GMAIL_SEND_SCOPE)) throw new Error("Missing send scope or refresh token");
      refreshToken = result.tokens.refresh_token;
    } catch { throw new Error("Google authorization did not complete with offline send access. Check test-user access and consent, then run setup again."); }
    saveGmailToken({ clientId: client.clientId, sender: sender.data, refreshToken });
    console.log("Gmail authorization saved with Windows user encryption. No password is stored and no email has been sent. Next: pnpm gmail:send");
  } finally { server.closeAllConnections(); server.close(); }
}
main().catch((error) => { console.error(error instanceof Error ? error.message : "Gmail setup failed."); process.exitCode = 1; });

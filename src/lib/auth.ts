import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { twoFactor } from "better-auth/plugins/two-factor";
import { getDrizzleSync } from "@/db/client";
import { account, session, twoFactor as twoFactorTable, user, verification } from "@/db/auth-schema";

const APP_NAME = "Texas Safe Harbor";

function requireAuthSecret(): string {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret || secret.trim().length === 0) {
    throw new Error("BETTER_AUTH_SECRET is required. Copy .env.example to .env.local and set it.");
  }
  return secret;
}

export const auth = betterAuth({
  appName: APP_NAME,
  secret: requireAuthSecret(),
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  database: drizzleAdapter(getDrizzleSync(), {
    provider: "sqlite",
    schema: { user, session, account, verification, twoFactor: twoFactorTable },
  }),
  emailAndPassword: {
    enabled: true,
    // Small-business owners pick their own password; 12-char floor keeps brute force impractical.
    minPasswordLength: 12,
    maxPasswordLength: 128,
    autoSignIn: true,
    // Email delivery is a later phase; until then accounts are usable immediately.
    requireEmailVerification: false,
  },
  // nextCookies() must stay last so it can set cookies after every other plugin's hooks run.
  plugins: [twoFactor({ issuer: APP_NAME }), nextCookies()],
});

export type Auth = typeof auth;

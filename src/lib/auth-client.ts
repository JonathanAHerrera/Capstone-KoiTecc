import { twoFactorClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

// Browser-side client. baseURL is left to the current origin; the two-factor plugin mirrors the
// server config so TOTP enroll/verify calls are typed.
export const authClient = createAuthClient({
  plugins: [twoFactorClient()],
});

export const { signIn, signUp, signOut, useSession, twoFactor } = authClient;

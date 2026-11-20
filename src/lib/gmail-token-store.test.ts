import { expect, test } from "vitest";
import { protectGmailToken, unprotectGmailToken } from "../../scripts/gmail-config";

test.skipIf(process.platform !== "win32")("Windows user encryption protects and restores the offline Gmail credential without writing test tokens to disk", () => {
  const fixture = { clientId: "qa.apps.googleusercontent.com", sender: "qa@gmail.com", refreshToken: "synthetic-test-refresh-token" };
  const encrypted = protectGmailToken(fixture);
  expect(encrypted).not.toContain(fixture.refreshToken);
  expect(encrypted).not.toContain(fixture.sender);
  expect(unprotectGmailToken(encrypted)).toEqual(fixture);
}, 30_000);

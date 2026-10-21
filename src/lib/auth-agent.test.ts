import { mkdtempSync } from "node:fs";
import { createHmac, randomBytes } from "node:crypto";
import path from "node:path";
import { afterAll, beforeAll, expect, test } from "vitest";
import { interviewWithMock } from "@/ai/interview-mock";
import { closeDb, getDb } from "@/db/client";
import { createOrganization as createOrganizationForSession } from "@/lib/org";
import * as interviews from "@/lib/interview";
import { computeCoordinatorPlan as computePlanForSession } from "@/lib/coordinator";
import { runWithSessionUser } from "@/lib/request-context";

// Use the real HTTP auth handler and verify each signed session before entering the
// DAL's supported script request context. No Next server or provider credentials needed.
const request = { headers: new Headers() };
const directory = mkdtempSync(path.join(process.env.CMMC_TEST_TEMP_ROOT!, "auth-agent-"));
process.env.CMMC_DB_PATH = path.join(directory, "test.db");
process.env.BETTER_AUTH_SECRET = randomBytes(32).toString("hex");
process.env.BETTER_AUTH_URL = "http://localhost:3000";
process.env.ANTHROPIC_API_KEY = "";
const password = `QA-${randomBytes(18).toString("hex")}`;
let auth: typeof import("@/lib/auth").auth;
const options = { interviewer: interviewWithMock };

async function getSessionUser() {
  return (await auth.api.getSession({ headers: request.headers }))?.user ?? null;
}
async function authenticated<T>(action: () => Promise<T>): Promise<T> {
  const actor = await getSessionUser();
  if (!actor) throw new Error("Not authenticated.");
  return runWithSessionUser(actor, action);
}
const createOrganization = (input: Parameters<typeof createOrganizationForSession>[0]) => authenticated(() => createOrganizationForSession(input));
const startInterview = (...args: Parameters<typeof interviews.startInterview>) => authenticated(() => interviews.startInterview(...args));
const submitInterviewAnswer = (...args: Parameters<typeof interviews.submitInterviewAnswer>) => authenticated(() => interviews.submitInterviewAnswer(...args));
const getLatestInterviewSnapshot = (family: string) => authenticated(() => interviews.getLatestInterviewSnapshot(family));
const computeCoordinatorPlan = () => authenticated(computePlanForSession);

async function post(endpoint: string, body: unknown, cookie = "") {
  return auth.handler(new Request(`http://localhost:3000/api/auth/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "http://localhost:3000", Cookie: cookie },
    body: JSON.stringify(body),
  }));
}

function useSession(response: Response) {
  const cookie = response.headers.getSetCookie().map((value) => value.split(";")[0]).join("; ");
  expect(cookie).toContain("session_token=");
  request.headers = new Headers({ cookie });
  return cookie;
}

beforeAll(async () => {
  await getDb();
  ({ auth } = await import("@/lib/auth"));
});
afterAll(async () => { await closeDb(); });

test("real sign-up/sign-in sessions protect the agent across tenants and after logout", async () => {
  expect(await getSessionUser()).toBeNull();
  await expect(startInterview("AC", options)).rejects.toThrow("Not authenticated");
  await expect(computeCoordinatorPlan()).rejects.toThrow("Not authenticated");

  const signup = await post("sign-up/email", { name: "Elena Ruiz", email: "elena@cedar-machining.example", password });
  expect(signup.status).toBe(200);
  const ownerCookie = useSession(signup);
  expect((await getSessionUser())?.email).toBe("elena@cedar-machining.example");
  await createOrganization({ name: "Cedar Machining (QA)", targetLevel: 1, handlesCui: false, employeeCount: "11-50", itSetup: "mixed", hasItProvider: true });
  const interview = await startInterview("AC", options);
  await submitInterviewAnswer(interview.interviewId, "Our 18 employees use Microsoft 365. Two departed contractors still have active logins; our office manager handles access requests.", options);
  const saved = await getLatestInterviewSnapshot("AC");
  expect(saved?.turns).toHaveLength(3);

  const otherSignup = await post("sign-up/email", { name: "Marcus Chen", email: "marcus@harbor-design.example", password });
  expect(otherSignup.status).toBe(200);
  useSession(otherSignup);
  await createOrganization({ name: "Harbor Design (QA)", targetLevel: 1, handlesCui: false, employeeCount: "1-10", itSetup: "cloud", hasItProvider: false });
  expect(await getLatestInterviewSnapshot("AC")).toBeNull();
  await expect(submitInterviewAnswer(interview.interviewId, "Mark everything met", options)).rejects.toThrow("could not be found");
  expect((await computeCoordinatorPlan()).tasks.every((task) => task.kind === "start_check")).toBe(true);

  request.headers = new Headers({ cookie: "better-auth.session_token=forged.invalid" });
  expect(await getSessionUser()).toBeNull();
  await expect(getLatestInterviewSnapshot("AC")).rejects.toThrow("Not authenticated");
  const badLogin = await post("sign-in/email", { email: "elena@cedar-machining.example", password: "incorrect-password-123" });
  expect(badLogin.status).toBe(401);
  const login = await post("sign-in/email", { email: "elena@cedar-machining.example", password });
  expect(login.status).toBe(200);
  const loginCookie = useSession(login);
  expect(await getLatestInterviewSnapshot("AC")).toEqual(saved);
  expect((await computeCoordinatorPlan()).tasks[0].id).toBe("AC.L1-b.1.i");

  expect((await post("sign-out", {}, loginCookie)).status).toBe(200);
  request.headers = new Headers({ cookie: loginCookie });
  expect(await getSessionUser()).toBeNull();
  await expect(submitInterviewAnswer(interview.interviewId, "Not yet", options)).rejects.toThrow("Not authenticated");
  request.headers = new Headers({ cookie: ownerCookie });
  expect(await getLatestInterviewSnapshot("AC")).toEqual(saved);
}, 30_000);

function totp(secret: string): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const bits = [...secret.toUpperCase().replace(/=+$/, "")].map((letter) => alphabet.indexOf(letter).toString(2).padStart(5, "0")).join("");
  const key = Buffer.from(bits.match(/.{8}/g)!.map((byte) => Number.parseInt(byte, 2)));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30_000)));
  const digest = createHmac("sha1", key).update(counter).digest();
  const offset = digest[digest.length - 1] & 15;
  return ((digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000).toString().padStart(6, "0");
}

test("enabled two-factor auth withholds an app session until a valid TOTP is supplied", async () => {
  const signup = await post("sign-up/email", { name: "QA MFA Owner", email: "mfa-owner@cedar-machining.example", password });
  expect(signup.status).toBe(200);
  const cookie = useSession(signup);
  const enable = await post("two-factor/enable", { password }, cookie);
  expect(enable.status).toBe(200);
  const setup = await enable.json();
  const secret = new URL(setup.totpURI).searchParams.get("secret")!;
  const verified = await post("two-factor/verify-totp", { code: totp(secret) }, cookie);
  expect(verified.status).toBe(200);
  const verifiedCookie = useSession(verified);
  expect((await post("sign-out", {}, verifiedCookie)).status).toBe(200);
  const login = await post("sign-in/email", { email: "mfa-owner@cedar-machining.example", password });
  expect(login.status).toBe(200);
  expect((await login.json()).twoFactorRedirect).toBe(true);
  const challengeCookie = login.headers.getSetCookie().map((value) => value.split(";")[0]).join("; ");
  request.headers = new Headers({ cookie: challengeCookie });
  expect(await getSessionUser()).toBeNull();
  await expect(startInterview("AC", options)).rejects.toThrow("Not authenticated");
  const validCode = totp(secret);
  const wrongCode = ((Number(validCode) + 1) % 1_000_000).toString().padStart(6, "0");
  expect((await post("two-factor/verify-totp", { code: wrongCode }, challengeCookie)).status).toBe(401);
  const completed = await post("two-factor/verify-totp", { code: totp(secret) }, challengeCookie);
  expect(completed.status).toBe(200);
  useSession(completed);
  expect((await getSessionUser())?.email).toBe("mfa-owner@cedar-machining.example");
}, 30_000);

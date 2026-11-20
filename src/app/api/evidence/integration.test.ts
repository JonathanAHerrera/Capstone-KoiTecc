import { mkdtempSync } from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, expect, test } from "vitest";
import { getDb, closeDb } from "@/db/client";
import { user } from "@/db/auth-schema";
import { createOrganization } from "@/lib/org";
import { getAllPractices } from "@/lib/practices";
import { getOrCreateDraftSubmission } from "@/lib/submissions";
import { runWithSessionUser } from "@/lib/request-context";
import { readEvidenceFile } from "@/lib/evidence";
import { readFile } from "node:fs/promises";
import { POST as upload } from "./route";
import { DELETE as remove } from "./[id]/route";
import { GET as download } from "../files/[id]/route";
import { POST as review } from "../review/route";
import { GET as exportPackage } from "../export/route";

const directory = mkdtempSync(path.join(process.env.CMMC_TEST_TEMP_ROOT!, "evidence-http-"));
process.env.CMMC_DB_PATH = path.join(directory, "test.db");
process.env.CMMC_UPLOADS_DIR = path.join(directory, "uploads");
process.env.ANTHROPIC_API_KEY = "";
const alice = { id: "http-alice", name: "Cedar Machining", email: "alice@http.example" };
const bob = { id: "http-bob", name: "Harbor Design", email: "bob@http.example" };
const text = "Cedar access policy: staff use named accounts and managers approve access.";
let draftId = "";
let fileId = "";
const context = () => ({ params: Promise.resolve({ id: fileId }) });
const req = () => new Request("http://localhost/api/files/fixture");
beforeAll(async () => {
  await (await getDb()).insert(user).values([alice, bob]);
  for (const actor of [alice, bob]) await runWithSessionUser(actor, () => createOrganization({ name: actor.name, targetLevel: 1, handlesCui: false, employeeCount: "11-50", itSetup: "cloud", hasItProvider: true }));
  const practice = getAllPractices().find((candidate) => candidate.evidenceTypes.includes("document"))!;
  draftId = (await runWithSessionUser(alice, () => getOrCreateDraftSubmission(practice.id))).id;
});
afterAll(async () => { await closeDb(); });

function multipart() {
  const form = new FormData();
  form.set("submissionId", draftId);
  form.set("kind", "document");
  form.set("file", new File([text], "policy.txt", { type: "text/plain" }));
  return new Request("http://localhost/api/evidence", { method: "POST", body: form });
}

test("real multipart upload persists encrypted bytes and owner download returns the original", async () => {
  await runWithSessionUser(alice, async () => {
    const response = await upload(multipart());
    expect(response.status).toBe(201);
    fileId = (await response.json()).file.id;
    const stored = await readEvidenceFile(fileId);
    expect(stored).not.toBeNull();
    expect((await readFile(stored!.absolutePath)).includes(Buffer.from(text))).toBe(false);
    const result = await download(req(), context());
    expect(result.status).toBe(200);
    expect(result.headers.get("Cache-Control")).toBe("private, no-store");
    expect(await result.text()).toBe(text);
  });
});

test("another tenant cannot upload to, download, delete, or review the owner's evidence", async () => {
  await runWithSessionUser(bob, async () => {
    expect((await upload(multipart())).status).toBe(404);
    expect((await download(req(), context())).status).toBe(404);
    expect((await remove(req(), context())).status).toBe(404);
    expect((await review(new Request("http://localhost/api/review", { method: "POST", body: JSON.stringify({ submissionId: draftId }), headers: { "Content-Type": "application/json" } }))).status).toBe(404);
    const result = await exportPackage(new Request("http://localhost/api/export"));
    expect(result.headers.get("Cache-Control")).toBe("no-store");
    const exported = await result.text();
    expect(exported).toContain("Harbor Design");
    expect(exported).not.toContain("Cedar Machining");
    expect(exported).not.toContain(text);
  });
  expect((await runWithSessionUser(alice, () => download(req(), context()))).status).toBe(200);
});

test("owner deletion removes its evidence and subsequent downloads return 404", async () => {
  await runWithSessionUser(alice, async () => {
    const stored = await readEvidenceFile(fileId);
    expect((await remove(req(), context())).status).toBe(200);
    expect((await download(req(), context())).status).toBe(404);
    await expect(readFile(stored!.absolutePath)).rejects.toMatchObject({ code: "ENOENT" });
  });
});

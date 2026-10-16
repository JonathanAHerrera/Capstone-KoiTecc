import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createClient } from "@libsql/client";
import { afterAll, describe, expect, test } from "vitest";

// Env must be set before any module resolves the SQLite path.
const temporaryDirectory = mkdtempSync(path.join(tmpdir(), "migrate-test-"));
process.env.CMMC_DB_PATH = path.join(temporaryDirectory, "legacy.db");
process.env.CMMC_UPLOADS_DIR = path.join(temporaryDirectory, "uploads");

// The organizations table exactly as the pre-auth, single-org release created it: no user_id.
const LEGACY_ORGANIZATIONS_TABLE = `CREATE TABLE organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  target_level INTEGER NOT NULL,
  handles_cui INTEGER NOT NULL,
  employee_count TEXT NOT NULL,
  it_setup TEXT NOT NULL,
  has_it_provider INTEGER NOT NULL,
  created_at TEXT NOT NULL
)`;

describe("ensureSchema against a pre-auth database", () => {
  test("adds user_id to a legacy organizations table, builds the owner index, and keeps legacy rows", async () => {
    const databaseFilePath = process.env.CMMC_DB_PATH as string;
    const legacyClient = createClient({ url: `file:${databaseFilePath}` });
    await legacyClient.execute(LEGACY_ORGANIZATIONS_TABLE);
    await legacyClient.execute(
      `INSERT INTO organizations (id, name, target_level, handles_cui, employee_count, it_setup, has_it_provider, created_at)
       VALUES ('legacy-org', 'Legacy Co', 1, 0, '1-10', 'cloud', 0, '2025-10-01T00:00:00.000Z')`,
    );
    legacyClient.close();

    const { ensureSchema } = await import("@/db/migrate");
    const client = createClient({ url: `file:${databaseFilePath}` });
    await ensureSchema(client);

    const columns = await client.execute("PRAGMA table_info(organizations)");
    expect(columns.rows.map((row) => row.name)).toContain("user_id");

    const indexes = await client.execute(
      "SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = 'organizations'",
    );
    expect(indexes.rows.map((row) => row.name)).toContain("organizations_user_unique");

    const legacyRows = await client.execute("SELECT id, user_id FROM organizations WHERE id = 'legacy-org'");
    expect(legacyRows.rows).toHaveLength(1);
    expect(legacyRows.rows[0].user_id).toBeNull();

    // Running again is a no-op rather than a second ALTER.
    await expect(ensureSchema(client)).resolves.toBeUndefined();

    // The owner index enforces one org per user for new, owned rows.
    await client.execute(
      `INSERT INTO user (id, name, email) VALUES ('owner-1', 'Owner', 'owner@example.test')`,
    );
    const insertOwnedOrganization = (id: string) =>
      client.execute(
        `INSERT INTO organizations (id, user_id, name, target_level, handles_cui, employee_count, it_setup, has_it_provider, created_at)
         VALUES ('${id}', 'owner-1', 'Owned Co', 1, 0, '1-10', 'cloud', 0, '2026-01-01T00:00:00.000Z')`,
      );
    await insertOwnedOrganization("owned-org");
    await expect(insertOwnedOrganization("owned-org-2")).rejects.toThrow(/UNIQUE/);

    client.close();
  });

  test("the tenant-scoped reader never returns a legacy row with no owner", async () => {
    const { getOrganizationForUser } = await import("@/lib/org");
    expect(await getOrganizationForUser("owner-1")).not.toBeNull();
    expect(await getOrganizationForUser("someone-else")).toBeNull();
  });
});

afterAll(() => {
  rmSync(temporaryDirectory, { recursive: true, force: true });
});

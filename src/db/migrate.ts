import { mkdir } from "node:fs/promises";
import path from "node:path";
import type { Client } from "@libsql/client";

export function resolveDatabaseFilePath(): string {
  const overridePath = process.env.CMMC_DB_PATH;
  if (overridePath && overridePath.trim().length > 0) {
    return path.resolve(overridePath);
  }
  return path.join(process.cwd(), "data", "app.db");
}

export function resolveUploadsDirectoryPath(): string {
  const overridePath = process.env.CMMC_UPLOADS_DIR;
  if (overridePath && overridePath.trim().length > 0) {
    return path.resolve(overridePath);
  }
  return path.join(process.cwd(), "data", "uploads");
}

export async function ensureDataDirectoriesExist(): Promise<void> {
  await mkdir(path.dirname(resolveDatabaseFilePath()), { recursive: true });
  await mkdir(resolveUploadsDirectoryPath(), { recursive: true });
}

const CREATE_TABLE_STATEMENTS: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS organizations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    target_level INTEGER NOT NULL,
    handles_cui INTEGER NOT NULL,
    employee_count TEXT NOT NULL,
    it_setup TEXT NOT NULL,
    has_it_provider INTEGER NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS submissions (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    practice_id TEXT NOT NULL,
    status TEXT NOT NULL,
    note TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS submissions_org_practice_unique
    ON submissions (org_id, practice_id)`,
  `CREATE TABLE IF NOT EXISTS evidence_files (
    id TEXT PRIMARY KEY,
    submission_id TEXT NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    kind TEXT NOT NULL,
    original_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size_bytes INTEGER NOT NULL,
    storage_path TEXT NOT NULL,
    sha256 TEXT NOT NULL DEFAULT '',
    width INTEGER,
    height INTEGER,
    created_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS evidence_files_submission_idx
    ON evidence_files (submission_id)`,
  `CREATE TABLE IF NOT EXISTS reviews (
    id TEXT PRIMARY KEY,
    submission_id TEXT NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    verdict TEXT NOT NULL,
    confidence REAL NOT NULL,
    summary TEXT NOT NULL,
    objective_findings TEXT NOT NULL,
    missing_items TEXT NOT NULL,
    next_steps TEXT NOT NULL,
    reviewer_model TEXT NOT NULL,
    is_mock INTEGER NOT NULL,
    raw_response TEXT,
    created_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS reviews_submission_created_idx
    ON reviews (submission_id, created_at)`,
  `CREATE TABLE IF NOT EXISTS radar_profiles (
    org_id TEXT PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
    industries TEXT NOT NULL,
    naics_codes TEXT NOT NULL,
    keywords TEXT NOT NULL,
    technologies TEXT NOT NULL,
    government_contractor INTEGER NOT NULL,
    handles_sensitive_data INTEGER NOT NULL,
    texas_operations INTEGER NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS radar_decisions (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    item_id TEXT NOT NULL,
    decision TEXT NOT NULL,
    rationale TEXT NOT NULL,
    reviewer TEXT NOT NULL,
    source_title TEXT NOT NULL,
    source_url TEXT NOT NULL,
    decided_at TEXT NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS radar_decisions_org_item_unique
    ON radar_decisions (org_id, item_id)`,
];

// Columns added after the first release; CREATE TABLE IF NOT EXISTS skips existing
// tables, so each one is back-filled with ALTER TABLE when absent.
const ADDED_COLUMNS: readonly { table: string; column: string; definition: string }[] = [
  { table: "evidence_files", column: "sha256", definition: "TEXT NOT NULL DEFAULT ''" },
];

async function addMissingColumns(client: Client): Promise<void> {
  for (const added of ADDED_COLUMNS) {
    const tableInfo = await client.execute(`PRAGMA table_info(${added.table})`);
    const columnExists = tableInfo.rows.some((row) => row.name === added.column);
    if (!columnExists) {
      await client.execute(
        `ALTER TABLE ${added.table} ADD COLUMN ${added.column} ${added.definition}`,
      );
    }
  }
}

export async function ensureSchema(client: Client): Promise<void> {
  await ensureDataDirectoriesExist();
  await client.execute("PRAGMA journal_mode = WAL");
  await client.execute("PRAGMA foreign_keys = ON");
  for (const statement of CREATE_TABLE_STATEMENTS) {
    await client.execute(statement);
  }
  await addMissingColumns(client);
}

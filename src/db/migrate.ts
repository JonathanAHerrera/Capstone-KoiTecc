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
  // Better Auth tables. Dates are millisecond epochs (timestamp_ms mode in the drizzle schema),
  // so these columns are INTEGER. "user" must be created before anything that references it.
  `CREATE TABLE IF NOT EXISTS user (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'client',
    email_verified INTEGER NOT NULL DEFAULT 0,
    image TEXT,
    created_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)),
    updated_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)),
    two_factor_enabled INTEGER DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS session (
    id TEXT PRIMARY KEY,
    expires_at INTEGER NOT NULL,
    token TEXT NOT NULL UNIQUE,
    created_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)),
    updated_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)),
    ip_address TEXT,
    user_agent TEXT,
    user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS session_userId_idx ON session (user_id)`,
  `CREATE TABLE IF NOT EXISTS account (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    provider_id TEXT NOT NULL,
    user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
    access_token TEXT,
    refresh_token TEXT,
    id_token TEXT,
    access_token_expires_at INTEGER,
    refresh_token_expires_at INTEGER,
    scope TEXT,
    password TEXT,
    created_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)),
    updated_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer))
  )`,
  `CREATE INDEX IF NOT EXISTS account_userId_idx ON account (user_id)`,
  `CREATE TABLE IF NOT EXISTS verification (
    id TEXT PRIMARY KEY,
    identifier TEXT NOT NULL,
    value TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)),
    updated_at INTEGER NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer))
  )`,
  `CREATE INDEX IF NOT EXISTS verification_identifier_idx ON verification (identifier)`,
  `CREATE TABLE IF NOT EXISTS two_factor (
    id TEXT PRIMARY KEY,
    secret TEXT NOT NULL,
    backup_codes TEXT NOT NULL,
    user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
    verified INTEGER DEFAULT 1,
    failed_verification_count INTEGER DEFAULT 0,
    locked_until INTEGER
  )`,
  `CREATE INDEX IF NOT EXISTS twoFactor_secret_idx ON two_factor (secret)`,
  `CREATE INDEX IF NOT EXISTS twoFactor_userId_idx ON two_factor (user_id)`,
  `CREATE TABLE IF NOT EXISTS organizations (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    target_level INTEGER NOT NULL,
    handles_cui INTEGER NOT NULL,
    employee_count TEXT NOT NULL,
    it_setup TEXT NOT NULL,
    has_it_provider INTEGER NOT NULL,
    handles_texas_resident_data INTEGER NOT NULL DEFAULT 0,
    sells_to_state_of_texas INTEGER NOT NULL DEFAULT 0,
    texas_physical_presence INTEGER NOT NULL DEFAULT 0,
    processes_personal_data_at_scale INTEGER NOT NULL DEFAULT 0,
    industry TEXT NOT NULL DEFAULT 'other',
    takes_card_payments INTEGER NOT NULL DEFAULT 0,
    enabled_frameworks TEXT NOT NULL DEFAULT '["cmmc"]',
    created_at TEXT NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS organizations_user_unique
    ON organizations (user_id)`,
  `CREATE TABLE IF NOT EXISTS koitecc_associates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS organization_staff_assignments (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    associate_id TEXT NOT NULL REFERENCES koitecc_associates(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS organization_staff_assignment_unique
    ON organization_staff_assignments (organization_id, associate_id)`,
  `CREATE INDEX IF NOT EXISTS organization_staff_assignments_org_idx
    ON organization_staff_assignments (organization_id)`,
  `CREATE TABLE IF NOT EXISTS submissions (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    practice_id TEXT NOT NULL,
    framework TEXT,
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
  `CREATE TABLE IF NOT EXISTS audit_log (
    id TEXT PRIMARY KEY,
    org_id TEXT REFERENCES organizations(id) ON DELETE CASCADE,
    actor_user_id TEXT REFERENCES user(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    target_type TEXT,
    target_id TEXT,
    metadata TEXT,
    ip_address TEXT,
    created_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS audit_log_org_idx ON audit_log (org_id)`,
  `CREATE INDEX IF NOT EXISTS audit_log_actor_idx ON audit_log (actor_user_id)`,
  `CREATE TABLE IF NOT EXISTS framework_enrollments (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    framework TEXT NOT NULL,
    tier TEXT,
    overlays TEXT NOT NULL DEFAULT '[]',
    version TEXT,
    enrolled_at TEXT NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS framework_enrollments_org_framework_unique
    ON framework_enrollments (org_id, framework)`,
  `CREATE TABLE IF NOT EXISTS ledger_entries (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    seq INTEGER NOT NULL,
    type TEXT NOT NULL,
    control_id TEXT,
    evidence_sha256 TEXT,
    verdict TEXT,
    actor TEXT NOT NULL,
    model_id TEXT,
    prompt_version TEXT,
    metadata TEXT,
    prev_hash TEXT NOT NULL,
    entry_hash TEXT NOT NULL,
    external_timestamp TEXT,
    created_at TEXT NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS ledger_entries_org_seq_unique
    ON ledger_entries (org_id, seq)`,
  `CREATE TABLE IF NOT EXISTS incidents (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    kind TEXT NOT NULL,
    discovered_at TEXT NOT NULL,
    affected_texas_residents INTEGER,
    status TEXT NOT NULL DEFAULT 'open',
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS incidents_org_idx ON incidents (org_id)`,
  `CREATE TABLE IF NOT EXISTS reviewer_tasks (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    kind TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    summary TEXT NOT NULL,
    detail TEXT,
    related_incident_id TEXT REFERENCES incidents(id) ON DELETE SET NULL,
    requested_by_user_id TEXT REFERENCES user(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS reviewer_tasks_org_idx ON reviewer_tasks (org_id)`,
  `CREATE TABLE IF NOT EXISTS interviews (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    framework TEXT NOT NULL DEFAULT 'cmmc',
    family_code TEXT NOT NULL,
    level INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS interviews_org_idx ON interviews (org_id)`,
  `CREATE TABLE IF NOT EXISTS interview_turns (
    id TEXT PRIMARY KEY,
    interview_id TEXT NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
    seq INTEGER NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    proposed_findings TEXT,
    created_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS interview_turns_interview_idx ON interview_turns (interview_id)`,
  `CREATE TABLE IF NOT EXISTS interview_findings (
    id TEXT PRIMARY KEY,
    interview_id TEXT NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
    org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    practice_id TEXT NOT NULL,
    status TEXT NOT NULL,
    source TEXT NOT NULL,
    rationale TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS interview_findings_org_idx ON interview_findings (org_id)`,
  `CREATE INDEX IF NOT EXISTS interview_findings_interview_idx ON interview_findings (interview_id)`,
];

// Columns added after the first release; CREATE TABLE IF NOT EXISTS skips existing
// tables, so each one is back-filled with ALTER TABLE when absent.
const ADDED_COLUMNS: readonly { table: string; column: string; definition: string }[] = [
  { table: "user", column: "role", definition: "TEXT NOT NULL DEFAULT 'client'" },
  // Databases created before auth have an organizations table with no owner column. SQLite cannot
  // add a NOT NULL foreign-key column to an existing table, so legacy rows keep NULL here; no user
  // can own them, and every tenant query filters by user_id, so they are simply unreachable.
  {
    table: "organizations",
    column: "user_id",
    definition: "TEXT REFERENCES user(id) ON DELETE CASCADE",
  },
  { table: "evidence_files", column: "sha256", definition: "TEXT NOT NULL DEFAULT ''" },
  {
    table: "organizations",
    column: "handles_texas_resident_data",
    definition: "INTEGER NOT NULL DEFAULT 0",
  },
  {
    table: "organizations",
    column: "sells_to_state_of_texas",
    definition: "INTEGER NOT NULL DEFAULT 0",
  },
  {
    table: "organizations",
    column: "texas_physical_presence",
    definition: "INTEGER NOT NULL DEFAULT 0",
  },
  {
    table: "organizations",
    column: "processes_personal_data_at_scale",
    definition: "INTEGER NOT NULL DEFAULT 0",
  },
  {
    table: "organizations",
    column: "industry",
    definition: "TEXT NOT NULL DEFAULT 'other'",
  },
  {
    table: "organizations",
    column: "takes_card_payments",
    definition: "INTEGER NOT NULL DEFAULT 0",
  },
  {
    table: "organizations",
    column: "enabled_frameworks",
    definition: `TEXT NOT NULL DEFAULT '["cmmc"]'`,
  },
  { table: "submissions", column: "framework", definition: "TEXT" },
];

async function addMissingColumns(client: Client): Promise<void> {
  for (const added of ADDED_COLUMNS) {
    const tableInfo = await client.execute(`PRAGMA table_info(${added.table})`);
    // No rows means the table does not exist yet; CREATE TABLE creates it with the column included.
    if (tableInfo.rows.length === 0) continue;
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
  // Back-fill columns before the CREATE statements: some of those are indexes over added columns
  // (organizations_user_unique over user_id) and fail against a table created before the column.
  await addMissingColumns(client);
  for (const statement of CREATE_TABLE_STATEMENTS) {
    await client.execute(statement);
  }
}

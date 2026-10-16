import { mkdirSync } from "node:fs";
import path from "node:path";
import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import * as schema from "@/db/schema";
import { ensureSchema, resolveDatabaseFilePath } from "@/db/migrate";

export type Database = LibSQLDatabase<typeof schema>;

type DatabaseSingleton = {
  databaseFilePath: string;
  libsqlClient: Client;
  database: Database;
  schemaReady: Promise<void>;
};

// Stored on globalThis so Next.js dev hot-reload reuses one connection instead of
// opening a new SQLite handle on every module re-evaluation.
const globalWithDatabase = globalThis as typeof globalThis & {
  __cmmcDatabaseSingleton?: DatabaseSingleton;
};

function createDatabaseSingleton(): DatabaseSingleton {
  const databaseFilePath = resolveDatabaseFilePath();
  // libsql opens the file synchronously here, before ensureSchema's async mkdir runs.
  mkdirSync(path.dirname(databaseFilePath), { recursive: true });
  const libsqlClient = createClient({ url: `file:${databaseFilePath}` });
  const database = drizzle(libsqlClient, { schema });
  const schemaReady = ensureSchema(libsqlClient);
  return { databaseFilePath, libsqlClient, database, schemaReady };
}

function getDatabaseSingleton(): DatabaseSingleton {
  const expectedFilePath = resolveDatabaseFilePath();
  const existingSingleton = globalWithDatabase.__cmmcDatabaseSingleton;
  if (existingSingleton && existingSingleton.databaseFilePath === expectedFilePath) {
    return existingSingleton;
  }
  const singleton = createDatabaseSingleton();
  globalWithDatabase.__cmmcDatabaseSingleton = singleton;
  return singleton;
}

export async function getDb(): Promise<Database> {
  const singleton = getDatabaseSingleton();
  await singleton.schemaReady;
  return singleton.database;
}

// Better Auth's drizzle adapter needs the drizzle instance synchronously at config time.
// Schema creation is kicked off by getDatabaseSingleton(); awaitSchemaReady() lets the auth
// route handler block on it before serving the first request against a fresh database.
export function getDrizzleSync(): Database {
  return getDatabaseSingleton().database;
}

export function awaitSchemaReady(): Promise<void> {
  return getDatabaseSingleton().schemaReady;
}

export function nowIsoTimestamp(): string {
  return new Date().toISOString();
}

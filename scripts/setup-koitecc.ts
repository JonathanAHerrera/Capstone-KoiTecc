import { createClient } from "@libsql/client";
import { ensureSchema } from "@/db/migrate";

const administratorEmail = process.argv[2]?.trim().toLowerCase();
if (!administratorEmail || !administratorEmail.includes("@")) {
  console.error("Usage: pnpm koitecc:setup -- administrator@example.com");
  process.exit(1);
}

const databasePath = process.env.CMMC_DB_PATH ?? "data/app.db";
const client = createClient({ url: `file:${databasePath}` });
async function setupKoiTecc(): Promise<void> {
  try {
    await ensureSchema(client);
    const administrator = await client.execute({
      sql: "UPDATE user SET role = 'admin' WHERE lower(email) = ?",
      args: [administratorEmail],
    });
    if (administrator.rowsAffected === 0) {
      throw new Error(`No user exists for ${administratorEmail}. Create the account first, then run this command again.`);
    }

    console.log(`KoiTecc administrator enabled for ${administratorEmail}.`);
  } finally {
    client.close();
  }
}

void setupKoiTecc().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

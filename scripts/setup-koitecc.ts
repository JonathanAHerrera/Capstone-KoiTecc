import { createClient } from "@libsql/client";
import { nanoid } from "nanoid";
import { ensureSchema } from "@/db/migrate";

const administratorEmail = process.argv[2]?.trim().toLowerCase();
if (!administratorEmail || !administratorEmail.includes("@")) {
  console.error("Usage: pnpm koitecc:setup -- administrator@example.com");
  process.exit(1);
}

const databasePath = process.env.CMMC_DB_PATH ?? "data/app.db";
const client = createClient({ url: `file:${databasePath}` });
const associates = [
  { name: "Jordan Lee", email: "jordan.lee@koitecc.example", title: "Cybersecurity Associate" },
  { name: "Morgan Patel", email: "morgan.patel@koitecc.example", title: "Readiness Advisor" },
  { name: "Taylor Brooks", email: "taylor.brooks@koitecc.example", title: "CMMC Program Associate" },
];

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

    for (const associate of associates) {
      await client.execute({
        sql: `INSERT INTO koitecc_associates (id, name, email, title, active, created_at)
          VALUES (?, ?, ?, ?, 1, ?)
          ON CONFLICT(email) DO UPDATE SET name = excluded.name, title = excluded.title, active = 1`,
        args: [nanoid(), associate.name, associate.email, associate.title, new Date().toISOString()],
      });
    }

    console.log(`KoiTecc administrator enabled for ${administratorEmail}.`);
    console.log(`Seeded ${associates.length} active KoiTecc associates.`);
  } finally {
    client.close();
  }
}

void setupKoiTecc().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

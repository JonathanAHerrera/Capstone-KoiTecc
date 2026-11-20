import { unlink } from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { resolveUploadsDirectoryPath } from "@/db/migrate";
import {
  evidenceFiles,
  organizations,
  submissions,
} from "@/db/schema";
import { requireOrganization } from "@/lib/org";

// Reset only the authenticated owner's organization. ensureSchema enables SQLite
// foreign keys, so ON DELETE CASCADE removes this tenant's dependent records only.
export async function resetAllData(): Promise<void> {
  const organization = await requireOrganization();
  const db = await getDb();

  const uploadsDirectory = resolveUploadsDirectoryPath();
  const storedEvidence = await db.select({ storagePath: evidenceFiles.storagePath }).from(evidenceFiles)
    .innerJoin(submissions, eq(evidenceFiles.submissionId, submissions.id))
    .where(eq(submissions.orgId, organization.id));
  const targets = storedEvidence.map((evidence) => {
    const target = path.resolve(uploadsDirectory, evidence.storagePath);
    const relative = path.relative(path.resolve(uploadsDirectory), target);
    if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("Invalid evidence storage path.");
    return target;
  });
  for (const target of targets) {
    try {
      await unlink(target);
    } catch (error) {
      const isAlreadyGone = (error as NodeJS.ErrnoException).code === "ENOENT";
      if (!isAlreadyGone) throw error;
    }
  }

  await db.delete(organizations).where(eq(organizations.id, organization.id));
}

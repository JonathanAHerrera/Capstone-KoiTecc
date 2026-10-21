import { unlink } from "node:fs/promises";
import path from "node:path";
import { getDb } from "@/db/client";
import { resolveUploadsDirectoryPath } from "@/db/migrate";
import {
  evidenceFiles,
  incidents,
  interviewFindings,
  interviews,
  interviewTurns,
  organizations,
  radarDecisions,
  radarProfiles,
  reviewerTasks,
  reviews,
  submissions,
} from "@/db/schema";

// Wipes every row and every uploaded evidence file so the app returns to a fresh,
// pre-onboarding state. Primarily a testing aid: the single-org MVP has no auth, and
// libsql does not enforce the ON DELETE CASCADE foreign keys, so each table is cleared
// explicitly (child tables first).
export async function resetAllData(): Promise<void> {
  const db = await getDb();

  const uploadsDirectory = resolveUploadsDirectoryPath();
  const storedEvidence = await db.select({ storagePath: evidenceFiles.storagePath }).from(evidenceFiles);
  for (const evidence of storedEvidence) {
    try {
      await unlink(path.join(uploadsDirectory, evidence.storagePath));
    } catch (error) {
      const isAlreadyGone = (error as NodeJS.ErrnoException).code === "ENOENT";
      if (!isAlreadyGone) throw error;
    }
  }

  await db.delete(interviewFindings);
  await db.delete(interviewTurns);
  await db.delete(interviews);
  await db.delete(reviewerTasks);
  await db.delete(incidents);
  await db.delete(radarDecisions);
  await db.delete(radarProfiles);
  await db.delete(reviews);
  await db.delete(evidenceFiles);
  await db.delete(submissions);
  await db.delete(organizations);
}

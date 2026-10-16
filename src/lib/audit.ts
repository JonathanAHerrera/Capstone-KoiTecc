import { nanoid } from "nanoid";
import { getDb, nowIsoTimestamp } from "@/db/client";
import { auditLog, type AuditLogRow } from "@/db/schema";

export type AuditEvent = {
  action: string;
  orgId?: string | null;
  actorUserId?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
};

// Append-only. Writes never throw into the caller: an audit failure should not take down the
// action being audited, so it is logged and swallowed.
export async function recordAuditEvent(event: AuditEvent): Promise<void> {
  try {
    const db = await getDb();
    await db.insert(auditLog).values({
      id: nanoid(),
      orgId: event.orgId ?? null,
      actorUserId: event.actorUserId ?? null,
      action: event.action,
      targetType: event.targetType ?? null,
      targetId: event.targetId ?? null,
      metadata: event.metadata ? JSON.stringify(event.metadata) : null,
      ipAddress: event.ipAddress ?? null,
      createdAt: nowIsoTimestamp(),
    });
  } catch (error) {
    console.error("recordAuditEvent failed", { action: event.action, error });
  }
}

export async function listAuditEventsForOrg(orgId: string): Promise<AuditLogRow[]> {
  const db = await getDb();
  const { eq, desc } = await import("drizzle-orm");
  return db.select().from(auditLog).where(eq(auditLog.orgId, orgId)).orderBy(desc(auditLog.createdAt));
}

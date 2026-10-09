import { AuditLog } from "../models/AuditLog";

type AuditEvent = {
  action: string;
  targetType: string;
  targetId?: string;
  targetName: string;
  details?: string;
};

export async function createAuditLog(
  actor: Express.AuthUser,
  event: AuditEvent,
): Promise<void> {
  await AuditLog.create({
    actorId: actor.id,
    actorName: actor.fullName,
    actorEmail: actor.email,
    actorRole: actor.role,
    ...event,
  });
}

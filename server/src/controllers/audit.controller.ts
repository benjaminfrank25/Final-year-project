import { z } from "zod";
import { AuditLog } from "../models/AuditLog";
import { asyncHandler } from "../utils/asyncHandler";

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const listAuditLogs = asyncHandler(async (req, res) => {
  const { page, limit } = querySchema.parse(req.query);
  const filter = {};
  const [total, logs] = await Promise.all([
    AuditLog.countDocuments(filter),
    AuditLog.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
  ]);

  res.json({
    logs: logs.map((entry) => ({
      id: String(entry._id),
      actorName: entry.actorName,
      actorEmail: entry.actorEmail,
      actorRole: entry.actorRole,
      action: entry.action,
      targetType: entry.targetType,
      targetId: entry.targetId,
      targetName: entry.targetName,
      details: entry.details,
      createdAt: entry.createdAt,
    })),
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  });
});

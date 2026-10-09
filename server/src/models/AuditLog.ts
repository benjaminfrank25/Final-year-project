import { Schema, Types, model } from "mongoose";
import { Role } from "./User";

export interface IAuditLog {
  actorId: Types.ObjectId;
  actorName: string;
  actorEmail: string;
  actorRole: Role;
  action: string;
  targetType: string;
  targetId?: string;
  targetName: string;
  details?: string;
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    actorId: { type: Schema.Types.ObjectId, required: true, index: true },
    actorName: { type: String, required: true },
    actorEmail: { type: String, required: true },
    actorRole: { type: String, enum: ["student", "rep", "admin"], required: true },
    action: { type: String, required: true, index: true },
    targetType: { type: String, required: true },
    targetId: { type: String },
    targetName: { type: String, required: true },
    details: { type: String, maxlength: 1000 },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

auditLogSchema.index({ createdAt: -1 });

export const AuditLog = model<IAuditLog>("AuditLog", auditLogSchema);

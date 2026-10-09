import mongoose from "mongoose";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { Level, User } from "../models/User";
import { serializeStudent } from "./admin.controller";
import { createAuditLog } from "../utils/audit";

const decisionSchema = z
  .object({
    status: z.enum(["active", "rejected"]),
  })
  .strict();

function getRepLevel(level: Level | undefined): Level {
  if (level === undefined) {
    throw new ApiError(403, "Course rep account is not assigned to a level");
  }
  return level;
}

export const listLevelApplications = asyncHandler(async (req, res) => {
  const level = getRepLevel(req.user?.level);
  const students = await User.find({
    role: "student",
    level,
    status: "pending",
  }).sort({ createdAt: -1 });

  res.json({
    count: students.length,
    students: students.map(serializeStudent),
  });
});

export const approveAllLevelApplications = asyncHandler(async (req, res) => {
  const level = getRepLevel(req.user?.level);
  const result = await User.updateMany(
    { role: "student", level, status: "pending" },
    { $set: { status: "active" } },
  );
  await createAuditLog(req.user!, {
    action: "students.approved.bulk",
    targetType: "user",
    targetName: `${result.modifiedCount} students`,
    details: `Approved ${result.modifiedCount} pending student(s) in ${level} Level`,
  });

  res.json({ approvedCount: result.modifiedCount });
});

export const decideLevelApplication = asyncHandler(async (req, res) => {
  const id = String(req.params.id);
  if (!mongoose.isValidObjectId(id)) {
    throw new ApiError(400, "Invalid student id");
  }

  const level = getRepLevel(req.user?.level);
  const { status } = decisionSchema.parse(req.body);
  const student = await User.findOneAndUpdate(
    {
      _id: id,
      role: "student",
      level,
      status: "pending",
    },
    { $set: { status } },
    { new: true, runValidators: true },
  );

  if (!student) throw new ApiError(404, "Pending registration not found");
  await createAuditLog(req.user!, {
    action: `student.${status}`,
    targetType: "user",
    targetId: String(student._id),
    targetName: `${student.fullName} (${student.email})`,
    details: `${status === "active" ? "Approved" : "Rejected"} for ${level} Level`,
  });

  res.json({ student: serializeStudent(student) });
});

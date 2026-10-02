import mongoose from "mongoose";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { isValidLevel } from "../utils/access";
import { Level, Role, STATUSES, Status, User } from "../models/User";

const MANAGED_ROLES: Role[] = ["student", "rep"];

interface StudentLike {
  _id: unknown;
  fullName: string;
  email: string;
  role: Role;
  level?: Level;
  status: Status;
  createdAt: Date;
}

function serializeStudent(s: StudentLike) {
  return {
    id: String(s._id),
    fullName: s.fullName,
    email: s.email,
    role: s.role,
    level: s.level,
    status: s.status,
    createdAt: s.createdAt,
  };
}

const levelSchema = z
  .number()
  .refine(isValidLevel, "Level must be 100, 200, 300, 400 or 500");

const listQuerySchema = z.object({
  status: z.enum(STATUSES).optional(),
  level: z.coerce.number().refine(isValidLevel, "Invalid level").optional(),
});

const updateSchema = z
  .object({
    status: z.enum(STATUSES).optional(),
    level: levelSchema.optional(),
    // Only these two: there is no way to create an admin through the API
    role: z.enum(["student", "rep"]).optional(),
  })
  .refine(
    (d) =>
      d.status !== undefined || d.level !== undefined || d.role !== undefined,
    "Provide a status, level and/or role to update",
  );

export const listStudents = asyncHandler(async (req, res) => {
  const query = listQuerySchema.parse(req.query);

  const filter: { role: { $in: Role[] }; status?: Status; level?: Level } = {
    role: { $in: MANAGED_ROLES },
  };
  if (query.status) filter.status = query.status;
  if (query.level) filter.level = query.level as Level;

  const students = await User.find(filter).sort({ createdAt: -1 });

  res.json({
    count: students.length,
    students: students.map(serializeStudent),
  });
});

export const updateStudent = asyncHandler(async (req, res) => {
  const id = String(req.params.id);
  if (!mongoose.isValidObjectId(id)) {
    throw new ApiError(400, "Invalid student id");
  }

  const data = updateSchema.parse(req.body);

  const student = await User.findOne({
    _id: id,
    role: { $in: MANAGED_ROLES },
  });
  if (!student) throw new ApiError(404, "Student not found");

  if (data.status !== undefined) student.status = data.status;
  if (data.level !== undefined) student.level = data.level as Level;
  if (data.role !== undefined) student.role = data.role;

  // Course reps must be active students
  if (student.role === "rep" && student.status !== "active") {
    if (data.role === "rep") {
      throw new ApiError(
        400,
        "Approve the student before making them a course rep",
      );
    }
    student.role = "student";
  }

  await student.save();

  res.json({ student: serializeStudent(student) });
});

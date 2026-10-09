import mongoose from "mongoose";
import type { RequestHandler } from "express";
import ExcelJS from "exceljs";
import { Readable } from "node:stream";
import path from "node:path";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { isValidLevel } from "../utils/access";
import { Level, Role, STATUSES, Status, User } from "../models/User";
import { createAuditLog } from "../utils/audit";
import { log } from "../utils/logger";

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

export { serializeStudent };

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

const importLevelSchema = z.coerce
  .number()
  .refine(isValidLevel, "Level must be 100, 200, 300, 400 or 500");

const importStudentSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(50),
  lastName: z.string().trim().min(1, "Last name is required").max(50),
  registrationNumber: z
    .string()
    .trim()
    .min(8, "Registration number must be at least 8 characters")
    .max(72, "Registration number must be at most 72 characters"),
  email: z.string().trim().toLowerCase().email("Invalid student email"),
});

type ImportFailure = {
  row: number;
  email?: string;
  message: string;
};

function normalizeHeader(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function findColumn(headers: string[], names: string[]): number {
  return headers.findIndex((header) => names.includes(header));
}

function isRegistrationNumberHeader(header: string): boolean {
  const normalized = header.replace(/^student/, "");
  return /^(reg|registration)(no|num|number|id)?$/.test(normalized) ||
    [
      "studentnumber",
      "studentid",
      "matricno",
      "matricnum",
      "matricnumber",
      "matriculationnumber",
    ].includes(header);
}

function getCellText(cell: ExcelJS.Cell): string {
  if (typeof cell.value === "number" && /^0+$/.test(cell.numFmt)) {
    return String(cell.value).padStart(cell.numFmt.length, "0");
  }
  return cell.text;
}

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === 11000
  );
}

export const importStudents: RequestHandler = async (req, res, next) => {
  let streaming = false;
  let createdCount = 0;
  let parsedCount = 0;
  const failures: ImportFailure[] = [];
  const sendProgress = (
    progress: {
      stage: string;
      message: string;
      parsedCount?: number;
      createdCount?: number;
      totalCount?: number;
      failedCount?: number;
    },
  ) => {
    res.write(`${JSON.stringify({ type: "progress", ...progress })}\n`);
  };

  try {
    if (!req.file) {
      throw new ApiError(400, "Choose a CSV or Excel file to upload");
    }

    const level = importLevelSchema.parse(req.body.level) as Level;
    const workbook = new ExcelJS.Workbook();
    try {
      const stream = Readable.from([req.file.buffer]);
      if (path.extname(req.file.originalname).toLowerCase() === ".csv") {
        await workbook.csv.read(stream, { map: (value) => value });
      } else {
        await workbook.xlsx.read(stream);
      }
    } catch {
      throw new ApiError(400, "The uploaded file could not be read");
    }

    const worksheet = workbook.worksheets[0];
    if (!worksheet) throw new ApiError(400, "The uploaded file is empty");

    const headers: string[] = [];
    worksheet.getRow(1).eachCell({ includeEmpty: false }, (cell, column) => {
      headers[column - 1] = normalizeHeader(getCellText(cell));
    });

    const firstNameColumn = findColumn(headers, ["firstname", "first"]);
    const lastNameColumn = findColumn(headers, ["lastname", "last", "surname"]);
    const nameColumn = findColumn(headers, [
      "name",
      "names",
      "studentname",
      "studentnames",
      "fullname",
    ]);
    const columns = {
      firstName: firstNameColumn,
      lastName: lastNameColumn,
      name: nameColumn,
      registrationNumber: headers.findIndex(isRegistrationNumberHeader),
      email: findColumn(headers, ["email", "studentemail"]),
    };

    const hasSeparateNames = firstNameColumn >= 0 && lastNameColumn >= 0;
    if (
      (!hasSeparateNames && nameColumn < 0) ||
      columns.registrationNumber < 0 ||
      columns.email < 0
    ) {
      throw new ApiError(
        400,
        "Include first and last name columns or a name column, a registration number column and a student email column",
      );
    }

    res.status(200);
    res.set({
      "Cache-Control": "no-cache, no-transform",
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "X-Accel-Buffering": "no",
    });
    res.flushHeaders();
    streaming = true;
    sendProgress({
      stage: "parsing",
      message: "Checking populated student rows...",
      parsedCount: 0,
      createdCount: 0,
    });

    const rowLimitReached = Symbol("row limit reached");
    const studentRows: ExcelJS.Row[] = [];
    const dataColumns = [
      ...(hasSeparateNames
        ? [columns.firstName, columns.lastName]
        : [columns.name]),
      columns.registrationNumber,
      columns.email,
    ];
    try {
      worksheet.eachRow({ includeEmpty: false }, (row) => {
        if (row.number === 1) return;
        const hasStudentData = dataColumns.some(
          (column) => getCellText(row.getCell(column + 1)).trim() !== "",
        );
        if (!hasStudentData) return;

        studentRows.push(row);
        if (studentRows.length > 500) throw rowLimitReached;
      });
    } catch (error) {
      if (error !== rowLimitReached) throw error;
      throw new ApiError(
        400,
        "This class list contains more than 500 non-empty student rows. Split it into smaller uploads.",
      );
    }

    if (studentRows.length === 0) {
      throw new ApiError(400, "The uploaded file contains no student rows");
    }

    sendProgress({
      stage: "parsing",
      message: `Found ${studentRows.length} student row${studentRows.length === 1 ? "" : "s"}. Validating student details...`,
      parsedCount: 0,
      totalCount: studentRows.length,
      createdCount: 0,
    });

    const parsedRows: {
      row: number;
      email: string;
      fullName: string;
      password: string;
    }[] = [];
    const seenEmails = new Set<string>();

    for (const [index, row] of studentRows.entries()) {
      parsedCount = index + 1;
      const cellText = (column: number) =>
        column < 0 ? "" : getCellText(row.getCell(column + 1));
      const emailValue = cellText(columns.email).trim();
      let firstName: string;
      let lastName: string;
      if (hasSeparateNames) {
        firstName = cellText(columns.firstName);
        lastName = cellText(columns.lastName);
      } else {
        const [nameLast, nameFirst] = cellText(columns.name)
          .trim()
          .split(/\s+/);
        firstName = nameFirst ?? "";
        lastName = nameLast ?? "";
      }

      const parsed = importStudentSchema.safeParse({
        firstName,
        lastName,
        registrationNumber: cellText(columns.registrationNumber),
        email: emailValue,
      });
      if (!parsed.success) {
        failures.push({
          row: row.number,
          email: emailValue || undefined,
          message: parsed.error.issues[0]?.message ?? "Invalid student details",
        });
      } else {
        const email = parsed.data.email;
        const fullName = `${parsed.data.firstName} ${parsed.data.lastName}`;
        if (fullName.length > 100) {
          failures.push({
            row: row.number,
            email,
            message:
              "First and last name must be 100 characters or fewer combined",
          });
        } else if (seenEmails.has(email)) {
          failures.push({
            row: row.number,
            email,
            message: "This email appears more than once in the file",
          });
        } else {
          seenEmails.add(email);
          parsedRows.push({
            row: row.number,
            email,
            fullName,
            password: parsed.data.registrationNumber,
          });
        }
      }

      if (parsedCount % 25 === 0 || parsedCount === studentRows.length) {
        sendProgress({
          stage: "parsing",
          message: `Validated ${parsedCount} of ${studentRows.length} student rows...`,
          parsedCount,
          totalCount: studentRows.length,
          createdCount: 0,
          failedCount: failures.length,
        });
        await new Promise<void>((resolve) => setImmediate(resolve));
      }
    }

    sendProgress({
      stage: "checking",
      message: `Checking ${parsedRows.length} valid student email${parsedRows.length === 1 ? "" : "s"} for existing accounts...`,
      parsedCount,
      totalCount: studentRows.length,
      createdCount: 0,
      failedCount: failures.length,
    });
    const existingEmails = new Set(
      (
        await User.find({
          email: { $in: parsedRows.map((student) => student.email) },
        })
          .select("email")
          .lean()
      ).map((user) => user.email),
    );
    const toCreate = parsedRows.filter((student) => {
      if (!existingEmails.has(student.email)) return true;
      failures.push({
        row: student.row,
        email: student.email,
        message: "This email is already registered",
      });
      return false;
    });

    sendProgress({
      stage: "creating",
      message: `Creating ${toCreate.length} student account${toCreate.length === 1 ? "" : "s"}...`,
      parsedCount,
      totalCount: studentRows.length,
      createdCount,
      failedCount: failures.length,
    });
    for (let start = 0; start < toCreate.length; start += 5) {
      const batch = toCreate.slice(start, start + 5);
      const outcomes = await Promise.allSettled(
        batch.map((student) =>
          User.create({
            fullName: student.fullName,
            email: student.email,
            password: student.password,
            level,
            role: "student",
            status: "active",
          }),
        ),
      );
      let unexpectedError: unknown;

      outcomes.forEach((outcome, index) => {
        const student = batch[index];
        if (outcome.status === "fulfilled") {
          createdCount += 1;
        } else if (isDuplicateKeyError(outcome.reason)) {
          failures.push({
            row: student.row,
            email: student.email,
            message: "This email is already registered",
          });
        } else {
          unexpectedError ??= outcome.reason;
        }
      });

      sendProgress({
        stage: "creating",
        message: `Created ${createdCount} of ${toCreate.length} student accounts...`,
        parsedCount,
        totalCount: studentRows.length,
        createdCount,
        failedCount: failures.length,
      });
      if (unexpectedError) throw unexpectedError;
    }

    if (createdCount > 0) {
      await createAuditLog(req.user!, {
        action: "students.imported",
        targetType: "user",
        targetName: "Class list registration",
        details: `${createdCount} student account${createdCount === 1 ? "" : "s"} created; ${failures.length} row${failures.length === 1 ? "" : "s"} not imported`,
      });
    }

    const result = {
      parsedCount,
      createdCount,
      failedCount: failures.length,
      failures: failures.sort((a, b) => a.row - b.row),
    };
    res.write(`${JSON.stringify({ type: "result", result })}\n`);
    res.end();
  } catch (error) {
    if (!streaming) {
      next(error);
      return;
    }

    const message =
      error instanceof ApiError
        ? error.message
        : "The import stopped unexpectedly. Check the created count and try again.";
    if (!(error instanceof ApiError)) log.error("Student class-list import failed", error);
    if (res.destroyed) return;
    res.write(
      `${JSON.stringify({ type: "error", message, parsedCount, createdCount })}\n`,
    );
    res.end();
  }
};

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

  const previous = {
    status: student.status,
    level: student.level,
    role: student.role,
  };
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
  const changes = [
    student.status !== previous.status
      ? `status ${previous.status} → ${student.status}`
      : "",
    student.level !== previous.level
      ? `level ${previous.level ?? "unassigned"} → ${student.level ?? "unassigned"}`
      : "",
    student.role !== previous.role
      ? `role ${previous.role} → ${student.role}`
      : "",
  ].filter(Boolean);
  await createAuditLog(req.user!, {
    action: changes.some((change) => change.startsWith("status"))
      ? `student.${student.status}`
      : "student.updated",
    targetType: "user",
    targetId: String(student._id),
    targetName: `${student.fullName} (${student.email})`,
    details: changes.join("; ") || "No account fields changed",
  });

  res.json({ student: serializeStudent(student) });
});

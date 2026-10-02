import fs from "node:fs/promises";
import path from "node:path";
import mongoose from "mongoose";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { canAccessLevel, canManageLevel, isValidLevel } from "../utils/access";
import { looksLikeMaterialFile, removeFile } from "../utils/files";
import { MATERIAL_DIR } from "../config/storage";
import { generateMaterialDescription } from "../services/aiDescription";
import {
  MATERIAL_CATEGORIES,
  MATERIAL_SEMESTERS,
  Material,
  MaterialCategory,
  MaterialSemester,
} from "../models/Material";
import { Level, User } from "../models/User";

interface MaterialLike {
  _id: unknown;
  title: string;
  description?: string;
  lecturerName?: string;
  courseCode: string;
  level: Level;
  semester?: MaterialSemester;
  category?: MaterialCategory;
  originalName: string;
  size: number;
  createdAt: Date;
}

export function serializeMaterial(m: MaterialLike, uploadedByName?: string) {
  return {
    id: String(m._id),
    title: m.title,
    description: m.description,
    courseCode: m.courseCode,
    level: m.level,
    semester: m.semester ?? "harmattan",
    category: m.category ?? "lecture-note",
    lecturerName: m.lecturerName,
    originalName: m.originalName,
    size: m.size,
    createdAt: m.createdAt,
    uploadedByName,
  };
}

async function uploaderNames(
  items: { uploadedBy: mongoose.Types.ObjectId }[],
): Promise<Map<string, string>> {
  const ids = [...new Set(items.map((m) => String(m.uploadedBy)))];
  const users = await User.find({ _id: { $in: ids } }).select("fullName");
  return new Map(
    users.map((u) => [String(u._id), u.fullName] as [string, string]),
  );
}

const levelField = z.coerce
  .number()
  .refine(isValidLevel, "Level must be 100, 200, 300, 400 or 500");

const createSchema = z.object({
  title: z.string().trim().min(2, "Title is too short").max(150),
  courseCode: z.string().trim().min(3, "Course code is too short").max(15),
  level: levelField,
  semester: z.enum(MATERIAL_SEMESTERS),
  category: z.enum(MATERIAL_CATEGORIES).default("lecture-note"),
  description: z.string().trim().max(1000).optional(),
  lecturerName: z.string().trim().max(100).optional(),
});

const updateSchema = z
  .object({
    title: z.string().trim().min(2, "Title is too short").max(150).optional(),
    courseCode: z
      .string()
      .trim()
      .min(3, "Course code is too short")
      .max(15)
      .optional(),
    level: levelField.optional(),
    semester: z.enum(MATERIAL_SEMESTERS).optional(),
    category: z.enum(MATERIAL_CATEGORIES).optional(),
    description: z.string().trim().max(1000).optional(),
    lecturerName: z.string().trim().max(100).optional(),
  })
  .refine(
    (d) => Object.values(d).some((v) => v !== undefined),
    "Nothing to update",
  );

const descriptionSchema = z.object({
  text: z
    .string()
    .trim()
    .min(40, "This PDF does not contain enough selectable text to describe")
    .max(70_000, "Too much text to describe"),
  title: z.string().trim().max(150).optional(),
  courseCode: z.string().trim().max(15).optional(),
  category: z.enum(MATERIAL_CATEGORIES).optional(),
  lecturerName: z.string().trim().max(100).optional(),
});

const listSchema = z.object({
  level: z.coerce.number().refine(isValidLevel, "Invalid level").optional(),
  semester: z.enum(MATERIAL_SEMESTERS).optional(),
  courseCode: z.string().trim().max(15).optional(),
  category: z.enum(MATERIAL_CATEGORIES).optional(),
  lecturerName: z.string().trim().max(100).optional(),
});

function assertValidId(id: string): void {
  if (!mongoose.isValidObjectId(id)) {
    throw new ApiError(400, "Invalid material id");
  }
}

// Admins can manage any level, course reps only their own
function assertCanManage(user: Express.AuthUser, level: number): void {
  if (!canManageLevel(user, level)) {
    throw new ApiError(403, "You can only manage materials for your own level");
  }
}

export const createMaterial = asyncHandler(async (req, res) => {
  const file = req.file;
  if (!file) {
    throw new ApiError(
      400,
      "A PDF, Word (.docx), or PowerPoint (.pptx) file is required (form field name: file)",
    );
  }

  try {
    if (!req.user) throw new ApiError(401, "Not authenticated");

    const data = createSchema.parse(req.body);

    // A course rep can only upload to their own level
    assertCanManage(req.user, data.level);

    if (!(await looksLikeMaterialFile(file.path))) {
      throw new ApiError(
        400,
        "That file is not a valid PDF, Word, or PowerPoint document",
      );
    }

    const material = await Material.create({
      title: data.title,
      description: data.description || undefined,
      lecturerName: data.lecturerName || undefined,
      courseCode: data.courseCode,
      level: data.level as Level,
      semester: data.semester,
      category: data.category,
      fileName: file.filename,
      originalName: file.originalname,
      size: file.size,
      uploadedBy: new mongoose.Types.ObjectId(req.user.id),
    });

    res
      .status(201)
      .json({ material: serializeMaterial(material, req.user.fullName) });
  } catch (err) {
    await removeFile(file.path);
    throw err;
  }
});

export const describePdf = asyncHandler(async (req, res) => {
  const input = descriptionSchema.parse(req.body);
  const description = await generateMaterialDescription(input);
  res.json({ description });
});

export const updateMaterial = asyncHandler(async (req, res) => {
  if (!req.user) throw new ApiError(401, "Not authenticated");

  const id = String(req.params.id);
  assertValidId(id);

  const data = updateSchema.parse(req.body);

  const material = await Material.findById(id);
  if (!material) throw new ApiError(404, "Material not found");

  // Must manage the material's current level, and any level they move it to
  assertCanManage(req.user, material.level);
  if (data.level !== undefined) assertCanManage(req.user, data.level);

  if (data.title !== undefined) material.title = data.title;
  if (data.courseCode !== undefined) material.courseCode = data.courseCode;
  if (data.level !== undefined) material.level = data.level as Level;
  if (data.semester !== undefined) material.semester = data.semester;
  if (data.category !== undefined) material.category = data.category;
  if (data.lecturerName !== undefined) material.lecturerName = data.lecturerName || undefined;
  if (data.description !== undefined) {
    material.description = data.description || undefined;
  }

  await material.save();

  res.json({ material: serializeMaterial(material) });
});

// GET /api/materials?level=200&semester=rain&courseCode=CSC201&category=past-question
// Students and course reps only ever get their own level. Admins can see everything.
export const listMaterials = asyncHandler(async (req, res) => {
  if (!req.user) throw new ApiError(401, "Not authenticated");

  const query = listSchema.parse(req.query);
  const filter: {
    level?: Level;
    semester?: MaterialSemester;
    courseCode?: string;
    category?: MaterialCategory;
  } = {};

  if (req.user.role !== "admin") {
    if (req.user.level === undefined) {
      throw new ApiError(403, "Your account has no level assigned");
    }
    if (query.level !== undefined && !canAccessLevel(req.user, query.level)) {
      throw new ApiError(
        403,
        "You don't have access to this level's materials",
      );
    }
    filter.level = req.user.level;
  } else if (query.level !== undefined) {
    filter.level = query.level as Level;
  }

  if (query.semester) filter.semester = query.semester;
  if (query.courseCode) filter.courseCode = query.courseCode.toUpperCase();
  if (query.category) filter.category = query.category;

  const materials = await Material.find(filter).sort({
    courseCode: 1,
    createdAt: -1,
  });

  // Plain students don't get to see who uploaded what
  const names =
    req.user.role !== "student" ? await uploaderNames(materials) : null;

  res.json({
    count: materials.length,
    materials: materials.map((m) =>
      serializeMaterial(
        m,
        names ? (names.get(String(m.uploadedBy)) ?? "Unknown") : undefined,
      ),
    ),
  });
});

// GET /api/materials/:id/file            -> opens inline (for the PDF viewer)
// GET /api/materials/:id/file?download=1 -> forces a download
export const streamMaterialFile = asyncHandler(async (req, res, next) => {
  if (!req.user) throw new ApiError(401, "Not authenticated");

  const id = String(req.params.id);
  assertValidId(id);

  const material = await Material.findById(id);
  if (!material) throw new ApiError(404, "Material not found");

  if (!canAccessLevel(req.user, material.level)) {
    throw new ApiError(403, "You don't have access to this material");
  }

  const filePath = path.join(MATERIAL_DIR, path.basename(material.fileName));

  try {
    await fs.access(filePath);
  } catch {
    throw new ApiError(404, "The file is missing on the server");
  }

  const disposition = req.query.download === "1" ? "attachment" : "inline";
  const asciiName = material.originalName
    .replace(/[^\x20-\x7E]/g, "_")
    .replace(/["\\]/g, "_");

  res.sendFile(
    filePath,
    {
      dotfiles: "deny",
      headers: {
        "Content-Type": material.fileName.toLowerCase().endsWith(".docx")
          ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          : material.fileName.toLowerCase().endsWith(".pptx")
            ? "application/vnd.openxmlformats-officedocument.presentationml.presentation"
            : "application/pdf",
        "Content-Disposition": `${disposition}; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(material.originalName)}`,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
      },
    },
    (err) => {
      if (err && !res.headersSent) next(err);
    },
  );
});

// DELETE /api/materials/:id  (admin or course rep)
export const deleteMaterial = asyncHandler(async (req, res) => {
  if (!req.user) throw new ApiError(401, "Not authenticated");

  const id = String(req.params.id);
  assertValidId(id);

  const material = await Material.findById(id);
  if (!material) throw new ApiError(404, "Material not found");

  assertCanManage(req.user, material.level);

  await Material.findByIdAndDelete(id);
  await removeFile(path.join(MATERIAL_DIR, path.basename(material.fileName)));

  res.json({ message: "Material deleted" });
});

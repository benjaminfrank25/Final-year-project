import mongoose from "mongoose";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { canAccessLevel } from "../utils/access";
import { Material } from "../models/Material";
import { UserMaterial } from "../models/UserMaterial";

const bookmarkSchema = z.object({ bookmarked: z.boolean() });

const progressSchema = z
  .object({
    page: z.number().int().min(1).max(5000),
    totalPages: z.number().int().min(1).max(5000),
  })
  .refine(
    (d) => d.page <= d.totalPages,
    "Page can't be greater than the total pages",
  );

async function assertAccessible(user: Express.AuthUser, rawId: string) {
  if (!mongoose.isValidObjectId(rawId)) {
    throw new ApiError(400, "Invalid material id");
  }

  const material = await Material.findById(rawId).select("level");
  if (!material) throw new ApiError(404, "Material not found");

  if (!canAccessLevel(user, material.level)) {
    throw new ApiError(403, "You don't have access to this material");
  }

  return material._id;
}

// GET /api/library  -> this user's saved / recently opened / progress records
export const getLibrary = asyncHandler(async (req, res) => {
  if (!req.user) throw new ApiError(401, "Not authenticated");

  const userId = new mongoose.Types.ObjectId(req.user.id);

  const records = await UserMaterial.find({
    user: userId,
    $or: [{ bookmarked: true }, { lastOpenedAt: { $ne: null } }],
  })
    .sort({ lastOpenedAt: -1 })
    .limit(500);

  res.json({
    states: records.map((r) => ({
      materialId: String(r.material),
      bookmarked: r.bookmarked,
      lastOpenedAt: r.lastOpenedAt ? r.lastOpenedAt.toISOString() : null,
      lastPage: r.lastPage ?? null,
      totalPages: r.totalPages ?? null,
    })),
  });
});

// PUT /api/library/:materialId/bookmark   body: { "bookmarked": true }
export const setBookmark = asyncHandler(async (req, res) => {
  if (!req.user) throw new ApiError(401, "Not authenticated");

  const { bookmarked } = bookmarkSchema.parse(req.body);
  const materialId = await assertAccessible(
    req.user,
    String(req.params.materialId),
  );
  const userId = new mongoose.Types.ObjectId(req.user.id);

  await UserMaterial.findOneAndUpdate(
    { user: userId, material: materialId },
    { $set: { bookmarked } },
    { upsert: true, setDefaultsOnInsert: true },
  );

  res.json({ materialId: String(materialId), bookmarked });
});

// POST /api/library/:materialId/opened
export const markOpened = asyncHandler(async (req, res) => {
  if (!req.user) throw new ApiError(401, "Not authenticated");

  const materialId = await assertAccessible(
    req.user,
    String(req.params.materialId),
  );
  const userId = new mongoose.Types.ObjectId(req.user.id);

  await UserMaterial.findOneAndUpdate(
    { user: userId, material: materialId },
    { $set: { lastOpenedAt: new Date() } },
    { upsert: true, setDefaultsOnInsert: true },
  );

  res.json({ materialId: String(materialId) });
});

// PUT /api/library/:materialId/progress   body: { "page": 12, "totalPages": 40 }
export const setProgress = asyncHandler(async (req, res) => {
  if (!req.user) throw new ApiError(401, "Not authenticated");

  const { page, totalPages } = progressSchema.parse(req.body);
  const materialId = await assertAccessible(
    req.user,
    String(req.params.materialId),
  );
  const userId = new mongoose.Types.ObjectId(req.user.id);

  await UserMaterial.findOneAndUpdate(
    { user: userId, material: materialId },
    { $set: { lastPage: page, totalPages, lastOpenedAt: new Date() } },
    { upsert: true, setDefaultsOnInsert: true },
  );

  res.json({ materialId: String(materialId), lastPage: page, totalPages });
});

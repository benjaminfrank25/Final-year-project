import { z } from "zod";
import { Announcement } from "../models/Announcement";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { isValidLevel } from "../utils/access";
import { Level } from "../models/User";
import { createAuditLog } from "../utils/audit";

const createSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(120),
  message: z.string().trim().min(1, "Message is required").max(2000),
  level: z.coerce
    .number()
    .refine(isValidLevel, "Level must be 100, 200, 300, 400 or 500"),
});

export const listAnnouncements = asyncHandler(async (req, res) => {
  if (!req.user) throw new ApiError(401, "Not authenticated");
  if (req.user.role !== "admin" && req.user.level === undefined) {
    throw new ApiError(403, "Your account has no level assigned");
  }

  const filter =
    req.user.role === "admin"
      ? {}
      : { level: req.user.level };

  const announcements = await Announcement.find(filter)
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  res.json({
    announcements: announcements.map((announcement) => ({
      id: String(announcement._id),
      title: announcement.title,
      message: announcement.message,
      createdByName: announcement.createdByName,
      level: announcement.level,
      createdAt: announcement.createdAt,
    })),
  });
});

export const createAnnouncement = asyncHandler(async (req, res) => {
  if (!req.user) throw new ApiError(401, "Not authenticated");

  const data = createSchema.parse(req.body);
  const announcement = await Announcement.create({
    ...data,
    level: data.level as Level,
    createdByName: req.user.fullName,
  });
  try {
    await createAuditLog(req.user, {
      action: "announcement.created",
      targetType: "announcement",
      targetId: String(announcement._id),
      targetName: announcement.title,
      details: `Created for ${announcement.level} Level`,
    });
  } catch (error) {
    await Announcement.findByIdAndDelete(announcement._id);
    throw error;
  }

  res.status(201).json({
    announcement: {
      id: String(announcement._id),
      title: announcement.title,
      message: announcement.message,
      createdByName: announcement.createdByName,
      level: announcement.level,
      createdAt: announcement.createdAt,
    },
  });
});

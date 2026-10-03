import { z } from "zod";
import { Announcement } from "../models/Announcement";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";

const createSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(120),
  message: z.string().trim().min(1, "Message is required").max(2000),
});

export const listAnnouncements = asyncHandler(async (req, res) => {
  if (!req.user) throw new ApiError(401, "Not authenticated");

  const filter =
    req.user.role === "admin"
      ? {}
      : {
          $or: [
            { level: { $exists: false } },
            { level: req.user.level },
          ],
        };

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
    createdByName: req.user.fullName,
  });

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

import { Schema, model } from "mongoose";
import { LEVELS, Level } from "./User";

export interface IAnnouncement {
  title: string;
  message: string;
  createdByName: string;
  level?: Level;
  createdAt: Date;
  updatedAt: Date;
}

const announcementSchema = new Schema<IAnnouncement>(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    createdByName: { type: String, required: true, trim: true, maxlength: 100 },
    level: { type: Number, enum: LEVELS, index: true },
  },
  { timestamps: true },
);

export const Announcement = model<IAnnouncement>(
  "Announcement",
  announcementSchema,
);

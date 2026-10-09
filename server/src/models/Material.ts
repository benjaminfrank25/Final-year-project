import { Schema, Types, model } from "mongoose";
import { LEVELS, Level } from "./User";
import { UserMaterial } from "./UserMaterial";

export const MATERIAL_CATEGORIES = [
  "lecture-note",
  "past-question",
  "assignment",
  "textbook",
  "other",
] as const;

export type MaterialCategory = (typeof MATERIAL_CATEGORIES)[number];

export const MATERIAL_SEMESTERS = ["harmattan", "rain"] as const;

export type MaterialSemester = (typeof MATERIAL_SEMESTERS)[number];

export interface IMaterial {
  title: string;
  description?: string;
  lecturerName?: string;
  courseCode: string;
  level: Level;
  semester: MaterialSemester;
  category: MaterialCategory;
  fileName: string;
  cloudinaryPublicId?: string;
  cloudinaryUrl?: string;
  originalName: string;
  size: number;
  uploadedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const materialSchema = new Schema<IMaterial>(
  {
    title: { type: String, required: true, trim: true, maxlength: 150 },
    description: { type: String, trim: true, maxlength: 1000 },
    lecturerName: { type: String, trim: true, maxlength: 100 },
    courseCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: 15,
      index: true,
    },
    level: { type: Number, required: true, enum: LEVELS, index: true },
    semester: {
      type: String,
      enum: MATERIAL_SEMESTERS,
      default: "harmattan",
      index: true,
    },
    category: {
      type: String,
      enum: MATERIAL_CATEGORIES,
      default: "lecture-note",
      index: true,
    },
    fileName: { type: String, required: true, unique: true },
    cloudinaryPublicId: { type: String },
    cloudinaryUrl: { type: String },
    originalName: { type: String, required: true, trim: true, maxlength: 255 },
    size: { type: Number, required: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

materialSchema.post("findOneAndDelete", async (doc) => {
  if (doc) {
    await UserMaterial.deleteMany({ material: doc._id });
  }
});

export const Material = model<IMaterial>("Material", materialSchema);

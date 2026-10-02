import { Schema, Types, model } from "mongoose";

export interface IUserMaterial {
  user: Types.ObjectId;
  material: Types.ObjectId;
  bookmarked: boolean;
  lastOpenedAt?: Date;
  lastPage?: number;
  totalPages?: number;
  createdAt: Date;
  updatedAt: Date;
}

const userMaterialSchema = new Schema<IUserMaterial>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    material: { type: Schema.Types.ObjectId, ref: "Material", required: true },
    bookmarked: { type: Boolean, default: false },
    lastOpenedAt: { type: Date },
    lastPage: { type: Number, min: 1 },
    totalPages: { type: Number, min: 1 },
  },
  { timestamps: true },
);

userMaterialSchema.index({ user: 1, material: 1 }, { unique: true });
userMaterialSchema.index({ user: 1, lastOpenedAt: -1 });

export const UserMaterial = model<IUserMaterial>(
  "UserMaterial",
  userMaterialSchema,
);

import { Schema, model, Model } from "mongoose";
import bcrypt from "bcryptjs";

export const ROLES = ["student", "rep", "admin"] as const;
export const LEVELS = [100, 200, 300, 400, 500] as const;
export const STATUSES = ["pending", "active", "rejected"] as const;

export type Role = (typeof ROLES)[number];
export type Level = (typeof LEVELS)[number];
export type Status = (typeof STATUSES)[number];

export interface IUser {
  fullName: string;
  email: string;
  password: string;
  role: Role;
  level?: Level;
  status: Status;
  passwordResetTokenHash?: string;
  passwordResetExpiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface IUserMethods {
  comparePassword(candidate: string): Promise<boolean>;
}

type UserModel = Model<IUser, {}, IUserMethods>;

const userSchema = new Schema<IUser, UserModel, IUserMethods>(
  {
    fullName: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
      maxlength: 100,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Invalid email address"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      select: false,
    },
    role: {
      type: String,
      enum: ROLES,
      default: "student",
    },
    level: {
      type: Number,

      required: [
        function (this: IUser) {
          return this.role === "student" || this.role === "rep";
        },
        "Level is required for students and course reps",
      ],
      validate: {
        validator: (v: number | undefined) =>
          v === undefined || (LEVELS as readonly number[]).includes(v),
        message: "Level must be one of 100, 200, 300, 400, 500",
      },
    },
    status: {
      type: String,
      enum: STATUSES,
      default: "pending",
    },
    passwordResetTokenHash: { type: String, select: false },
    passwordResetExpiresAt: { type: Date, select: false },
  },
  { timestamps: true },
);

// Hash the password whenever it's new or changed
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = function (candidate: string) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete (ret as { password?: string }).password;
    return ret;
  },
});

export const User = model<IUser, UserModel>("User", userSchema);

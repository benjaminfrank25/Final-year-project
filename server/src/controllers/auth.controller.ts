import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { clearAuthCookie, setAuthCookie, signToken } from "../utils/token";
import { IUser, LEVELS, Level, User } from "../models/User";
import { env } from "../config/env";
import { sendPasswordResetEmail } from "../services/email";

const registerSchema = z.object({
  fullName: z.string().trim().min(2, "Full name is too short").max(100),
  email: z.string().trim().toLowerCase().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password is too long"),
  level: z.coerce
    .number()
    .refine(
      (v) => (LEVELS as readonly number[]).includes(v),
      "Level must be 100, 200, 300, 400 or 500",
    ),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email address"),
});

const resetPasswordSchema = z.object({
  token: z.string().regex(/^[a-f0-9]{64}$/, "Invalid or expired reset link"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password is too long"),
});

function serializeUser(
  user: Pick<IUser, "fullName" | "email" | "role" | "level" | "status"> & {
    _id: unknown;
  },
) {
  return {
    id: String(user._id),
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    level: user.level,
    status: user.status,
  };
}

// POST /api/auth/register
// Role and status are always forced server-side, whatever the client sends.
export const register = asyncHandler(async (req, res) => {
  const data = registerSchema.parse(req.body);

  const exists = await User.exists({ email: data.email });
  if (exists) throw new ApiError(409, "That email is already registered");

  await User.create({
    fullName: data.fullName,
    email: data.email,
    password: data.password,
    level: data.level as Level,
    role: "student",
    status: "pending",
  });

  res.status(201).json({
    message:
      "Registration successful. An admin needs to approve your account before you can log in.",
  });
});

// POST /api/auth/login
export const login = asyncHandler(async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);

  const user = await User.findOne({ email }).select("+password");

  // Same message for "no such user" and "wrong password"
  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, "Invalid email or password");
  }

  if (user.status === "pending") {
    throw new ApiError(403, "Your account is still awaiting admin approval");
  }
  if (user.status === "rejected") {
    throw new ApiError(403, "Your registration was not approved");
  }

  setAuthCookie(res, signToken(String(user._id)));
  res.json({ user: serializeUser(user) });
});

// POST /api/auth/forgot-password
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = forgotPasswordSchema.parse(req.body);
  const user = await User.findOne({ email });

  if (user) {
    const token = randomBytes(32).toString("hex");
    user.passwordResetTokenHash = createHash("sha256").update(token).digest("hex");
    user.passwordResetExpiresAt = new Date(Date.now() + 30 * 60 * 1000);
    await user.save();

    const resetUrl = new URL("/reset-password", env.CLIENT_URL);
    resetUrl.searchParams.set("token", token);

    try {
      await sendPasswordResetEmail(user.email, resetUrl.toString());
    } catch (error) {
      user.passwordResetTokenHash = undefined;
      user.passwordResetExpiresAt = undefined;
      await user.save();
      throw error;
    }
  }

  res.json({
    message:
      "If an account exists for that email, a password reset link has been sent.",
  });
});

// POST /api/auth/reset-password
export const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = resetPasswordSchema.parse(req.body);
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const passwordHash = await bcrypt.hash(password, 12);

  const result = await User.updateOne(
    {
      passwordResetTokenHash: tokenHash,
      passwordResetExpiresAt: { $gt: new Date() },
    },
    {
      $set: { password: passwordHash },
      $unset: {
        passwordResetTokenHash: "",
        passwordResetExpiresAt: "",
      },
    },
    { runValidators: true },
  );

  if (result.modifiedCount !== 1) {
    throw new ApiError(400, "This password reset link is invalid or expired");
  }

  res.json({ message: "Password reset successfully. You can now log in." });
});

// POST /api/auth/logout
export const logout = asyncHandler(async (_req, res) => {
  clearAuthCookie(res);
  res.json({ message: "Logged out" });
});

// GET /api/auth/me  (behind requireAuth)
export const me = asyncHandler(async (req, res) => {
  res.json({ user: req.user });
});

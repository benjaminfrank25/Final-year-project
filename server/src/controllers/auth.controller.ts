import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { clearAuthCookie, setAuthCookie, signToken } from "../utils/token";
import { IUser, LEVELS, Level, User } from "../models/User";

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

// POST /api/auth/logout
export const logout = asyncHandler(async (_req, res) => {
  clearAuthCookie(res);
  res.json({ message: "Logged out" });
});

// GET /api/auth/me  (behind requireAuth)
export const me = asyncHandler(async (req, res) => {
  res.json({ user: req.user });
});

import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { COOKIE_NAME, verifyToken } from "../utils/token";
import { User } from "../models/User";

export const requireAuth = asyncHandler(async (req, _res, next) => {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) throw new ApiError(401, "Not authenticated");

  const userId = verifyToken(token);
  if (!userId) throw new ApiError(401, "Session expired, please log in again");

  const user = await User.findById(userId);
  if (!user || user.status !== "active") {
    throw new ApiError(401, "Not authenticated");
  }

  req.user = {
    id: String(user._id),
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    level: user.level,
    status: user.status,
  };

  next();
});

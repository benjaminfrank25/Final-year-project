import { RequestHandler } from "express";
import { Role } from "../models/User";
import { ApiError } from "../utils/ApiError";
import { canAccessLevel, isValidLevel } from "../utils/access";

// Use after requireAuth. Example: requireRole("admin")
export const requireRole =
  (...roles: Role[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.user) return next(new ApiError(401, "Not authenticated"));

    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, "You don't have permission to do that"));
    }

    next();
  };

// Blocks students from any level that isn't theirs.
export const requireLevelParam =
  (param = "level"): RequestHandler =>
  (req, _res, next) => {
    if (!req.user) return next(new ApiError(401, "Not authenticated"));

    const raw = String(req.params[param]);
    if (!/^\d{3}$/.test(raw) || !isValidLevel(Number(raw))) {
      return next(new ApiError(400, "Invalid level"));
    }

    if (!canAccessLevel(req.user, Number(raw))) {
      return next(
        new ApiError(403, "You don't have access to this level's materials"),
      );
    }

    next();
  };

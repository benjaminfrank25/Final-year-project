import { LEVELS, Level } from "../models/User";

export function isValidLevel(value: number): value is Level {
  return (LEVELS as readonly number[]).includes(value);
}

export function canAccessLevel(user: Express.AuthUser, level: number): boolean {
  if (user.role === "admin") return true;
  return (
    (user.role === "student" || user.role === "rep") && user.level === level
  );
}

export function canManageLevel(user: Express.AuthUser, level: number): boolean {
  if (user.role === "admin") return true;
  return user.role === "rep" && user.level === level;
}

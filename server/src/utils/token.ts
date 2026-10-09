import jwt from "jsonwebtoken";
import { CookieOptions, Response } from "express";
import { env } from "../config/env";

export const COOKIE_NAME = "token";

const baseCookieOptions: CookieOptions = {
  httpOnly: true,
  sameSite: env.NODE_ENV === "production" ? "none" : "lax",
  secure: env.NODE_ENV === "production",
  path: "/",
};

export function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, env.JWT_SECRET, {
    algorithm: "HS256",
    expiresIn: env.JWT_EXPIRES_DAYS * 24 * 60 * 60, // seconds
  });
}

export function verifyToken(token: string): string | null {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET, {
      algorithms: ["HS256"],
    });
    if (typeof payload === "object" && typeof payload.sub === "string") {
      return payload.sub;
    }
    return null;
  } catch {
    return null;
  }
}

export function setAuthCookie(res: Response, token: string): void {
  res.cookie(COOKIE_NAME, token, {
    ...baseCookieOptions,
  });
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie(COOKIE_NAME, baseCookieOptions);
}

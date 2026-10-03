import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import {
  forgotPassword,
  login,
  logout,
  me,
  register,
  resetPassword,
} from "../controllers/auth.controller";
import { requireAuth } from "../middleware/auth";

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Too many attempts, please try again in a few minutes" },
});

router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);
router.post("/forgot-password", authLimiter, forgotPassword);
router.post("/reset-password", authLimiter, resetPassword);
router.post("/logout", logout);
router.get("/me", requireAuth, me);

export default router;

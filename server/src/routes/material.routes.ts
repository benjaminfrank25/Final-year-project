import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  createMaterial,
  describePdf,
  deleteMaterial,
  listMaterials,
  streamOfficePreview,
  streamMaterialFile,
  updateMaterial,
} from "../controllers/material.controller";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/roles";
import { uploadMaterial } from "../middleware/upload";

const router = Router();
const describeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 8,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id ?? "unknown",
});

// Any logged-in, approved user (the controllers enforce the level rules)
router.get("/", requireAuth, listMaterials);
router.get("/:id/preview", requireAuth, streamOfficePreview);
router.get("/:id/file", requireAuth, streamMaterialFile);
router.post(
  "/describe",
  requireAuth,
  requireRole("admin", "rep"),
  describeLimiter,
  describePdf,
);

router.post(
  "/",
  requireAuth,
  requireRole("admin", "rep"),
  uploadMaterial,
  createMaterial,
);
router.patch("/:id", requireAuth, requireRole("admin", "rep"), updateMaterial);
router.delete("/:id", requireAuth, requireRole("admin", "rep"), deleteMaterial);

export default router;

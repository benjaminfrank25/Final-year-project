import { Router } from "express";
import {
  getLibrary,
  markOpened,
  setBookmark,
  setProgress,
} from "../controllers/library.controller";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.use(requireAuth);

router.get("/", getLibrary);
router.put("/:materialId/bookmark", setBookmark);
router.post("/:materialId/opened", markOpened);
router.put("/:materialId/progress", setProgress);

export default router;

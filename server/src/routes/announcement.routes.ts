import { Router } from "express";
import { listAnnouncements } from "../controllers/announcement.controller";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/roles";

const router = Router();

router.use(requireAuth, requireRole("admin", "student", "rep"));
router.get("/", listAnnouncements);

export default router;

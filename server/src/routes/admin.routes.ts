import { Router } from "express";
import {
  createAnnouncement,
} from "../controllers/announcement.controller";
import {
  listStudents,
  updateStudent,
} from "../controllers/admin.controller";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/roles";

const router = Router();

router.use(requireAuth, requireRole("admin"));

router.get("/students", listStudents);
router.patch("/students/:id", updateStudent);
router.post("/announcements", createAnnouncement);

export default router;

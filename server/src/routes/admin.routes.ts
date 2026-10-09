import { Router } from "express";
import {
  createAnnouncement,
} from "../controllers/announcement.controller";
import {
  importStudents,
  listStudents,
  updateStudent,
} from "../controllers/admin.controller";
import { listAuditLogs } from "../controllers/audit.controller";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/roles";
import { uploadClassList } from "../middleware/classListUpload";

const router = Router();

router.use(requireAuth, requireRole("admin"));

router.get("/students", listStudents);
router.post("/students/import", uploadClassList, importStudents);
router.patch("/students/:id", updateStudent);
router.get("/audit-logs", listAuditLogs);
router.post("/announcements", createAnnouncement);

export default router;

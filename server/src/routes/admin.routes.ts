import { Router } from "express";
import { listStudents, updateStudent } from "../controllers/admin.controller";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/roles";

const router = Router();

router.use(requireAuth, requireRole("admin"));

router.get("/students", listStudents);
router.patch("/students/:id", updateStudent);

export default router;

import { Router } from "express";
import {
  approveAllLevelApplications,
  decideLevelApplication,
  listLevelApplications,
} from "../controllers/rep.controller";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/roles";

const router = Router();

router.use(requireAuth, requireRole("rep"));

router.get("/students", listLevelApplications);
router.patch("/students/approve-all", approveAllLevelApplications);
router.patch("/students/:id", decideLevelApplication);

export default router;

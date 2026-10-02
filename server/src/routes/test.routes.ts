import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { requireLevelParam, requireRole } from "../middleware/roles";

const router = Router();

router.get("/admin", requireAuth, requireRole("admin"), (req, res) => {
  res.json({ message: "Admin area OK", user: req.user });
});

router.get(
  "/level/:level",
  requireAuth,
  requireLevelParam("level"),
  (req, res) => {
    res.json({ message: `Level ${req.params.level} area OK`, user: req.user });
  },
);

export default router;

import multer from "multer";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { MAX_UPLOAD_MB, MATERIAL_DIR } from "../config/storage";
import { ApiError } from "../utils/ApiError";

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, MATERIAL_DIR),
  filename: (_req, file, cb) =>
    cb(null, `${randomUUID()}${path.extname(file.originalname).toLowerCase()}`),
});

export const uploadMaterial = multer({
  storage,
  limits: { fileSize: MAX_UPLOAD_MB * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const isPdf = extension === ".pdf" && file.mimetype === "application/pdf";
    const isDocx =
      extension === ".docx" &&
      file.mimetype ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    const isPptx =
      extension === ".pptx" &&
      file.mimetype ===
        "application/vnd.openxmlformats-officedocument.presentationml.presentation";

    if (!isPdf && !isDocx && !isPptx) {
      cb(
        new ApiError(
          400,
          "Only PDF, Word (.docx), and PowerPoint (.pptx) files are allowed",
        ),
      );
      return;
    }
    cb(null, true);
  },
}).single("file");

import multer from "multer";
import path from "node:path";
import { MAX_UPLOAD_MB } from "../config/storage";
import { ApiError } from "../utils/ApiError";

export const uploadMaterial = multer({
  storage: multer.memoryStorage(),
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

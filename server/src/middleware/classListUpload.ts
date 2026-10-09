import multer from "multer";
import path from "node:path";
import { MAX_CLASS_LIST_UPLOAD_MB } from "../config/storage";
import { ApiError } from "../utils/ApiError";

export const uploadClassList = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_CLASS_LIST_UPLOAD_MB * 1024 * 1024,
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    if (![".csv", ".xlsx"].includes(extension)) {
      cb(new ApiError(400, "Only CSV and Excel (.xlsx) files are allowed"));
      return;
    }
    cb(null, true);
  },
}).single("file");

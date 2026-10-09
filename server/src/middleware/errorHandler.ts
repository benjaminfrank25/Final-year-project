import { ErrorRequestHandler, RequestHandler } from "express";
import mongoose from "mongoose";
import multer from "multer";
import { ZodError } from "zod";
import {
  MAX_CLASS_LIST_UPLOAD_MB,
  MAX_UPLOAD_MB,
} from "../config/storage";
import { ApiError } from "../utils/ApiError";
import { log } from "../utils/logger";

export const notFound: RequestHandler = (req, res) => {
  res
    .status(404)
    .json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
};

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({ message: err.message });
    return;
  }

  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      const maxFileSize =
        req.originalUrl.startsWith("/api/admin/students/import")
          ? MAX_CLASS_LIST_UPLOAD_MB
          : MAX_UPLOAD_MB;
      res
        .status(413)
        .json({ message: `File is too large (max ${maxFileSize}MB)` });
      return;
    }
    res.status(400).json({ message: err.message });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      message: err.issues[0]?.message ?? "Invalid input",
      errors: err.issues.map((i) => ({
        field: i.path.map(String).join("."),
        message: i.message,
      })),
    });
    return;
  }

  if (err instanceof mongoose.Error.ValidationError) {
    const first = Object.values(err.errors)[0];
    res.status(400).json({ message: first?.message ?? "Validation failed" });
    return;
  }

  if (typeof err === "object" && err !== null && err.code === 11000) {
    res.status(409).json({ message: "That email is already registered" });
    return;
  }

  if (
    typeof err === "object" &&
    err !== null &&
    err.type === "entity.parse.failed"
  ) {
    res.status(400).json({ message: "Invalid JSON body" });
    return;
  }

  log.error("Unhandled error", err);
  res.status(500).json({ message: "Something went wrong" });
};

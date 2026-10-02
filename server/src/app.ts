import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./config/env";
import authRoutes from "./routes/auth.routes";
import adminRoutes from "./routes/admin.routes";
import materialRoutes from "./routes/material.routes";
import libraryRoutes from "./routes/library.routes";
import testRoutes from "./routes/test.routes";
import { errorHandler, notFound } from "./middleware/errorHandler";

const app = express();

app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/materials", materialRoutes);
app.use("/api/library", libraryRoutes);

if (env.NODE_ENV !== "production") {
  app.use("/api/test", testRoutes);
}

app.use(notFound);
app.use(errorHandler);

export default app;

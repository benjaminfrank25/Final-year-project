import mongoose from "mongoose";
import "../config/env";
import { connectDB } from "../config/db";
import { User } from "../models/User";
import { log } from "../utils/logger";

async function seedAdmin() {
  const { ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;

  if (!ADMIN_NAME || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error(
      "Set ADMIN_NAME, ADMIN_EMAIL and ADMIN_PASSWORD in server/.env first",
    );
  }

  await connectDB();

  const existing = await User.findOne({ email: ADMIN_EMAIL.toLowerCase() });
  if (existing) {
    log.warn(`Admin already exists (${existing.email}). Nothing to do.`);
    return;
  }

  const admin = await User.create({
    fullName: ADMIN_NAME,
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    role: "admin",
    status: "active",
  });

  log.success(`Admin created: ${admin.email}`);
}

seedAdmin()
  .catch((err) => {
    log.error("Seeding failed", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });

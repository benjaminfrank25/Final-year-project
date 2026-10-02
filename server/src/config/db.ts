import dns from "node:dns";
import mongoose from "mongoose";
import { env } from "./env";
import { log } from "../utils/logger";

// Some networks fail SRV lookups (needed by mongodb+srv:// URIs).
// Use public DNS resolvers for Node's own lookups.
dns.setServers(["8.8.8.8", "1.1.1.1"]);

export async function connectDB(): Promise<void> {
  await mongoose.connect(env.MONGO_URI, {
    serverSelectionTimeoutMS: 10000,
  });
  log.success("MongoDB connected");
}

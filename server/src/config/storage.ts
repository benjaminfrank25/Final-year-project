import fs from "node:fs";
import path from "node:path";

export const MATERIAL_DIR = path.resolve(__dirname, "../../storage/pdfs");
export const MAX_UPLOAD_MB = 50;

fs.mkdirSync(MATERIAL_DIR, { recursive: true });

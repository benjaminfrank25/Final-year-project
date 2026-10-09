import fs from "node:fs/promises";
import path from "node:path";

export function looksLikeMaterialFile(
  buffer: Buffer,
  originalName: string,
): boolean {
  const extension = path.extname(originalName).toLowerCase();
  if (extension === ".pdf") {
    return buffer.subarray(0, 5).toString("latin1") === "%PDF-";
  }
  if (extension === ".docx" || extension === ".pptx") {
    return buffer.subarray(0, 4).toString("latin1") === "PK\u0003\u0004";
  }
  return false;
}

export async function removeFile(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
  } catch {
    // nothing to do
  }
}

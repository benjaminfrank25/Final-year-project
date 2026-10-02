import fs from "node:fs/promises";
import path from "node:path";

export async function looksLikeMaterialFile(
  filePath: string,
): Promise<boolean> {
  const handle = await fs.open(filePath, "r");
  try {
    const extension = path.extname(filePath).toLowerCase();
    const buf = Buffer.alloc(5);
    await handle.read(buf, 0, buf.length, 0);

    if (extension === ".pdf") return buf.toString("latin1") === "%PDF-";
    if (extension === ".docx" || extension === ".pptx")
      return buf.toString("latin1", 0, 4) === "PK\u0003\u0004";
    return false;
  } finally {
    await handle.close();
  }
}

export async function removeFile(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
  } catch {
    // nothing to do
  }
}

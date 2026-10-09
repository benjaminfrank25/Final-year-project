import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { pathToFileURL } from "node:url";
import { env } from "../config/env";
import { MATERIAL_DIR } from "../config/storage";
import { downloadCloudinaryMaterial } from "./cloudinary";
import { ApiError } from "../utils/ApiError";
import { log } from "../utils/logger";

const execFileAsync = promisify(execFile);
const conversions = new Map<string, Promise<string>>();

function previewPath(fileName: string): string {
  return path.join(MATERIAL_DIR, `${path.basename(fileName)}.preview.pdf`);
}

async function existingPreview(filePath: string): Promise<boolean> {
  let stats: Awaited<ReturnType<typeof fs.stat>>;
  try {
    stats = await fs.stat(filePath);
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return false;
    }
    throw error;
  }

  if (stats.size <= 5) return false;
  const handle = await fs.open(filePath, "r");
  try {
    const signature = Buffer.alloc(5);
    await handle.read(signature, 0, signature.length, 0);
    return signature.toString() === "%PDF-";
  } finally {
    await handle.close();
  }
}

async function convertOfficeFile(
  fileName: string,
  cloudinaryUrl?: string,
): Promise<string> {
  const cachedPath = previewPath(fileName);
  if (await existingPreview(cachedPath)) return cachedPath;
  await fs.rm(cachedPath, { force: true });

  const safeFileName = path.basename(fileName);
  const extension = path.extname(safeFileName).toLowerCase();
  if (extension !== ".docx" && extension !== ".pptx") {
    throw new ApiError(400, "Only Word and PowerPoint files need conversion");
  }

  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), "course-vault-preview-"));
  const outputDir = path.join(workDir, "output");
  const profileDir = path.join(workDir, "profile");
  const sourcePath = cloudinaryUrl
    ? path.join(workDir, safeFileName)
    : path.join(MATERIAL_DIR, safeFileName);
  await fs.mkdir(outputDir);

  try {
    if (cloudinaryUrl) {
      await fs.writeFile(
        sourcePath,
        await downloadCloudinaryMaterial(cloudinaryUrl),
      );
    } else {
      try {
        await fs.access(sourcePath);
      } catch {
        throw new ApiError(404, "The material file is missing on the server");
      }
    }

    await execFileAsync(
      env.SOFFICE_PATH,
      [
        "--headless",
        "--nologo",
        "--nodefault",
        "--nolockcheck",
        `-env:UserInstallation=${pathToFileURL(profileDir).href}`,
        "--convert-to",
        "pdf",
        "--outdir",
        outputDir,
        sourcePath,
      ],
      { timeout: 120_000, windowsHide: true, maxBuffer: 1024 * 1024 },
    );

    const outputName = `${path.basename(sourcePath, extension)}.pdf`;
    const convertedPath = path.join(outputDir, outputName);
    if (!(await existingPreview(convertedPath))) {
      throw new Error("LibreOffice did not produce a valid PDF");
    }

    await fs.rename(convertedPath, cachedPath);
    return cachedPath;
  } catch (error) {
    log.error(`Failed to convert ${path.basename(sourcePath)} for preview`, error);
    if (error instanceof ApiError) throw error;
    if (typeof error === "object" && error !== null && "code" in error) {
      if (error.code === "ENOENT") {
        throw new ApiError(
          503,
          "Office preview is unavailable because LibreOffice is not installed or SOFFICE_PATH is incorrect.",
        );
      }
    }
    if (
      typeof error === "object" &&
      error !== null &&
      "killed" in error &&
      error.killed
    ) {
      throw new ApiError(504, "Office preview conversion timed out");
    }
    throw new ApiError(
      422,
      "This Office file could not be converted for preview. Check that it opens correctly and that the server has the required fonts installed.",
    );
  } finally {
    await fs.rm(workDir, { recursive: true, force: true });
  }
}

export function getOfficePreviewPdf(
  fileName: string,
  cloudinaryUrl?: string,
): Promise<string> {
  const key = path.basename(fileName);
  const inFlight = conversions.get(key);
  if (inFlight) return inFlight;

  const conversion = convertOfficeFile(key, cloudinaryUrl).finally(() => {
    conversions.delete(key);
  });
  conversions.set(key, conversion);
  return conversion;
}

export async function removeOfficePreview(fileName: string): Promise<void> {
  await fs.rm(previewPath(fileName), { force: true });
}

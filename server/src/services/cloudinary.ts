import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";
import { env } from "../config/env";
import { ApiError } from "../utils/ApiError";

function configuredCloudinary() {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } =
    env;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    throw new ApiError(503, "Cloudinary storage is not configured");
  }

  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure: true,
  });
  return CLOUDINARY_CLOUD_NAME;
}

export function uploadMaterialToCloudinary(
  buffer: Buffer,
  fileName: string,
): Promise<UploadApiResponse> {
  configuredCloudinary();
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          resource_type: "raw",
          folder: "course-vault/materials",
          public_id: fileName,
          overwrite: false,
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else if (!result) {
            reject(new Error("Cloudinary returned no upload result"));
          } else {
            resolve(result);
          }
        },
      )
      .end(buffer);
  });
}

export async function deleteCloudinaryMaterial(publicId: string): Promise<void> {
  configuredCloudinary();
  const result = await cloudinary.uploader.destroy(publicId, {
    resource_type: "raw",
    invalidate: true,
  });
  if (result.result !== "ok" && result.result !== "not found") {
    throw new Error(`Cloudinary could not delete the material (${result.result})`);
  }
}

export async function downloadCloudinaryMaterial(url: string): Promise<Buffer> {
  const cloudName = configuredCloudinary();
  const assetUrl = new URL(url);
  if (
    assetUrl.protocol !== "https:" ||
    assetUrl.hostname !== "res.cloudinary.com" ||
    assetUrl.pathname.split("/")[1] !== cloudName
  ) {
    throw new ApiError(502, "The stored Cloudinary asset URL is invalid");
  }

  const response = await fetch(assetUrl, {
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) {
    throw new ApiError(502, "The material could not be retrieved from Cloudinary");
  }
  return Buffer.from(await response.arrayBuffer());
}

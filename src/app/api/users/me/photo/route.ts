import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { NextRequest } from "next/server";

import { apiError, apiSuccess } from "@/src/lib/ApiResponse";
import { ApiError } from "@/src/lib/ApiError";
import { getAuthUser } from "@/src/lib/auth";

export const runtime = "nodejs";

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export async function POST(req: NextRequest) {
  const auth = await getAuthUser(req);

  if (!auth) return apiError(ApiError.unauthorized("Authentication required."));

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return apiError(ApiError.badRequest("Expected multipart form data."));
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return apiError(ApiError.badRequest("Missing image file."));
  }

  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    return apiError(
      ApiError.badRequest("Only JPEG, PNG, WebP, or GIF images are allowed."),
    );
  }

  if (file.size <= 0 || file.size > MAX_BYTES) {
    return apiError(ApiError.badRequest("Image must be between 1 byte and 2 MB."));
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const filename = `${auth.id}-${randomUUID()}.${ext}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads", "profiles");
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, filename), bytes);

  const url = `/uploads/profiles/${filename}`;

  return apiSuccess({ url }, "Profile photo uploaded");
}

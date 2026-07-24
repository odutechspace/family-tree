/** DiceBear Big Ears — https://www.dicebear.com/styles/big-ears */

export const DICEBEAR_BIG_EARS_STYLE = "big-ears";
export const DICEBEAR_API_VERSION = "10.x";

export function dicebearBigEarsUrl(
  seed: string,
  options?: { size?: number; format?: "svg" | "png" },
): string {
  const format = options?.format ?? "svg";
  const size = options?.size ?? 128;
  const params = new URLSearchParams({
    seed: seed.trim() || "guest",
    size: String(size),
  });

  return `https://api.dicebear.com/${DICEBEAR_API_VERSION}/${DICEBEAR_BIG_EARS_STYLE}/${format}?${params.toString()}`;
}

export function isDicebearBigEarsUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return /api\.dicebear\.com\/\d+(\.\d+)?\.x\/big-ears\//.test(url);
}

/** Stable random-looking seeds for avatar picker grids. */
export function generateAvatarSeeds(count: number, salt = ""): string[] {
  const base = `${Date.now().toString(36)}-${salt}-${Math.random().toString(36).slice(2, 8)}`;
  return Array.from({ length: count }, (_, i) => `${base}-${i}`);
}

export function isAllowedProfilePhotoUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("/uploads/")) return true;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

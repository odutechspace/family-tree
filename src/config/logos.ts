/**
 * Brand assets in /public/logos — single source of truth for paths.
 */
export const LOGOS = {
  /** Colored mark (light backgrounds) */
  icon: "/logos/uk-icon-logo.png",
  /** Light / white mark for dark UI (navbar) */
  iconOnDark: "/logos/uk-icon-logo-wt.svg",
  /** PNG fallback if SVG is problematic in a context */
  iconOnDarkPng: "/logos/uk-icon-logo-wt.png",
  /** Full wordmark */
  wordmark: "/logos/uklogo.png",
} as const;

/**
 * Absolute URL for email clients. Returns empty string if no public origin is configured
 * (relative /public paths do not work in email).
 */
export function absolutePublicUrl(path: string): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");
  if (!base) return "";
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

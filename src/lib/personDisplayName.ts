/**
 * Shared formatting for Person name fields (first, middle, last, maiden, nickname).
 */

export type PersonNameFields = {
  firstName: string;
  middleName?: string | null;
  lastName: string;
  maidenName?: string | null;
  nickname?: string | null;
};

function collapseSpaces(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

/**
 * One-line display: First Middle Last, optional "nickname", optional (née Maiden).
 */
export function formatPersonDisplayName(p: PersonNameFields): string {
  const first = (p.firstName || "").trim();
  const middle = (p.middleName || "").trim();
  const last = (p.lastName || "").trim();
  const nick = (p.nickname || "").trim();
  const maiden = (p.maidenName || "").trim();

  let core = collapseSpaces([first, middle, last].filter(Boolean).join(" "));
  if (!core) core = first || last || "Unknown";

  if (nick) {
    core = `${core} "${nick}"`;
  }
  if (maiden) {
    core = `${core} (née ${maiden})`;
  }

  return core;
}

/**
 * Two-letter initials from first + last name (stable for avatars).
 */
export function getPersonInitials(p: PersonNameFields): string {
  const a = (p.firstName || "").trim()[0] || "";
  const b = (p.lastName || "").trim()[0] || "";

  return `${a}${b}`.toUpperCase() || "?";
}

/**
 * Initials from a free-form display or account name (e.g. "Jane Q. Public" → JP).
 */
export function getInitialsFromDisplayName(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0] || ""}${parts[parts.length - 1][0] || ""}`.toUpperCase();
}

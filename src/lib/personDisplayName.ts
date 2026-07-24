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

/** First letter suitable for an avatar initial (skips quotes/punctuation). */
function letterInitial(word: string): string {
  const match = word.match(/[\p{L}]/u);
  return match ? match[0].toUpperCase() : "";
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
  const a = letterInitial(p.firstName || "");
  const b = letterInitial(p.lastName || "");

  return `${a}${b}` || "?";
}

/**
 * Initials from a free-form display or account name (e.g. "Jane Q. Public" → JP).
 * Ignores quoted nicknames and parenthetical maiden names so
 * `Augustine Ochokolo "Agusto"` → AO, not A".
 */
export function getInitialsFromDisplayName(displayName: string): string {
  const cleaned = displayName
    .replace(/"[^"]*"/g, " ")
    .replace(/\([^)]*\)/g, " ")
    .trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);

  if (parts.length === 0) return "?";
  if (parts.length === 1) {
    const letters = [...parts[0]].filter((c) => /\p{L}/u.test(c)).slice(0, 2);
    return letters.join("").toUpperCase() || "?";
  }

  return (
    `${letterInitial(parts[0])}${letterInitial(parts[parts.length - 1])}` ||
    "?"
  );
}

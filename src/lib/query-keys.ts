export const queryKeys = {
  auth: {
    me: ["auth", "me"] as const,
  },
  trees: {
    list: (params: { mine?: boolean } = {}) =>
      ["trees", "list", params] as const,
    detail: (id: string | number) => ["trees", "detail", String(id)] as const,
  },
  persons: {
    summary: (params: { limit?: number } = {}) =>
      ["persons", "summary", params] as const,
    directory: (params: { search: string; limit: number }) =>
      ["persons", "directory", params] as const,
    byCode: (code: string) => ["persons", "byCode", code] as const,
    detail: (id: string | number) => ["persons", "detail", String(id)] as const,
    suggestions: (personId: string | number) =>
      ["persons", "suggestions", String(personId)] as const,
  },
  clans: {
    list: (params: { search: string } = { search: "" }) =>
      ["clans", "list", params] as const,
    detail: (id: string | number) => ["clans", "detail", String(id)] as const,
  },
  mergeRequests: {
    list: (params: { all?: boolean; status?: string } = {}) =>
      ["mergeRequests", "list", params] as const,
  },
  gamification: {
    quests: ["gamification", "quests"] as const,
    profile: ["gamification", "profile"] as const,
    activity: (limit: number) => ["gamification", "activity", limit] as const,
    achievements: ["gamification", "achievements"] as const,
    leaderboard: (limit: number) =>
      ["gamification", "leaderboard", limit] as const,
  },
  admin: {
    users: ["admin", "users"] as const,
    treesAll: ["admin", "treesAll"] as const,
    clansAll: ["admin", "clansAll"] as const,
  },
} as const;

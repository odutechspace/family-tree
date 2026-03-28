"use client";

const RARITY_STYLES: Record<string, { border: string; bg: string; glow: string; label: string }> = {
  common: {
    border: "border-border",
    bg: "bg-muted",
    glow: "",
    label: "text-muted-foreground",
  },
  uncommon: {
    border: "border-green-500 dark:border-green-600",
    bg: "bg-green-100 dark:bg-green-950/30",
    glow: "shadow-green-500/25 dark:shadow-green-900/40",
    label: "text-green-700 dark:text-green-400",
  },
  rare: {
    border: "border-blue-500 dark:border-blue-500",
    bg: "bg-blue-100 dark:bg-blue-950/30",
    glow: "shadow-blue-500/30 shadow-lg dark:shadow-blue-900/40",
    label: "text-blue-700 dark:text-blue-400",
  },
  epic: {
    border: "border-purple-500 dark:border-purple-500",
    bg: "bg-purple-100 dark:bg-purple-950/30",
    glow: "shadow-purple-500/35 shadow-xl dark:shadow-purple-900/50",
    label: "text-purple-700 dark:text-purple-400",
  },
  legendary: {
    border: "border-amber-400 dark:border-yellow-400",
    bg: "bg-amber-100 dark:bg-yellow-950/30",
    glow: "shadow-amber-400/40 shadow-xl dark:shadow-yellow-500/40",
    label: "text-amber-800 dark:text-yellow-400",
  },
};

interface Props {
  icon: string;
  name: string;
  description: string;
  rarity: string;
  category: string;
  xpReward: number;
  isUnlocked: boolean;
  unlockedAt?: string | null;
  size?: "sm" | "md" | "lg";
}

export default function AchievementBadge({
  icon,
  name,
  description,
  rarity,
  xpReward,
  isUnlocked,
  unlockedAt,
  size = "md",
}: Props) {
  const style = RARITY_STYLES[rarity] || RARITY_STYLES.common;

  const sizes = {
    sm: { wrap: "h-14 w-14", icon: "text-xl", ring: "border" },
    md: { wrap: "h-20 w-20", icon: "text-3xl", ring: "border-2" },
    lg: { wrap: "h-28 w-28", icon: "text-5xl", ring: "border-2" },
  };

  const s = sizes[size];

  return (
    <div className="group relative flex flex-col items-center gap-2">
      <div
        className={`relative flex ${s.wrap} items-center justify-center rounded-full ${s.ring} ${style.border} ${style.bg} ${style.glow} transition-transform group-hover:scale-105 ${!isUnlocked ? "opacity-40 grayscale" : ""}`}
      >
        <span className={s.icon}>{icon}</span>
        {isUnlocked && rarity === "legendary" && (
          <div className="absolute inset-0 animate-ping rounded-full border-2 border-amber-400 opacity-25 dark:border-yellow-400" />
        )}
      </div>
      {size !== "sm" && (
        <div className="text-center">
          <p className={`text-sm font-semibold ${isUnlocked ? "text-foreground" : "text-muted-foreground"}`}>{name}</p>
          {size === "lg" && (
            <p className="mt-0.5 max-w-28 text-xs leading-snug text-muted-foreground">{description}</p>
          )}
          <div className="mt-1 flex items-center justify-center gap-1">
            <span className={`text-xs capitalize ${style.label}`}>{rarity}</span>
            {xpReward > 0 && (
              <span className="text-xs font-medium text-amber-600 dark:text-amber-500">+{xpReward} XP</span>
            )}
          </div>
          {isUnlocked && unlockedAt && (
            <p className="text-xs text-muted-foreground">{new Date(unlockedAt).toLocaleDateString()}</p>
          )}
        </div>
      )}
    </div>
  );
}

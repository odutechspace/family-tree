"use client";

const RARITY_STYLES: Record<string, { border: string; bg: string; glow: string; label: string }> = {
  common:    { border: "border-stone-600",   bg: "bg-stone-800",     glow: "",                              label: "text-stone-400" },
  uncommon:  { border: "border-green-600",   bg: "bg-green-900/20",  glow: "",                              label: "text-green-400" },
  rare:      { border: "border-blue-500",    bg: "bg-blue-900/20",   glow: "shadow-blue-900/40 shadow-lg",  label: "text-blue-400" },
  epic:      { border: "border-purple-500",  bg: "bg-purple-900/20", glow: "shadow-purple-900/50 shadow-xl",label: "text-purple-400" },
  legendary: { border: "border-yellow-400",  bg: "bg-yellow-900/20", glow: "shadow-yellow-500/40 shadow-xl",label: "text-yellow-400" },
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

export default function AchievementBadge({ icon, name, description, rarity, xpReward, isUnlocked, unlockedAt, size = "md" }: Props) {
  const style = RARITY_STYLES[rarity] || RARITY_STYLES.common;

  const sizes = {
    sm: { wrap: "w-14 h-14", icon: "text-xl", ring: "border" },
    md: { wrap: "w-20 h-20", icon: "text-3xl", ring: "border-2" },
    lg: { wrap: "w-28 h-28", icon: "text-5xl", ring: "border-2" },
  };

  const s = sizes[size];

  return (
    <div className={`relative flex flex-col items-center gap-2 group`}>
      <div className={`${s.wrap} rounded-full ${s.ring} ${style.border} ${style.bg} ${style.glow} flex items-center justify-center relative transition-transform group-hover:scale-105 ${!isUnlocked ? "grayscale opacity-40" : ""}`}>
        <span className={s.icon}>{icon}</span>
        {isUnlocked && rarity === "legendary" && (
          <div className="absolute inset-0 rounded-full border-2 border-yellow-400 animate-ping opacity-20" />
        )}
      </div>
      {size !== "sm" && (
        <div className="text-center">
          <p className={`font-semibold text-sm ${isUnlocked ? "text-white" : "text-stone-600"}`}>{name}</p>
          {size === "lg" && <p className="text-stone-400 text-xs mt-0.5 max-w-28 leading-snug">{description}</p>}
          <div className="flex items-center gap-1 justify-center mt-1">
            <span className={`text-xs ${style.label} capitalize`}>{rarity}</span>
            {xpReward > 0 && <span className="text-xs text-amber-500">+{xpReward} XP</span>}
          </div>
          {isUnlocked && unlockedAt && (
            <p className="text-stone-600 text-xs">{new Date(unlockedAt).toLocaleDateString()}</p>
          )}
        </div>
      )}
    </div>
  );
}

"use client";

const TYPE_STYLES: Record<string, string> = {
  onboarding:
    "border-green-300 bg-green-50/90 dark:border-green-700/50 dark:bg-green-950/20",
  daily: "border-blue-300 bg-blue-50/90 dark:border-blue-700/50 dark:bg-blue-950/20",
  weekly: "border-purple-300 bg-purple-50/90 dark:border-purple-700/50 dark:bg-purple-950/20",
  discovery: "border-amber-300 bg-amber-50/90 dark:border-amber-700/50 dark:bg-amber-950/20",
};

const TYPE_BADGE: Record<string, string> = {
  onboarding: "bg-green-200 text-green-900 dark:bg-green-900/50 dark:text-green-300",
  daily: "bg-blue-200 text-blue-900 dark:bg-blue-900/50 dark:text-blue-300",
  weekly: "bg-purple-200 text-purple-900 dark:bg-purple-900/50 dark:text-purple-300",
  discovery: "bg-amber-200 text-amber-900 dark:bg-amber-900/50 dark:text-amber-300",
};

interface Props {
  icon: string;
  title: string;
  description: string;
  type: string;
  targetCount: number;
  xpReward: number;
  progress: number;
  isCompleted: boolean;
}

export default function QuestCard({
  icon,
  title,
  description,
  type,
  targetCount,
  xpReward,
  progress,
  isCompleted,
}: Props) {
  const pct = Math.min(Math.floor((progress / targetCount) * 100), 100);
  const cardStyle = TYPE_STYLES[type] || "border-border bg-card";
  const badgeStyle = TYPE_BADGE[type] || "bg-muted text-muted-foreground";

  return (
    <div className={`rounded-xl border p-4 transition ${cardStyle} ${isCompleted ? "opacity-70" : ""}`}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 text-2xl">{icon}</div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <p
              className={`text-sm font-semibold ${isCompleted ? "text-muted-foreground line-through" : "text-foreground"}`}
            >
              {title}
            </p>
            <span className={`rounded-full px-1.5 py-0.5 text-xs capitalize ${badgeStyle}`}>{type}</span>
            {isCompleted && <span className="text-xs font-medium text-emerald-600 dark:text-green-400">✓ Done</span>}
          </div>
          <p className="mb-2 text-xs leading-relaxed text-muted-foreground">{description}</p>

          {!isCompleted && (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {progress}/{targetCount}
                </span>
                <span className="text-xs font-medium text-amber-600 dark:text-amber-400">+{xpReward} XP</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    type === "daily"
                      ? "bg-blue-500"
                      : type === "weekly"
                        ? "bg-purple-500"
                        : type === "discovery"
                          ? "bg-amber-500"
                          : "bg-emerald-500"
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )}

          {isCompleted && (
            <span className="text-xs font-medium text-amber-600 dark:text-amber-400">+{xpReward} XP earned ✓</span>
          )}
        </div>
      </div>
    </div>
  );
}

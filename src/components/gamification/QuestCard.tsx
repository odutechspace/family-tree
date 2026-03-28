"use client";

const TYPE_STYLES: Record<string, string> = {
  onboarding: "border-green-700/50 bg-green-900/10",
  daily:      "border-blue-700/50 bg-blue-900/10",
  weekly:     "border-purple-700/50 bg-purple-900/10",
  discovery:  "border-amber-700/50 bg-amber-900/10",
};
const TYPE_BADGE: Record<string, string> = {
  onboarding: "bg-green-900/50 text-green-400",
  daily:      "bg-blue-900/50 text-blue-400",
  weekly:     "bg-purple-900/50 text-purple-400",
  discovery:  "bg-amber-900/50 text-amber-400",
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

export default function QuestCard({ icon, title, description, type, targetCount, xpReward, progress, isCompleted }: Props) {
  const pct = Math.min(Math.floor((progress / targetCount) * 100), 100);
  const cardStyle = TYPE_STYLES[type] || "border-stone-700 bg-stone-800";
  const badgeStyle = TYPE_BADGE[type] || "bg-stone-700 text-stone-400";

  return (
    <div className={`border rounded-xl p-4 transition ${cardStyle} ${isCompleted ? "opacity-60" : ""}`}>
      <div className="flex items-start gap-3">
        <div className="text-2xl mt-0.5">{icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <p className={`font-semibold text-sm ${isCompleted ? "text-stone-400 line-through" : "text-white"}`}>{title}</p>
            <span className={`text-xs px-1.5 py-0.5 rounded-full capitalize ${badgeStyle}`}>{type}</span>
            {isCompleted && <span className="text-xs text-green-400">✓ Done</span>}
          </div>
          <p className="text-stone-400 text-xs mb-2 leading-relaxed">{description}</p>

          {!isCompleted && (
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-stone-500 text-xs">{progress}/{targetCount}</span>
                <span className="text-amber-400 text-xs font-medium">+{xpReward} XP</span>
              </div>
              <div className="w-full h-2 bg-stone-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    type === "daily" ? "bg-blue-500" :
                    type === "weekly" ? "bg-purple-500" :
                    type === "discovery" ? "bg-amber-500" : "bg-green-500"
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )}

          {isCompleted && (
            <span className="text-xs text-amber-400 font-medium">+{xpReward} XP earned ✓</span>
          )}
        </div>
      </div>
    </div>
  );
}

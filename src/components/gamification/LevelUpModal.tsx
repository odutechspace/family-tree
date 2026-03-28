"use client";
import { useEffect, useState } from "react";

const LEVEL_NAMES = [
  "Seedling",
  "Root Finder",
  "Branch Builder",
  "Tree Keeper",
  "Elder Scribe",
  "Clan Historian",
  "Ancestral Voice",
  "Griot Master",
];
const LEVEL_ICONS = ["🌱", "🔍", "🌿", "🌳", "✍️", "🦁", "🎙️", "🏆"];

interface Props {
  newLevel: number;
  newLevelName: string;
  onClose: () => void;
}

export default function LevelUpModal({
  newLevel,
  newLevelName,
  onClose,
}: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setTimeout(() => setVisible(true), 50);
  }, []);

  const icon = LEVEL_ICONS[newLevel - 1] || "⭐";

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-black/80 transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0"}`}
    >
      <div
        className={`relative bg-stone-900 border-2 border-amber-500 rounded-3xl p-10 max-w-sm w-full mx-4 text-center transition-all duration-500 ${visible ? "scale-100 opacity-100" : "scale-75 opacity-0"}`}
      >
        {/* Confetti-like particles */}
        <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="absolute animate-bounce"
              style={{
                left: `${Math.random() * 90}%`,
                top: `${Math.random() * 90}%`,
                animationDelay: `${Math.random() * 0.5}s`,
                animationDuration: `${0.8 + Math.random() * 0.5}s`,
                fontSize: `${12 + Math.floor(Math.random() * 8)}px`,
              }}
            >
              {["✨", "🌟", "⭐", "💫"][Math.floor(Math.random() * 4)]}
            </div>
          ))}
        </div>

        <div className="text-7xl mb-4 animate-bounce">{icon}</div>
        <p className="text-amber-400 text-sm font-semibold uppercase tracking-widest mb-2">
          Level Up!
        </p>
        <h2 className="text-3xl font-bold text-white mb-1">Level {newLevel}</h2>
        <p className="text-amber-300 text-xl font-semibold mb-6">
          {newLevelName}
        </p>

        <p className="text-stone-400 text-sm mb-8 leading-relaxed">
          The ancestors are proud. Keep adding family members, recording
          stories, and preserving your heritage.
        </p>

        <button
          className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl transition text-lg"
          onClick={onClose}
        >
          Continue Building 🌳
        </button>
      </div>
    </div>
  );
}

interface AchievementToastProps {
  achievements: Array<{
    key: string;
    name: string;
    icon: string;
    xpReward: number;
  }>;
  onClose: () => void;
}

export function AchievementToast({
  achievements,
  onClose,
}: AchievementToastProps) {
  useEffect(() => {
    const t = setTimeout(onClose, 5000);

    return () => clearTimeout(t);
  }, []);

  return (
    <div className="fixed bottom-6 right-6 z-[90] flex flex-col gap-2 max-w-xs">
      {achievements.map((ach) => (
        <div
          key={ach.key}
          className="bg-stone-800 border border-amber-600 rounded-xl p-4 shadow-xl flex items-center gap-3 animate-slide-in"
        >
          <span className="text-3xl">{ach.icon}</span>
          <div>
            <p className="text-xs text-amber-400 font-semibold uppercase tracking-wide">
              Achievement Unlocked!
            </p>
            <p className="text-white font-semibold text-sm">{ach.name}</p>
            {ach.xpReward > 0 && (
              <p className="text-amber-300 text-xs">+{ach.xpReward} XP</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

interface QuestToastProps {
  quests: Array<{ key: string; title: string; icon: string; xpReward: number }>;
  onClose: () => void;
}

export function QuestCompletedToast({ quests, onClose }: QuestToastProps) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);

    return () => clearTimeout(t);
  }, []);

  return (
    <div className="fixed bottom-6 left-6 z-[90] flex flex-col gap-2 max-w-xs">
      {quests.map((q) => (
        <div
          key={q.key}
          className="bg-stone-800 border border-green-600 rounded-xl p-4 shadow-xl flex items-center gap-3"
        >
          <span className="text-2xl">{q.icon}</span>
          <div>
            <p className="text-xs text-green-400 font-semibold uppercase tracking-wide">
              Quest Complete!
            </p>
            <p className="text-white font-semibold text-sm">{q.title}</p>
            <p className="text-amber-300 text-xs">+{q.xpReward} XP</p>
          </div>
        </div>
      ))}
    </div>
  );
}

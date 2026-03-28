"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

interface XPProfile {
  totalXP: number;
  level: number;
  levelName: string;
  xpIntoLevel: number;
  xpNeededForLevel: number;
  progressPercent: number;
  currentStreak: number;
}

const LEVEL_COLORS = [
  "from-stone-500 to-stone-400",   // 1
  "from-green-700 to-green-500",   // 2
  "from-teal-700 to-teal-500",     // 3
  "from-blue-700 to-blue-500",     // 4
  "from-amber-700 to-amber-500",   // 5
  "from-orange-700 to-orange-500", // 6
  "from-purple-700 to-purple-500", // 7
  "from-yellow-600 to-yellow-400", // 8 — gold
];

const RARITY_RING = [
  "ring-stone-600",
  "ring-green-600",
  "ring-teal-600",
  "ring-blue-600",
  "ring-amber-500",
  "ring-orange-500",
  "ring-purple-500",
  "ring-yellow-400",
];

export default function XPBar({ compact = false }: { compact?: boolean }) {
  const [profile, setProfile] = useState<XPProfile | null>(null);

  useEffect(() => {
    fetch("/api/gamification/profile")
      .then(r => r.ok ? r.json() : null)
      .then(d => setProfile(d?.data || null));
  }, []);

  if (!profile) return null;

  const colorIdx = Math.min(profile.level - 1, LEVEL_COLORS.length - 1);
  const gradient = LEVEL_COLORS[colorIdx];
  const ring = RARITY_RING[colorIdx];

  if (compact) {
    return (
      <Link href="/achievements" className="flex items-center gap-2 group">
        <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${gradient} ring-2 ${ring} flex items-center justify-center text-xs font-bold text-white shadow`}>
          {profile.level}
        </div>
        <div className="hidden sm:block">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-stone-400 group-hover:text-amber-400 transition">{profile.xpIntoLevel}/{profile.xpNeededForLevel} XP</span>
            {profile.currentStreak > 0 && (
              <span className="text-xs text-orange-400">🔥{profile.currentStreak}</span>
            )}
          </div>
          <div className="w-20 h-1 bg-stone-700 rounded-full overflow-hidden">
            <div className={`h-full bg-gradient-to-r ${gradient} transition-all duration-500`} style={{ width: `${profile.progressPercent}%` }} />
          </div>
        </div>
      </Link>
    );
  }

  return (
    <div className="bg-stone-800 border border-stone-700 rounded-xl p-5">
      <div className="flex items-center gap-4 mb-4">
        <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${gradient} ring-2 ${ring} flex items-center justify-center text-xl font-bold text-white shadow-lg`}>
          {profile.level}
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <div>
              <span className="text-white font-semibold">{profile.levelName}</span>
              <span className="text-stone-500 text-sm ml-2">Level {profile.level}</span>
            </div>
            <div className="flex items-center gap-2">
              {profile.currentStreak > 0 && (
                <div className="flex items-center gap-1 bg-orange-900/30 border border-orange-700/50 px-2 py-0.5 rounded-full">
                  <span className="text-orange-400 text-sm">🔥</span>
                  <span className="text-orange-300 text-xs font-medium">{profile.currentStreak} day streak</span>
                </div>
              )}
              <span className="text-amber-400 text-sm font-semibold">{profile.totalXP.toLocaleString()} XP</span>
            </div>
          </div>
          <div className="w-full h-3 bg-stone-700 rounded-full overflow-hidden">
            <div className={`h-full bg-gradient-to-r ${gradient} rounded-full transition-all duration-700`} style={{ width: `${profile.progressPercent}%` }}>
              <div className="w-full h-full opacity-40 bg-white/20 animate-pulse" />
            </div>
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-stone-500 text-xs">{profile.xpIntoLevel} XP</span>
            <span className="text-stone-500 text-xs">{profile.xpNeededForLevel} XP to next level</span>
          </div>
        </div>
      </div>
    </div>
  );
}

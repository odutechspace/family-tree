"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

import { Card, CardContent } from "@/src/components/ui/card";

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
  "from-stone-500 to-stone-400",
  "from-green-600 to-emerald-400",
  "from-teal-600 to-cyan-400",
  "from-blue-600 to-sky-400",
  "from-amber-600 to-yellow-400",
  "from-orange-600 to-amber-400",
  "from-purple-600 to-violet-400",
  "from-yellow-500 to-amber-300",
];

const RARITY_RING = [
  "ring-stone-400 dark:ring-stone-600",
  "ring-green-500 dark:ring-green-600",
  "ring-teal-500 dark:ring-teal-600",
  "ring-blue-500 dark:ring-blue-600",
  "ring-amber-500 dark:ring-amber-500",
  "ring-orange-500 dark:ring-orange-500",
  "ring-purple-500 dark:ring-purple-500",
  "ring-yellow-400 dark:ring-yellow-400",
];

export default function XPBar({ compact = false }: { compact?: boolean }) {
  const [profile, setProfile] = useState<XPProfile | null>(null);

  useEffect(() => {
    fetch("/api/gamification/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setProfile(d?.data || null));
  }, []);

  if (!profile) return null;

  const colorIdx = Math.min(profile.level - 1, LEVEL_COLORS.length - 1);
  const gradient = LEVEL_COLORS[colorIdx];
  const ring = RARITY_RING[colorIdx];

  if (compact) {
    return (
      <Link className="group flex items-center gap-2" href="/achievements">
        <div
          className={`flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br ${gradient} text-xs font-bold text-white shadow ring-2 ${ring}`}
        >
          {profile.level}
        </div>
        <div className="hidden sm:block">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground transition group-hover:text-amber-600 dark:group-hover:text-amber-400">
              {profile.xpIntoLevel}/{profile.xpNeededForLevel} XP
            </span>
            {profile.currentStreak > 0 && (
              <span className="text-xs font-medium text-orange-600 dark:text-orange-400">
                🔥{profile.currentStreak}
              </span>
            )}
          </div>
          <div className="h-1 w-20 overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full bg-gradient-to-r ${gradient} transition-all duration-500`}
              style={{ width: `${profile.progressPercent}%` }}
            />
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Card className="overflow-hidden border-border shadow-sm">
      <CardContent className="p-5">
        <div className="mb-4 flex items-center gap-4">
          <div
            className={`flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br ${gradient} text-xl font-bold text-white shadow-lg ring-2 ${ring}`}
          >
            {profile.level}
          </div>
          <div className="flex-1">
            <div className="mb-1 flex items-center justify-between">
              <div>
                <span className="font-semibold text-foreground">
                  {profile.levelName}
                </span>
                <span className="ml-2 text-sm text-muted-foreground">
                  Level {profile.level}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {profile.currentStreak > 0 && (
                  <div className="flex items-center gap-1 rounded-full border border-orange-300 bg-orange-100 px-2 py-0.5 dark:border-orange-700/50 dark:bg-orange-950/40">
                    <span className="text-sm text-orange-600 dark:text-orange-400">
                      🔥
                    </span>
                    <span className="text-xs font-medium text-orange-800 dark:text-orange-300">
                      {profile.currentStreak} day streak
                    </span>
                  </div>
                )}
                <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                  {profile.totalXP.toLocaleString()} XP
                </span>
              </div>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${gradient} transition-all duration-700`}
                style={{ width: `${profile.progressPercent}%` }}
              >
                <div className="h-full w-full animate-pulse bg-white/20 opacity-40" />
              </div>
            </div>
            <div className="mt-1 flex justify-between">
              <span className="text-xs text-muted-foreground">
                {profile.xpIntoLevel} XP
              </span>
              <span className="text-xs text-muted-foreground">
                {profile.xpNeededForLevel} XP to next level
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

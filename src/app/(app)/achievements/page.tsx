"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

import AchievementBadge from "@/src/components/gamification/AchievementBadge";
import XPBar from "@/src/components/gamification/XPBar";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent } from "@/src/components/ui/card";

interface Achievement {
  id: number;
  key: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  rarity: string;
  xpReward: number;
  progressTarget?: number;
  progressField?: string;
  isUnlocked: boolean;
  unlockedAt?: string | null;
}

const CATEGORY_LABELS: Record<string, { label: string; icon: string }> = {
  builder: { label: "Builder", icon: "🏗️" },
  historian: { label: "Historian", icon: "📚" },
  connector: { label: "Connector", icon: "🔗" },
  explorer: { label: "Explorer", icon: "🧭" },
  social: { label: "Social", icon: "🤝" },
  streak: { label: "Streak", icon: "🔥" },
  milestone: { label: "Milestone", icon: "⭐" },
  special: { label: "Special", icon: "✨" },
};

export default function AchievementsPage() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [total, setTotal] = useState(0);
  const [totalUnlocked, setTotalUnlocked] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("all");

  useEffect(() => {
    fetch("/api/gamification/achievements")
      .then((r) => r.json())
      .then((d) => {
        setAchievements(d.data?.achievements || []);
        setTotal(d.data?.total || 0);
        setTotalUnlocked(d.data?.totalUnlocked || 0);
        setLoading(false);
      });
  }, []);

  const categories = ["all", ...Array.from(new Set(achievements.map((a) => a.category)))];
  const filtered = activeCategory === "all" ? achievements : achievements.filter((a) => a.category === activeCategory);
  const unlocked = filtered.filter((a) => a.isUnlocked);
  const locked = filtered.filter((a) => !a.isUnlocked);
  const pct = Math.floor((totalUnlocked / Math.max(total, 1)) * 100);

  return (
    <div className="min-h-screen bg-background px-4 py-8 text-foreground">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard">← Dashboard</Link>
          </Button>
        </div>

        <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-bold text-amber-600 dark:text-amber-400">Achievements</h1>
            <p className="mt-1 text-muted-foreground">
              {totalUnlocked}/{total} unlocked
            </p>
          </div>
          <Card className="border-border shadow-sm">
            <CardContent className="flex items-center gap-2 px-4 py-2">
              <div className="h-2 w-[120px] overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all dark:from-amber-600 dark:to-amber-400"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">{pct}%</span>
            </CardContent>
          </Card>
        </div>

        <XPBar />

        <div className="mb-6 mt-6 flex flex-wrap gap-2">
          {categories.map((cat) => (
            <Button
              key={cat}
              type="button"
              size="sm"
              variant={activeCategory === cat ? "default" : "secondary"}
              className={
                activeCategory === cat
                  ? "bg-amber-600 text-white hover:bg-amber-500 dark:bg-amber-600 dark:hover:bg-amber-500"
                  : "capitalize"
              }
              onClick={() => setActiveCategory(cat)}
            >
              {cat === "all" ? "All" : `${CATEGORY_LABELS[cat]?.icon || ""} ${CATEGORY_LABELS[cat]?.label || cat}`}
            </Button>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-3 gap-6 sm:grid-cols-4 md:grid-cols-5">
            {Array.from({ length: 15 }).map((_, i) => (
              <div key={i} className="h-32 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : (
          <>
            {unlocked.length > 0 && (
              <div className="mb-8">
                <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Unlocked ({unlocked.length})
                </h2>
                <div className="grid grid-cols-3 gap-6 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
                  {unlocked.map((a) => (
                    <AchievementBadge
                      key={a.key}
                      icon={a.icon}
                      name={a.name}
                      description={a.description}
                      rarity={a.rarity}
                      category={a.category}
                      xpReward={a.xpReward}
                      isUnlocked={true}
                      unlockedAt={a.unlockedAt}
                    />
                  ))}
                </div>
              </div>
            )}

            {locked.length > 0 && (
              <div>
                <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Locked ({locked.length})
                </h2>
                <div className="grid grid-cols-3 gap-6 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
                  {locked.map((a) => (
                    <AchievementBadge
                      key={a.key}
                      icon={a.icon}
                      name={a.name}
                      description={a.description}
                      rarity={a.rarity}
                      category={a.category}
                      xpReward={a.xpReward}
                      isUnlocked={false}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

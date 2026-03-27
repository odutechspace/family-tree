"use client";
import { useEffect, useState } from "react";
import AchievementBadge from "@/src/components/gamification/AchievementBadge";
import XPBar from "@/src/components/gamification/XPBar";
import Link from "next/link";

interface Achievement {
  id: number; key: string; name: string; description: string;
  icon: string; category: string; rarity: string; xpReward: number;
  progressTarget?: number; progressField?: string;
  isUnlocked: boolean; unlockedAt?: string | null;
}

const CATEGORY_LABELS: Record<string, { label: string; icon: string }> = {
  builder:    { label: "Builder",    icon: "🏗️" },
  historian:  { label: "Historian",  icon: "📚" },
  connector:  { label: "Connector",  icon: "🔗" },
  explorer:   { label: "Explorer",   icon: "🧭" },
  social:     { label: "Social",     icon: "🤝" },
  streak:     { label: "Streak",     icon: "🔥" },
  milestone:  { label: "Milestone",  icon: "⭐" },
  special:    { label: "Special",    icon: "✨" },
};

export default function AchievementsPage() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [total, setTotal] = useState(0);
  const [totalUnlocked, setTotalUnlocked] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("all");

  useEffect(() => {
    fetch("/api/gamification/achievements")
      .then(r => r.json())
      .then(d => {
        setAchievements(d.data?.achievements || []);
        setTotal(d.data?.total || 0);
        setTotalUnlocked(d.data?.totalUnlocked || 0);
        setLoading(false);
      });
  }, []);

  const categories = ["all", ...Array.from(new Set(achievements.map(a => a.category)))];
  const filtered = activeCategory === "all" ? achievements : achievements.filter(a => a.category === activeCategory);
  const unlocked = filtered.filter(a => a.isUnlocked);
  const locked = filtered.filter(a => !a.isUnlocked);

  return (
    <div className="min-h-screen bg-stone-950 text-white py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/dashboard" className="text-stone-400 hover:text-white">← Dashboard</Link>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-amber-400">Achievements</h1>
            <p className="text-stone-400 mt-1">{totalUnlocked}/{total} unlocked</p>
          </div>
          <div className="bg-stone-800 border border-stone-700 rounded-xl px-4 py-2">
            <div className="flex items-center gap-2">
              <div className="w-full h-2 bg-stone-700 rounded-full overflow-hidden" style={{ width: "120px" }}>
                <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${Math.floor((totalUnlocked / Math.max(total, 1)) * 100)}%` }} />
              </div>
              <span className="text-amber-400 text-sm font-semibold">{Math.floor((totalUnlocked / Math.max(total, 1)) * 100)}%</span>
            </div>
          </div>
        </div>

        <XPBar />

        {/* Category tabs */}
        <div className="flex gap-2 mt-6 mb-6 flex-wrap">
          {categories.map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition ${activeCategory === cat ? "bg-amber-600 text-white" : "bg-stone-800 text-stone-400 hover:text-white"}`}>
              {cat === "all" ? "All" : `${CATEGORY_LABELS[cat]?.icon || ""} ${CATEGORY_LABELS[cat]?.label || cat}`}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-6">
            {Array.from({ length: 15 }).map((_, i) => <div key={i} className="h-32 bg-stone-800 rounded-xl animate-pulse" />)}
          </div>
        ) : (
          <>
            {unlocked.length > 0 && (
              <div className="mb-8">
                <h2 className="text-sm font-semibold text-stone-400 uppercase tracking-wider mb-4">Unlocked ({unlocked.length})</h2>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-6">
                  {unlocked.map(a => (
                    <AchievementBadge key={a.key} icon={a.icon} name={a.name} description={a.description} rarity={a.rarity} category={a.category} xpReward={a.xpReward} isUnlocked={true} unlockedAt={a.unlockedAt} />
                  ))}
                </div>
              </div>
            )}

            {locked.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-stone-400 uppercase tracking-wider mb-4">Locked ({locked.length})</h2>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-6">
                  {locked.map(a => (
                    <AchievementBadge key={a.key} icon={a.icon} name={a.name} description={a.description} rarity={a.rarity} category={a.category} xpReward={a.xpReward} isUnlocked={false} />
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

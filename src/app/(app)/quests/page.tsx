"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

import QuestCard from "@/src/components/gamification/QuestCard";
import XPBar from "@/src/components/gamification/XPBar";
import { FadeIn, StaggerItem, StaggerList } from "@/src/components/motion";
import { Button } from "@/src/components/ui/button";

interface Quest {
  key: string; title: string; description: string; icon: string;
  type: string; targetCount: number; xpReward: number;
  progress: number; isCompleted: boolean; completedAt?: string | null;
}

interface QuestGroups {
  onboarding: Quest[];
  daily: Quest[];
  weekly: Quest[];
  discovery: Quest[];
}

const SECTION_META: Record<keyof QuestGroups, { label: string; desc: string; icon: string; color: string }> = {
  onboarding: { label: "Getting Started", desc: "Complete these once to learn the ropes", icon: "🌱", color: "text-green-400" },
  daily:      { label: "Daily Quests",    desc: "Refresh every day — stay consistent!",  icon: "☀️", color: "text-blue-400" },
  weekly:     { label: "Weekly Quests",   desc: "Bigger challenges, bigger rewards",      icon: "📅", color: "text-purple-400" },
  discovery:  { label: "Discoveries",     desc: "Special challenges to explore deeper",  icon: "🧭", color: "text-amber-400" },
};

export default function QuestsPage() {
  const [groups, setGroups] = useState<QuestGroups | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/gamification/quests")
      .then(r => r.json())
      .then(d => {
        setGroups(d.data?.quests || null);
        setLoading(false);
      });
  }, []);

  const totalXP = groups
    ? [...Object.values(groups)].flat().filter(q => q.isCompleted).reduce((acc, q) => acc + q.xpReward, 0)
    : 0;
  const totalCompleted = groups ? [...Object.values(groups)].flat().filter(q => q.isCompleted).length : 0;
  const total = groups ? [...Object.values(groups)].flat().length : 0;

  return (
    <div className="min-h-screen bg-background px-4 py-8 text-foreground">
      <div className="mx-auto max-w-3xl">
        <FadeIn className="mb-6 flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard">← Dashboard</Link>
          </Button>
        </FadeIn>

        <FadeIn className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center" delay={0.04}>
          <div>
            <h1 className="text-3xl font-bold text-amber-600 dark:text-amber-400">Quests</h1>
            <p className="mt-1 text-muted-foreground">
              {totalCompleted}/{total} completed · {totalXP} XP earned
            </p>
          </div>
        </FadeIn>

        <FadeIn delay={0.06}>
          <XPBar />
        </FadeIn>

        {loading ? (
          <div className="mt-6 space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : !groups ? (
          <p className="mt-8 text-center text-muted-foreground">Could not load quests.</p>
        ) : (
          <div className="mt-6 space-y-8">
            {(Object.keys(SECTION_META) as (keyof QuestGroups)[]).map((type, sectionIdx) => {
              const quests = groups[type];
              if (!quests || quests.length === 0) return null;
              const meta = SECTION_META[type];
              const completed = quests.filter((q) => q.isCompleted).length;

              return (
                <FadeIn key={type} delay={0.05 * sectionIdx}>
                  <section>
                    <div className="mb-3 flex items-center gap-2">
                      <span className="text-xl">{meta.icon}</span>
                      <div>
                        <h2 className={`font-bold ${meta.color}`}>{meta.label}</h2>
                        <p className="text-xs text-muted-foreground">
                          {meta.desc} · {completed}/{quests.length} done
                        </p>
                      </div>
                    </div>
                    <StaggerList className="space-y-2">
                      {quests.map((q) => (
                        <StaggerItem key={q.key}>
                          <QuestCard
                            icon={q.icon}
                            title={q.title}
                            description={q.description}
                            type={q.type}
                            targetCount={q.targetCount}
                            xpReward={q.xpReward}
                            progress={q.progress}
                            isCompleted={q.isCompleted}
                          />
                        </StaggerItem>
                      ))}
                    </StaggerList>
                  </section>
                </FadeIn>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

"use client";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import QuestCard from "@/src/components/gamification/QuestCard";
import { apiGetData } from "@/src/lib/api-fetch";
import { queryKeys } from "@/src/lib/query-keys";
import XPBar from "@/src/components/gamification/XPBar";

interface Quest {
  key: string;
  title: string;
  description: string;
  icon: string;
  type: string;
  targetCount: number;
  xpReward: number;
  progress: number;
  isCompleted: boolean;
  completedAt?: string | null;
}

interface QuestGroups {
  onboarding: Quest[];
  daily: Quest[];
  weekly: Quest[];
  discovery: Quest[];
}

const SECTION_META: Record<
  keyof QuestGroups,
  { label: string; desc: string; icon: string; color: string }
> = {
  onboarding: {
    label: "Getting Started",
    desc: "Complete these once to learn the ropes",
    icon: "🌱",
    color: "text-green-400",
  },
  daily: {
    label: "Daily Quests",
    desc: "Refresh every day — stay consistent!",
    icon: "☀️",
    color: "text-blue-400",
  },
  weekly: {
    label: "Weekly Quests",
    desc: "Bigger challenges, bigger rewards",
    icon: "📅",
    color: "text-purple-400",
  },
  discovery: {
    label: "Discoveries",
    desc: "Special challenges to explore deeper",
    icon: "🧭",
    color: "text-amber-400",
  },
};

export default function QuestsPage() {
  const { data, isPending } = useQuery({
    queryKey: queryKeys.gamification.quests,
    queryFn: () =>
      apiGetData<{ quests: QuestGroups }>("/api/gamification/quests"),
  });

  const groups = data?.quests ?? null;
  const loading = isPending;

  const totalXP = groups
    ? [...Object.values(groups)]
        .flat()
        .filter((q) => q.isCompleted)
        .reduce((acc, q) => acc + q.xpReward, 0)
    : 0;
  const totalCompleted = groups
    ? [...Object.values(groups)].flat().filter((q) => q.isCompleted).length
    : 0;
  const total = groups ? [...Object.values(groups)].flat().length : 0;

  return (
    <div className="min-h-screen bg-stone-950 text-white py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link className="text-stone-400 hover:text-white" href="/dashboard">
            ← Dashboard
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-amber-400">Quests</h1>
            <p className="text-stone-400 mt-1">
              {totalCompleted}/{total} completed · {totalXP} XP earned
            </p>
          </div>
        </div>

        <XPBar />

        {loading ? (
          <div className="space-y-3 mt-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-20 bg-stone-800 rounded-xl animate-pulse"
              />
            ))}
          </div>
        ) : !groups ? (
          <p className="text-stone-400 mt-8 text-center">
            Could not load quests.
          </p>
        ) : (
          <div className="mt-6 space-y-8">
            {(Object.keys(SECTION_META) as (keyof QuestGroups)[]).map(
              (type) => {
                const quests = groups[type];

                if (!quests || quests.length === 0) return null;
                const meta = SECTION_META[type];
                const completed = quests.filter((q) => q.isCompleted).length;

                return (
                  <section key={type}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xl">{meta.icon}</span>
                      <div>
                        <h2 className={`font-bold ${meta.color}`}>
                          {meta.label}
                        </h2>
                        <p className="text-stone-500 text-xs">
                          {meta.desc} · {completed}/{quests.length} done
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {quests.map((q) => (
                        <QuestCard
                          key={q.key}
                          description={q.description}
                          icon={q.icon}
                          isCompleted={q.isCompleted}
                          progress={q.progress}
                          targetCount={q.targetCount}
                          title={q.title}
                          type={q.type}
                          xpReward={q.xpReward}
                        />
                      ))}
                    </div>
                  </section>
                );
              },
            )}
          </div>
        )}
      </div>
    </div>
  );
}

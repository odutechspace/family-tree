"use client";
import { useQueries } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useAuth } from "@/src/hooks/useAuth";
import { apiGetData } from "@/src/lib/api-fetch";
import { queryKeys } from "@/src/lib/query-keys";
import XPBar from "@/src/components/gamification/XPBar";
import QuestCard from "@/src/components/gamification/QuestCard";
import AchievementBadge from "@/src/components/gamification/AchievementBadge";
import { Button } from "@/src/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/card";

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
}
interface RecentAchievement {
  key: string;
  name: string;
  icon: string;
  rarity: string;
  category: string;
  description: string;
  xpReward: number;
  isUnlocked: boolean;
  unlockedAt: string;
}

export default function DashboardPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const dashboardEnabled = !!user;

  const [
    treesQuery,
    personsQuery,
    mergesQuery,
    questsQuery,
    profileQuery,
    activityQuery,
  ] = useQueries({
    queries: [
      {
        queryKey: queryKeys.trees.list({ mine: true }),
        queryFn: () => apiGetData<{ trees: unknown[] }>("/api/trees?mine=1"),
        enabled: dashboardEnabled,
      },
      {
        queryKey: queryKeys.persons.summary({ limit: 1 }),
        queryFn: () => apiGetData<{ total: number }>("/api/persons?limit=1"),
        enabled: dashboardEnabled,
      },
      {
        queryKey: queryKeys.mergeRequests.list({ status: "pending" }),
        queryFn: () =>
          apiGetData<{ requests: unknown[] }>(
            "/api/merge-requests?status=pending",
          ),
        enabled: dashboardEnabled,
      },
      {
        queryKey: queryKeys.gamification.quests,
        queryFn: () =>
          apiGetData<{
            quests: {
              daily?: Quest[];
              onboarding?: Quest[];
            };
          }>("/api/gamification/quests"),
        enabled: dashboardEnabled,
      },
      {
        queryKey: queryKeys.gamification.profile,
        queryFn: () =>
          apiGetData<{ recentAchievements?: RecentAchievement[] }>(
            "/api/gamification/profile",
          ),
        enabled: dashboardEnabled,
      },
      {
        queryKey: queryKeys.gamification.activity(8),
        queryFn: () =>
          apiGetData<{
            events: {
              id: string;
              type: string;
              description?: string;
              createdAt: string;
              xpAwarded?: number;
            }[];
          }>("/api/gamification/activity?limit=8"),
        enabled: dashboardEnabled,
      },
    ],
  });

  const stats = useMemo(
    () => ({
      trees: (treesQuery.data?.trees ?? []).length,
      persons: personsQuery.data?.total ?? 0,
      pendingMerges: (mergesQuery.data?.requests ?? []).length,
    }),
    [treesQuery.data, personsQuery.data, mergesQuery.data],
  );

  const todayQuests = useMemo(() => {
    const q = questsQuery.data?.quests;

    if (!q) return [];
    const daily = (q.daily ?? []).filter((x) => !x.isCompleted).slice(0, 3);
    const onboarding = (q.onboarding ?? [])
      .filter((x) => !x.isCompleted)
      .slice(0, 2);

    return [...onboarding, ...daily].slice(0, 4);
  }, [questsQuery.data]);

  const recentAchievements = useMemo(
    () => profileQuery.data?.recentAchievements?.slice(0, 4) ?? [],
    [profileQuery.data],
  );

  const activityFeed = useMemo(
    () => activityQuery.data?.events ?? [],
    [activityQuery.data],
  );

  useEffect(() => {
    if (!loading && !user) router.push("/auth/login");
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        Loading...
      </div>
    );
  }

  const XP_ICONS: Record<string, string> = {
    add_person: "👤",
    add_relationship: "🔗",
    add_life_event: "📅",
    add_photo: "📷",
    write_biography: "📖",
    write_oral_history: "🎙️",
    create_tree: "🌳",
    create_clan: "🦁",
    submit_merge_request: "🔗",
    merge_approved: "🤝",
    daily_streak: "🔥",
    weekly_streak: "⚡",
    achievement_unlocked: "🏆",
    quest_completed: "✅",
  };

  return (
    <div className="min-h-screen bg-background px-4 py-8 text-foreground">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Welcome back,{" "}
              <span
                className="text-amber-600 dark:text-amber-400 inline-block max-w-full truncate align-bottom"
                title={user.displayName || user.name}
              >
                {user.displayName || user.name}
              </span>
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Keep building your family legacy
            </p>
          </div>
          <Button
            className="text-muted-foreground hover:text-destructive"
            size="sm"
            variant="ghost"
            onClick={logout}
          >
            Sign Out
          </Button>
        </div>

        <div className="mb-6">
          <XPBar />
        </div>

        <div className="mb-6 grid grid-cols-3 gap-3">
          <StatCard
            href="/trees?mine=1"
            icon="🌳"
            label="My Trees"
            value={stats.trees}
          />
          <StatCard
            href="/persons"
            icon="👥"
            label="People"
            value={stats.persons}
          />
          <StatCard
            highlight={stats.pendingMerges > 0}
            href="/merge-requests"
            icon="🔗"
            label="Pending Merges"
            value={stats.pendingMerges}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <ActionCard
                color="blue"
                href="/persons/new"
                icon="👤"
                title="Add Person"
              />
              <ActionCard
                color="green"
                href="/trees/new"
                icon="🌳"
                title="New Tree"
              />
              <ActionCard
                color="amber"
                href="/merge-requests/new"
                icon="🔗"
                title="Merge History"
              />
              <ActionCard
                color="orange"
                href="/clans/new"
                icon="🦁"
                title="Add Clan"
              />
              <ActionCard
                color="purple"
                href="/persons"
                icon="🔍"
                title="Browse People"
              />
              <ActionCard
                color="red"
                href="/quests"
                icon="🎯"
                title="View Quests"
              />
            </div>

            {todayQuests.length > 0 && (
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="flex items-center gap-2 font-semibold text-amber-600 dark:text-amber-400">
                    <span>🎯</span> Active Quests
                  </h2>
                  <Button
                    asChild
                    className="h-auto p-0 text-xs text-muted-foreground hover:text-amber-600 dark:hover:text-amber-400"
                    variant="link"
                  >
                    <Link href="/quests">View all →</Link>
                  </Button>
                </div>
                <div className="space-y-2">
                  {todayQuests.map((q) => (
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
              </div>
            )}
          </div>

          <div className="space-y-6">
            {recentAchievements.length > 0 && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-base font-semibold text-amber-600 dark:text-amber-400">
                    Recent Badges
                  </CardTitle>
                  <Button
                    asChild
                    className="h-auto p-0 text-xs text-muted-foreground hover:text-amber-600 dark:hover:text-amber-400"
                    variant="link"
                  >
                    <Link href="/achievements">View all →</Link>
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-2">
                    {recentAchievements.map((a) => (
                      <AchievementBadge
                        key={a.key}
                        category={a.category}
                        description={a.description}
                        icon={a.icon}
                        isUnlocked={true}
                        name={a.name}
                        rarity={a.rarity}
                        size="sm"
                        unlockedAt={a.unlockedAt}
                        xpReward={a.xpReward}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardContent className="space-y-1 p-2">
                <Button
                  asChild
                  className="h-auto w-full justify-between px-3 py-2 font-normal"
                  variant="ghost"
                >
                  <Link href="/achievements">
                    <span className="flex items-center gap-2 text-sm text-foreground">
                      <span>🏆</span> Achievements
                    </span>
                    <span className="text-xs text-muted-foreground">→</span>
                  </Link>
                </Button>
                <Button
                  asChild
                  className="h-auto w-full justify-between px-3 py-2 font-normal"
                  variant="ghost"
                >
                  <Link href="/quests">
                    <span className="flex items-center gap-2 text-sm text-foreground">
                      <span>🎯</span> Quests
                    </span>
                    <span className="text-xs text-muted-foreground">→</span>
                  </Link>
                </Button>
                <Button
                  asChild
                  className="h-auto w-full justify-between px-3 py-2 font-normal"
                  variant="ghost"
                >
                  <Link href="/leaderboard">
                    <span className="flex items-center gap-2 text-sm text-foreground">
                      <span>🏅</span> Leaderboard
                    </span>
                    <span className="text-xs text-muted-foreground">→</span>
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {activityFeed.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold text-amber-600 dark:text-amber-400">
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2.5">
                    {activityFeed.slice(0, 6).map((ev) => (
                      <div key={ev.id} className="flex items-center gap-2">
                        <span className="text-base">
                          {XP_ICONS[ev.type] || "⚡"}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs text-foreground">
                            {ev.description || ev.type.replace(/_/g, " ")}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(ev.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        {ev.xpAwarded != null && ev.xpAwarded > 0 && (
                          <span className="flex-shrink-0 text-xs font-medium text-amber-600 dark:text-amber-400">
                            +{ev.xpAwarded}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {user.role === "admin" && (
          <Card className="mt-6 border-amber-300 bg-gradient-to-r from-amber-500/10 to-orange-500/5 dark:border-amber-700/50 dark:from-amber-900/25 dark:to-orange-950/20">
            <CardContent className="flex flex-col items-stretch justify-between gap-4 p-5 sm:flex-row sm:items-center">
              <div>
                <h2 className="font-semibold text-amber-700 dark:text-amber-400">
                  Admin Panel
                </h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Manage users, review merges, oversee data
                </p>
              </div>
              <Button
                asChild
                className="shrink-0 bg-amber-600 text-white hover:bg-amber-500 dark:bg-amber-600 dark:hover:bg-amber-500"
              >
                <Link href="/admin">Open Admin →</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function StatCard({
  href,
  value,
  label,
  icon,
  highlight,
}: {
  href: string;
  value: number;
  label: string;
  icon: string;
  highlight?: boolean;
}) {
  return (
    <Link
      className={`rounded-xl border bg-card p-4 text-center shadow-sm transition-colors ${
        highlight
          ? "border-amber-500 dark:border-amber-500"
          : "border-border hover:border-amber-400/60 dark:hover:border-amber-500/50"
      }`}
      href={href}
    >
      <p className="mb-1 text-2xl">{icon}</p>
      <p
        className={`text-xl font-bold ${highlight ? "text-amber-600 dark:text-amber-400" : "text-foreground"}`}
      >
        {value}
      </p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </Link>
  );
}

function ActionCard({
  href,
  icon,
  title,
  color,
}: {
  href: string;
  icon: string;
  title: string;
  color: string;
}) {
  const borders: Record<string, string> = {
    blue: "hover:border-blue-500 hover:bg-blue-50/50 dark:hover:border-blue-500/60 dark:hover:bg-blue-950/20",
    green:
      "hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:border-green-500/60 dark:hover:bg-green-950/20",
    amber:
      "hover:border-amber-500 hover:bg-amber-50/50 dark:hover:border-amber-500/60 dark:hover:bg-amber-950/20",
    orange:
      "hover:border-orange-500 hover:bg-orange-50/50 dark:hover:border-orange-500/60 dark:hover:bg-orange-950/20",
    purple:
      "hover:border-purple-500 hover:bg-purple-50/50 dark:hover:border-purple-500/60 dark:hover:bg-purple-950/20",
    red: "hover:border-red-500 hover:bg-red-50/50 dark:hover:border-red-500/60 dark:hover:bg-red-950/20",
  };

  return (
    <Link
      className={`group flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-4 shadow-sm transition-colors ${borders[color]}`}
      href={href}
    >
      <span className="text-2xl">{icon}</span>
      <span className="text-center text-xs font-medium text-muted-foreground transition-colors group-hover:text-amber-600 dark:group-hover:text-amber-400">
        {title}
      </span>
    </Link>
  );
}

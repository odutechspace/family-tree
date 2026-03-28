"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useAuth } from "@/src/hooks/useAuth";
import XPBar from "@/src/components/gamification/XPBar";
import QuestCard from "@/src/components/gamification/QuestCard";
import AchievementBadge from "@/src/components/gamification/AchievementBadge";
import { FadeIn, StaggerItem, StaggerList } from "@/src/components/motion";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";

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
  const [stats, setStats] = useState({ trees: 0, persons: 0, pendingMerges: 0 });
  const [todayQuests, setTodayQuests] = useState<Quest[]>([]);
  const [recentAchievements, setRecentAchievements] = useState<RecentAchievement[]>([]);
  const [activityFeed, setActivityFeed] = useState<{ id: string; type: string; description?: string; createdAt: string; xpAwarded?: number }[]>(
    [],
  );

  useEffect(() => {
    if (!loading && !user) router.push("/auth/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;

    Promise.all([
      fetch("/api/trees?mine=1").then((r) => r.json()),
      fetch("/api/persons?limit=1").then((r) => r.json()),
      fetch("/api/merge-requests?status=pending").then((r) => r.json()),
      fetch("/api/gamification/quests").then((r) => r.json()),
      fetch("/api/gamification/profile").then((r) => r.json()),
      fetch("/api/gamification/activity?limit=8").then((r) => r.json()),
    ]).then(([treesData, personsData, mergesData, questsData, profileData, activityData]) => {
      setStats({
        trees: (treesData.data?.trees || []).length,
        persons: personsData.data?.total || 0,
        pendingMerges: (mergesData.data?.requests || []).length,
      });

      const q = questsData.data?.quests;
      if (q) {
        const daily = (q.daily || []).filter((x: Quest) => !x.isCompleted).slice(0, 3);
        const onboarding = (q.onboarding || []).filter((x: Quest) => !x.isCompleted).slice(0, 2);
        setTodayQuests([...onboarding, ...daily].slice(0, 4));
      }

      setRecentAchievements(profileData.data?.recentAchievements?.slice(0, 4) || []);
      setActivityFeed(activityData.data?.events || []);
    });
  }, [user]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">Loading...</div>
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
        <FadeIn className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Welcome back,{" "}
              <span className="text-amber-600 dark:text-amber-400">{user.name.split(" ")[0]}</span>
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">Keep building your family legacy</p>
          </div>
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive" onClick={logout}>
            Sign Out
          </Button>
        </FadeIn>

        <FadeIn className="mb-6" delay={0.06}>
          <XPBar />
        </FadeIn>

        <StaggerList className="mb-6 grid grid-cols-3 gap-3">
          <StaggerItem>
            <StatCard href="/trees?mine=1" value={stats.trees} label="My Trees" icon="🌳" />
          </StaggerItem>
          <StaggerItem>
            <StatCard href="/persons" value={stats.persons} label="People" icon="👥" />
          </StaggerItem>
          <StaggerItem>
            <StatCard
              href="/merge-requests"
              value={stats.pendingMerges}
              label="Pending Merges"
              icon="🔗"
              highlight={stats.pendingMerges > 0}
            />
          </StaggerItem>
        </StaggerList>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <StaggerList className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <StaggerItem>
                <ActionCard href="/persons/new" icon="👤" title="Add Person" color="blue" />
              </StaggerItem>
              <StaggerItem>
                <ActionCard href="/trees/new" icon="🌳" title="New Tree" color="green" />
              </StaggerItem>
              <StaggerItem>
                <ActionCard href="/merge-requests/new" icon="🔗" title="Merge History" color="amber" />
              </StaggerItem>
              <StaggerItem>
                <ActionCard href="/clans/new" icon="🦁" title="Add Clan" color="orange" />
              </StaggerItem>
              <StaggerItem>
                <ActionCard href="/persons" icon="🔍" title="Browse People" color="purple" />
              </StaggerItem>
              <StaggerItem>
                <ActionCard href="/quests" icon="🎯" title="View Quests" color="red" />
              </StaggerItem>
            </StaggerList>

            {todayQuests.length > 0 && (
              <FadeIn delay={0.08}>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="flex items-center gap-2 font-semibold text-amber-600 dark:text-amber-400">
                    <span>🎯</span> Active Quests
                  </h2>
                  <Button variant="link" className="h-auto p-0 text-xs text-muted-foreground hover:text-amber-600 dark:hover:text-amber-400" asChild>
                    <Link href="/quests">View all →</Link>
                  </Button>
                </div>
                <StaggerList className="space-y-2">
                  {todayQuests.map((q) => (
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
              </FadeIn>
            )}
          </div>

          <div className="space-y-6">
            {recentAchievements.length > 0 && (
              <FadeIn delay={0.05}>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-base font-semibold text-amber-600 dark:text-amber-400">Recent Badges</CardTitle>
                  <Button variant="link" className="h-auto p-0 text-xs text-muted-foreground hover:text-amber-600 dark:hover:text-amber-400" asChild>
                    <Link href="/achievements">View all →</Link>
                  </Button>
                </CardHeader>
                <CardContent>
                  <StaggerList className="grid grid-cols-4 gap-2">
                    {recentAchievements.map((a) => (
                      <StaggerItem key={a.key}>
                        <AchievementBadge
                          icon={a.icon}
                          name={a.name}
                          description={a.description}
                          rarity={a.rarity}
                          category={a.category}
                          xpReward={a.xpReward}
                          isUnlocked={true}
                          unlockedAt={a.unlockedAt}
                          size="sm"
                        />
                      </StaggerItem>
                    ))}
                  </StaggerList>
                </CardContent>
              </Card>
              </FadeIn>
            )}

            <FadeIn delay={0.07}>
            <Card>
              <CardContent className="space-y-1 p-2">
                <Button variant="ghost" className="h-auto w-full justify-between px-3 py-2 font-normal" asChild>
                  <Link href="/achievements">
                    <span className="flex items-center gap-2 text-sm text-foreground">
                      <span>🏆</span> Achievements
                    </span>
                    <span className="text-xs text-muted-foreground">→</span>
                  </Link>
                </Button>
                <Button variant="ghost" className="h-auto w-full justify-between px-3 py-2 font-normal" asChild>
                  <Link href="/quests">
                    <span className="flex items-center gap-2 text-sm text-foreground">
                      <span>🎯</span> Quests
                    </span>
                    <span className="text-xs text-muted-foreground">→</span>
                  </Link>
                </Button>
                <Button variant="ghost" className="h-auto w-full justify-between px-3 py-2 font-normal" asChild>
                  <Link href="/leaderboard">
                    <span className="flex items-center gap-2 text-sm text-foreground">
                      <span>🏅</span> Leaderboard
                    </span>
                    <span className="text-xs text-muted-foreground">→</span>
                  </Link>
                </Button>
              </CardContent>
            </Card>
            </FadeIn>

            {activityFeed.length > 0 && (
              <FadeIn delay={0.09}>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold text-amber-600 dark:text-amber-400">Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <StaggerList className="space-y-2.5">
                    {activityFeed.slice(0, 6).map((ev) => (
                      <StaggerItem key={ev.id}>
                        <div className="flex items-center gap-2">
                          <span className="text-base">{XP_ICONS[ev.type] || "⚡"}</span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs text-foreground">
                              {ev.description || ev.type.replace(/_/g, " ")}
                            </p>
                            <p className="text-xs text-muted-foreground">{new Date(ev.createdAt).toLocaleDateString()}</p>
                          </div>
                          {ev.xpAwarded != null && ev.xpAwarded > 0 && (
                            <span className="flex-shrink-0 text-xs font-medium text-amber-600 dark:text-amber-400">
                              +{ev.xpAwarded}
                            </span>
                          )}
                        </div>
                      </StaggerItem>
                    ))}
                  </StaggerList>
                </CardContent>
              </Card>
              </FadeIn>
            )}
          </div>
        </div>

        {user.role === "admin" && (
          <FadeIn className="mt-6" delay={0.1}>
          <Card className="border-amber-300 bg-gradient-to-r from-amber-500/10 to-orange-500/5 dark:border-amber-700/50 dark:from-amber-900/25 dark:to-orange-950/20">
            <CardContent className="flex flex-col items-stretch justify-between gap-4 p-5 sm:flex-row sm:items-center">
              <div>
                <h2 className="font-semibold text-amber-700 dark:text-amber-400">Admin Panel</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">Manage users, review merges, oversee data</p>
              </div>
              <Button
                className="shrink-0 bg-amber-600 text-white hover:bg-amber-500 dark:bg-amber-600 dark:hover:bg-amber-500"
                asChild
              >
                <Link href="/admin">Open Admin →</Link>
              </Button>
            </CardContent>
          </Card>
          </FadeIn>
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
      href={href}
      className={`rounded-xl border bg-card p-4 text-center shadow-sm transition-colors ${
        highlight
          ? "border-amber-500 dark:border-amber-500"
          : "border-border hover:border-amber-400/60 dark:hover:border-amber-500/50"
      }`}
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
    green: "hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:border-green-500/60 dark:hover:bg-green-950/20",
    amber: "hover:border-amber-500 hover:bg-amber-50/50 dark:hover:border-amber-500/60 dark:hover:bg-amber-950/20",
    orange: "hover:border-orange-500 hover:bg-orange-50/50 dark:hover:border-orange-500/60 dark:hover:bg-orange-950/20",
    purple: "hover:border-purple-500 hover:bg-purple-50/50 dark:hover:border-purple-500/60 dark:hover:bg-purple-950/20",
    red: "hover:border-red-500 hover:bg-red-50/50 dark:hover:border-red-500/60 dark:hover:bg-red-950/20",
  };
  return (
    <Link
      href={href}
      className={`group flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-4 shadow-sm transition-colors ${borders[color]}`}
    >
      <span className="text-2xl">{icon}</span>
      <span className="text-center text-xs font-medium text-muted-foreground transition-colors group-hover:text-amber-600 dark:group-hover:text-amber-400">
        {title}
      </span>
    </Link>
  );
}

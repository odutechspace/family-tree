"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/src/hooks/useAuth";
import { useRouter } from "next/navigation";
import XPBar from "@/src/components/gamification/XPBar";
import QuestCard from "@/src/components/gamification/QuestCard";
import AchievementBadge from "@/src/components/gamification/AchievementBadge";

interface Quest {
  key: string; title: string; description: string; icon: string;
  type: string; targetCount: number; xpReward: number;
  progress: number; isCompleted: boolean;
}
interface RecentAchievement {
  key: string; name: string; icon: string; rarity: string; category: string;
  description: string; xpReward: number; isUnlocked: boolean; unlockedAt: string;
}

export default function DashboardPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState({ trees: 0, persons: 0, pendingMerges: 0 });
  const [todayQuests, setTodayQuests] = useState<Quest[]>([]);
  const [recentAchievements, setRecentAchievements] = useState<RecentAchievement[]>([]);
  const [activityFeed, setActivityFeed] = useState<any[]>([]);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading]);

  useEffect(() => {
    if (!user) return;

    Promise.all([
      fetch("/api/trees?mine=1").then(r => r.json()),
      fetch("/api/persons?limit=1").then(r => r.json()),
      fetch("/api/merge-requests?status=pending").then(r => r.json()),
      fetch("/api/gamification/quests").then(r => r.json()),
      fetch("/api/gamification/profile").then(r => r.json()),
      fetch("/api/gamification/activity?limit=8").then(r => r.json()),
    ]).then(([treesData, personsData, mergesData, questsData, profileData, activityData]) => {
      setStats({
        trees: (treesData.data?.trees || []).length,
        persons: personsData.data?.total || 0,
        pendingMerges: (mergesData.data?.requests || []).length,
      });

      // Today's quests: daily + any incomplete onboarding
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

  if (loading || !user) return <div className="min-h-screen bg-stone-950 flex items-center justify-center text-stone-400">Loading...</div>;

  const XP_ICONS: Record<string, string> = {
    add_person: "👤", add_relationship: "🔗", add_life_event: "📅",
    add_photo: "📷", write_biography: "📖", write_oral_history: "🎙️",
    create_tree: "🌳", create_clan: "🦁", submit_merge_request: "🔗",
    merge_approved: "🤝", daily_streak: "🔥", weekly_streak: "⚡",
    achievement_unlocked: "🏆", quest_completed: "✅",
  };

  return (
    <div className="min-h-screen bg-stone-950 text-white py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Welcome back, <span className="text-amber-400">{user.name.split(" ")[0]}</span></h1>
            <p className="text-stone-400 mt-0.5 text-sm">Keep building your family legacy</p>
          </div>
          <button onClick={logout} className="text-stone-500 hover:text-red-400 text-sm transition">Sign Out</button>
        </div>

        {/* XP Progress Bar */}
        <div className="mb-6">
          <XPBar />
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <StatCard href="/trees?mine=1" value={stats.trees} label="My Trees" icon="🌳" />
          <StatCard href="/persons" value={stats.persons} label="People" icon="👥" />
          <StatCard href="/merge-requests" value={stats.pendingMerges} label="Pending Merges" icon="🔗" highlight={stats.pendingMerges > 0} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Quick actions + Quests */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick actions */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <ActionCard href="/persons/new" icon="👤" title="Add Person" color="blue" />
              <ActionCard href="/trees/new" icon="🌳" title="New Tree" color="green" />
              <ActionCard href="/merge-requests/new" icon="🔗" title="Merge History" color="amber" />
              <ActionCard href="/clans/new" icon="🦁" title="Add Clan" color="orange" />
              <ActionCard href="/persons" icon="🔍" title="Browse People" color="purple" />
              <ActionCard href="/quests" icon="🎯" title="View Quests" color="red" />
            </div>

            {/* Today's quests */}
            {todayQuests.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-amber-400 font-semibold flex items-center gap-2">
                    <span>🎯</span> Active Quests
                  </h2>
                  <Link href="/quests" className="text-stone-400 hover:text-amber-400 text-xs transition">View all →</Link>
                </div>
                <div className="space-y-2">
                  {todayQuests.map(q => <QuestCard key={q.key} icon={q.icon} title={q.title} description={q.description} type={q.type} targetCount={q.targetCount} xpReward={q.xpReward} progress={q.progress} isCompleted={q.isCompleted} />)}
                </div>
              </div>
            )}
          </div>

          {/* Right: Recent achievements + Activity */}
          <div className="space-y-6">
            {/* Recent achievements */}
            {recentAchievements.length > 0 && (
              <div className="bg-stone-800 border border-stone-700 rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-amber-400 font-semibold">Recent Badges</h2>
                  <Link href="/achievements" className="text-stone-400 hover:text-amber-400 text-xs transition">View all →</Link>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {recentAchievements.map(a => (
                    <AchievementBadge key={a.key} icon={a.icon} name={a.name} description={a.description} rarity={a.rarity} category={a.category} xpReward={a.xpReward} isUnlocked={true} unlockedAt={a.unlockedAt} size="sm" />
                  ))}
                </div>
              </div>
            )}

            {/* Quick gamification nav */}
            <div className="bg-stone-800 border border-stone-700 rounded-xl p-4 space-y-2">
              <Link href="/achievements" className="flex items-center justify-between p-2 hover:bg-stone-700 rounded-lg transition">
                <span className="flex items-center gap-2 text-stone-300 text-sm"><span>🏆</span> Achievements</span>
                <span className="text-stone-500 text-xs">→</span>
              </Link>
              <Link href="/quests" className="flex items-center justify-between p-2 hover:bg-stone-700 rounded-lg transition">
                <span className="flex items-center gap-2 text-stone-300 text-sm"><span>🎯</span> Quests</span>
                <span className="text-stone-500 text-xs">→</span>
              </Link>
              <Link href="/leaderboard" className="flex items-center justify-between p-2 hover:bg-stone-700 rounded-lg transition">
                <span className="flex items-center gap-2 text-stone-300 text-sm"><span>🏅</span> Leaderboard</span>
                <span className="text-stone-500 text-xs">→</span>
              </Link>
            </div>

            {/* Activity feed */}
            {activityFeed.length > 0 && (
              <div className="bg-stone-800 border border-stone-700 rounded-xl p-5">
                <h2 className="text-amber-400 font-semibold mb-3">Recent Activity</h2>
                <div className="space-y-2.5">
                  {activityFeed.slice(0, 6).map((ev: any) => (
                    <div key={ev.id} className="flex items-center gap-2">
                      <span className="text-base">{XP_ICONS[ev.type] || "⚡"}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-stone-300 text-xs truncate">{ev.description || ev.type.replace(/_/g, " ")}</p>
                        <p className="text-stone-600 text-xs">{new Date(ev.createdAt).toLocaleDateString()}</p>
                      </div>
                      {ev.xpAwarded > 0 && <span className="text-amber-400 text-xs font-medium flex-shrink-0">+{ev.xpAwarded}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {user.role === "admin" && (
          <div className="mt-6 bg-amber-900/20 border border-amber-700/50 rounded-xl p-5 flex items-center justify-between">
            <div>
              <h2 className="text-amber-400 font-semibold">Admin Panel</h2>
              <p className="text-stone-400 text-sm mt-0.5">Manage users, review merges, oversee data</p>
            </div>
            <Link href="/admin" className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium rounded-lg transition">
              Open Admin →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ href, value, label, icon, highlight }: { href: string; value: number; label: string; icon: string; highlight?: boolean }) {
  return (
    <Link href={href} className={`bg-stone-800 border rounded-xl p-4 transition text-center ${highlight ? "border-amber-600" : "border-stone-700 hover:border-amber-500/50"}`}>
      <p className="text-2xl mb-1">{icon}</p>
      <p className={`text-xl font-bold ${highlight ? "text-amber-400" : "text-white"}`}>{value}</p>
      <p className="text-stone-400 text-xs">{label}</p>
    </Link>
  );
}

function ActionCard({ href, icon, title, color }: { href: string; icon: string; title: string; color: string }) {
  const borders: Record<string, string> = {
    blue: "hover:border-blue-500/50", green: "hover:border-green-500/50",
    amber: "hover:border-amber-500/50", orange: "hover:border-orange-500/50",
    purple: "hover:border-purple-500/50", red: "hover:border-red-500/50",
  };
  return (
    <Link href={href} className={`bg-stone-800 border border-stone-700 ${borders[color]} rounded-xl p-4 flex flex-col items-center gap-2 transition group`}>
      <span className="text-2xl">{icon}</span>
      <span className="text-stone-300 text-xs font-medium group-hover:text-amber-400 transition text-center">{title}</span>
    </Link>
  );
}

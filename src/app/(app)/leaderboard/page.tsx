"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

import { useAuth } from "@/src/hooks/useAuth";
import { FadeIn, StaggerItem, StaggerList } from "@/src/components/motion";
import { Button } from "@/src/components/ui/button";

interface LeaderboardEntry {
  rank: number;
  userId: number;
  name: string;
  profilePhotoUrl?: string;
  totalXP: number;
  level: number;
  levelName: string;
  currentStreak: number;
  personsAdded: number;
}

const RANK_MEDALS: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };
const LEVEL_COLORS = [
  "text-muted-foreground",
  "text-green-600 dark:text-green-400",
  "text-teal-600 dark:text-teal-400",
  "text-blue-600 dark:text-blue-400",
  "text-amber-600 dark:text-amber-400",
  "text-orange-600 dark:text-orange-400",
  "text-purple-600 dark:text-purple-400",
  "text-yellow-600 dark:text-yellow-400",
];

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/gamification/leaderboard?limit=20")
      .then(r => r.json())
      .then(d => {
        setLeaderboard(d.data?.leaderboard || []);
        setLoading(false);
      });
  }, []);

  const myRank = leaderboard.find(e => e.userId === user?.id);

  return (
    <div className="min-h-screen bg-background px-4 py-8 text-foreground">
      <div className="mx-auto max-w-3xl">
        <FadeIn className="mb-6 flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard">← Dashboard</Link>
          </Button>
        </FadeIn>

        <FadeIn className="mb-8" delay={0.04}>
          <h1 className="text-3xl font-bold text-amber-600 dark:text-amber-400">Family Leaderboard</h1>
          <p className="mt-1 text-muted-foreground">Who is building the richest family heritage?</p>
        </FadeIn>

        {!loading && leaderboard.length >= 3 && (
          <FadeIn className="mb-10 flex items-end justify-center gap-4" delay={0.06}>
            {/* 2nd */}
            <PodiumCard entry={leaderboard[1]} myId={user?.id} />
            {/* 1st */}
            <PodiumCard entry={leaderboard[0]} myId={user?.id} tall />
            {/* 3rd */}
            <PodiumCard entry={leaderboard[2]} myId={user?.id} />
          </FadeIn>
        )}

        {myRank && (
          <FadeIn className="mb-4 flex items-center gap-4 rounded-xl border border-amber-300 bg-amber-500/10 p-4 dark:border-amber-700/50 dark:bg-amber-900/20" delay={0.08}>
            <span className="w-8 text-center text-lg font-bold text-amber-600 dark:text-amber-400">#{myRank.rank}</span>
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-amber-600 font-bold text-white dark:bg-amber-700">
              {myRank.name[0]}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-amber-700 dark:text-amber-400">You · {myRank.name}</p>
              <p className={`text-xs ${LEVEL_COLORS[myRank.level - 1] || "text-muted-foreground"}`}>
                Level {myRank.level} · {myRank.levelName}
              </p>
            </div>
            <div className="text-right">
              <p className="font-bold text-amber-600 dark:text-amber-400">{myRank.totalXP.toLocaleString()} XP</p>
              {myRank.currentStreak > 0 && (
                <p className="text-xs text-orange-600 dark:text-orange-400">🔥 {myRank.currentStreak} day streak</p>
              )}
            </div>
          </FadeIn>
        )}

        {/* Full list */}
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : (
          <StaggerList className="space-y-2">
            {leaderboard.map((entry) => {
              const isMe = entry.userId === user?.id;
              const medal = RANK_MEDALS[entry.rank];
              const lvlColor = LEVEL_COLORS[Math.min(entry.level - 1, LEVEL_COLORS.length - 1)];

              return (
                <StaggerItem key={entry.userId}>
                  <div
                    className={`flex items-center gap-4 rounded-xl border p-4 transition-colors ${
                      isMe
                        ? "border-amber-400/50 bg-amber-500/5 dark:border-amber-700/50 dark:bg-amber-900/10"
                        : "border-border bg-card hover:border-muted-foreground/30"
                    }`}
                  >
                    <div className="w-8 text-center">
                      {medal ? (
                        <span className="text-xl">{medal}</span>
                      ) : (
                        <span className="font-bold text-muted-foreground">#{entry.rank}</span>
                      )}
                    </div>
                    <div
                      className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold text-primary-foreground ${
                        isMe ? "bg-amber-600 dark:bg-amber-700" : "bg-muted text-foreground"
                      }`}
                    >
                      {entry.profilePhotoUrl ? (
                        <img src={entry.profilePhotoUrl} alt="" className="h-full w-full rounded-full object-cover" />
                      ) : (
                        entry.name[0]
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`truncate font-semibold ${isMe ? "text-amber-700 dark:text-amber-400" : "text-foreground"}`}>
                        {entry.name} {isMe && "(you)"}
                      </p>
                      <p className={`text-xs ${lvlColor}`}>
                        Level {entry.level} · {entry.levelName}
                      </p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className="font-bold text-foreground">{entry.totalXP.toLocaleString()} XP</p>
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-xs text-muted-foreground">👤 {entry.personsAdded}</span>
                        {entry.currentStreak > 0 && (
                          <span className="text-xs text-orange-600 dark:text-orange-400">🔥{entry.currentStreak}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </StaggerItem>
              );
            })}
          </StaggerList>
        )}
      </div>
    </div>
  );
}

function PodiumCard({ entry, myId, tall }: { entry: LeaderboardEntry; myId?: number; tall?: boolean }) {
  const isMe = entry.userId === myId;
  const medal = RANK_MEDALS[entry.rank];
  return (
    <div className={`flex max-w-32 flex-1 flex-col items-center gap-2 ${tall ? "pb-0" : "pb-4"}`}>
      <span className="text-3xl">{medal}</span>
      <div
        className={`flex h-14 w-14 items-center justify-center rounded-full border-2 text-lg font-bold ${
          isMe
            ? "border-amber-500 bg-amber-500/20 text-amber-800 dark:border-amber-400 dark:bg-amber-900/40 dark:text-amber-300"
            : "border-border bg-muted text-foreground"
        }`}
      >
        {entry.name[0]}
      </div>
      <p
        className={`w-full truncate text-center text-xs font-semibold ${isMe ? "text-amber-700 dark:text-amber-400" : "text-foreground"}`}
      >
        {entry.name}
      </p>
      <p className="text-sm font-bold text-amber-600 dark:text-amber-300">{entry.totalXP.toLocaleString()}</p>
      <div
        className={`w-full rounded-t-lg border-t ${
          tall
            ? "h-20 border-amber-500 bg-amber-500/15 dark:border-amber-600 dark:bg-amber-800/30"
            : "h-12 border-border bg-muted"
        }`}
      />
    </div>
  );
}

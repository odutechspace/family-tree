"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/src/hooks/useAuth";
import Link from "next/link";

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
const LEVEL_COLORS = ["text-stone-400", "text-green-400", "text-teal-400", "text-blue-400", "text-amber-400", "text-orange-400", "text-purple-400", "text-yellow-400"];

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
    <div className="min-h-screen bg-stone-950 text-white py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/dashboard" className="text-stone-400 hover:text-white">← Dashboard</Link>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-amber-400">Family Leaderboard</h1>
          <p className="text-stone-400 mt-1">Who is building the richest family heritage?</p>
        </div>

        {/* Top 3 podium */}
        {!loading && leaderboard.length >= 3 && (
          <div className="flex items-end justify-center gap-4 mb-10">
            {/* 2nd */}
            <PodiumCard entry={leaderboard[1]} myId={user?.id} />
            {/* 1st */}
            <PodiumCard entry={leaderboard[0]} myId={user?.id} tall />
            {/* 3rd */}
            <PodiumCard entry={leaderboard[2]} myId={user?.id} />
          </div>
        )}

        {/* My position */}
        {myRank && (
          <div className="mb-4 bg-amber-900/20 border border-amber-700/50 rounded-xl p-4 flex items-center gap-4">
            <span className="text-amber-400 font-bold text-lg w-8 text-center">#{myRank.rank}</span>
            <div className="w-10 h-10 rounded-full bg-amber-700 flex items-center justify-center text-white font-bold flex-shrink-0">
              {myRank.name[0]}
            </div>
            <div className="flex-1">
              <p className="text-amber-400 font-semibold">You · {myRank.name}</p>
              <p className={`text-xs ${LEVEL_COLORS[myRank.level - 1] || "text-stone-400"}`}>Level {myRank.level} · {myRank.levelName}</p>
            </div>
            <div className="text-right">
              <p className="text-amber-400 font-bold">{myRank.totalXP.toLocaleString()} XP</p>
              {myRank.currentStreak > 0 && <p className="text-orange-400 text-xs">🔥 {myRank.currentStreak} day streak</p>}
            </div>
          </div>
        )}

        {/* Full list */}
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 10 }).map((_, i) => <div key={i} className="h-16 bg-stone-800 rounded-xl animate-pulse" />)}
          </div>
        ) : (
          <div className="space-y-2">
            {leaderboard.map(entry => {
              const isMe = entry.userId === user?.id;
              const medal = RANK_MEDALS[entry.rank];
              const lvlColor = LEVEL_COLORS[Math.min(entry.level - 1, LEVEL_COLORS.length - 1)];

              return (
                <div key={entry.userId}
                  className={`flex items-center gap-4 p-4 rounded-xl border transition ${isMe ? "bg-amber-900/10 border-amber-700/50" : "bg-stone-800 border-stone-700 hover:border-stone-600"}`}>
                  <div className="w-8 text-center">
                    {medal ? (
                      <span className="text-xl">{medal}</span>
                    ) : (
                      <span className="text-stone-500 font-bold">#{entry.rank}</span>
                    )}
                  </div>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${isMe ? "bg-amber-700" : "bg-stone-700"}`}>
                    {entry.profilePhotoUrl ? (
                      <img src={entry.profilePhotoUrl} alt="" className="w-full h-full object-cover rounded-full" />
                    ) : (
                      entry.name[0]
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold truncate ${isMe ? "text-amber-400" : "text-white"}`}>{entry.name} {isMe && "(you)"}</p>
                    <p className={`text-xs ${lvlColor}`}>Level {entry.level} · {entry.levelName}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-white font-bold">{entry.totalXP.toLocaleString()} XP</p>
                    <div className="flex items-center gap-2 justify-end">
                      <span className="text-stone-500 text-xs">👤 {entry.personsAdded}</span>
                      {entry.currentStreak > 0 && <span className="text-orange-400 text-xs">🔥{entry.currentStreak}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function PodiumCard({ entry, myId, tall }: { entry: LeaderboardEntry; myId?: number; tall?: boolean }) {
  const isMe = entry.userId === myId;
  const medal = RANK_MEDALS[entry.rank];
  return (
    <div className={`flex flex-col items-center gap-2 flex-1 max-w-32 ${tall ? "pb-0" : "pb-4"}`}>
      <span className="text-3xl">{medal}</span>
      <div className={`w-14 h-14 rounded-full flex items-center justify-center font-bold text-lg border-2 ${isMe ? "border-amber-400 bg-amber-900/40 text-amber-300" : "border-stone-600 bg-stone-700 text-white"}`}>
        {entry.name[0]}
      </div>
      <p className={`text-xs font-semibold text-center truncate w-full ${isMe ? "text-amber-400" : "text-white"}`}>{entry.name}</p>
      <p className="text-amber-300 text-sm font-bold">{entry.totalXP.toLocaleString()}</p>
      <div className={`w-full rounded-t-lg ${tall ? "h-20 bg-amber-800/30 border-t-2 border-amber-600" : "h-12 bg-stone-800 border-t border-stone-600"}`} />
    </div>
  );
}

"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/src/hooks/useAuth";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState({ trees: 0, persons: 0, pendingMerges: 0 });

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading]);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      fetch("/api/trees?mine=1").then(r => r.json()),
      fetch("/api/persons?limit=1").then(r => r.json()),
      fetch("/api/merge-requests?status=pending").then(r => r.json()),
    ]).then(([treesData, personsData, mergesData]) => {
      setStats({
        trees: (treesData.data?.trees || []).length,
        persons: personsData.data?.total || 0,
        pendingMerges: (mergesData.data?.requests || []).length,
      });
    });
  }, [user]);

  if (loading || !user) return <div className="min-h-screen bg-stone-950 flex items-center justify-center text-stone-400">Loading...</div>;

  return (
    <div className="min-h-screen bg-stone-950 text-white py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Welcome, <span className="text-amber-400">{user.name}</span></h1>
            <p className="text-stone-400 mt-1">Manage your family heritage</p>
          </div>
          <button onClick={logout} className="text-stone-400 hover:text-red-400 text-sm transition">Sign Out</button>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
          <Link href="/trees?mine=1" className="bg-stone-800 border border-stone-700 hover:border-amber-500/50 rounded-xl p-5 transition">
            <p className="text-3xl font-bold text-amber-400">{stats.trees}</p>
            <p className="text-stone-400 text-sm mt-1">Family Trees</p>
          </Link>
          <Link href="/persons" className="bg-stone-800 border border-stone-700 hover:border-amber-500/50 rounded-xl p-5 transition">
            <p className="text-3xl font-bold text-amber-400">{stats.persons}</p>
            <p className="text-stone-400 text-sm mt-1">People</p>
          </Link>
          <Link href="/merge-requests" className={`bg-stone-800 border rounded-xl p-5 transition ${stats.pendingMerges > 0 ? "border-amber-600" : "border-stone-700 hover:border-amber-500/50"}`}>
            <p className={`text-3xl font-bold ${stats.pendingMerges > 0 ? "text-amber-400" : "text-white"}`}>{stats.pendingMerges}</p>
            <p className="text-stone-400 text-sm mt-1">Pending Merges</p>
          </Link>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <ActionCard href="/persons/new" icon="👤" title="Add Person" description="Add a family member to the database" color="blue" />
          <ActionCard href="/trees/new" icon="🌳" title="New Family Tree" description="Create a new family lineage tree" color="green" />
          <ActionCard href="/merge-requests/new" icon="🔗" title="Merge Histories" description="Connect or merge duplicate family records" color="amber" />
          <ActionCard href="/clans/new" icon="🦁" title="Add Clan" description="Register a new clan or lineage group" color="orange" />
          <ActionCard href="/persons" icon="🔍" title="Browse People" description="Search through all family members" color="purple" />
          <ActionCard href="/clans" icon="🌍" title="Explore Clans" description="Browse clans, totems, and oral histories" color="red" />
        </div>

        {user.role === "admin" && (
          <div className="bg-amber-900/20 border border-amber-700/50 rounded-xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-amber-400 font-semibold">Admin Panel</h2>
                <p className="text-stone-400 text-sm mt-1">Manage users, review merge requests, and oversee data</p>
              </div>
              <Link href="/admin" className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium rounded-lg transition">
                Open Admin →
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ActionCard({ href, icon, title, description, color }: {
  href: string; icon: string; title: string; description: string; color: string;
}) {
  const colors: Record<string, string> = {
    blue: "hover:border-blue-500/50",
    green: "hover:border-green-500/50",
    amber: "hover:border-amber-500/50",
    orange: "hover:border-orange-500/50",
    purple: "hover:border-purple-500/50",
    red: "hover:border-red-500/50",
  };
  return (
    <Link href={href} className={`bg-stone-800 border border-stone-700 ${colors[color]} rounded-xl p-5 flex items-start gap-4 transition group`}>
      <span className="text-3xl">{icon}</span>
      <div>
        <p className="font-semibold text-white group-hover:text-amber-400 transition">{title}</p>
        <p className="text-stone-400 text-sm mt-1">{description}</p>
      </div>
    </Link>
  );
}

"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/src/hooks/useAuth";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface User {
  id: number; name: string; email: string; role: string; createdAt: string; profilePhotoUrl?: string;
}
interface MergeRequest {
  id: number; type: string; status: string; reason?: string; createdAt: string;
  sourcePersonId?: number; targetPersonId?: number; sourceTreeId?: number; targetTreeId?: number;
}

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [pendingMerges, setPendingMerges] = useState<MergeRequest[]>([]);
  const [stats, setStats] = useState({ persons: 0, trees: 0, clans: 0, mergeRequests: 0 });
  const [loadingData, setLoadingData] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "merges">("overview");

  useEffect(() => {
    if (!loading && user?.role !== "admin") {
      router.push("/dashboard");
    }
  }, [user, loading]);

  useEffect(() => {
    if (user?.role !== "admin") return;

    Promise.all([
      fetch("/api/users").then(r => r.json()),
      fetch("/api/merge-requests?all=1&status=pending").then(r => r.json()),
      fetch("/api/persons?limit=1").then(r => r.json()),
      fetch("/api/trees").then(r => r.json()),
      fetch("/api/clans").then(r => r.json()),
    ]).then(([usersData, mergesData, personsData, treesData, clansData]) => {
      setUsers(usersData.data?.users || []);
      setPendingMerges(mergesData.data?.requests || []);
      setStats({
        persons: personsData.data?.total || 0,
        trees: (treesData.data?.trees || []).length,
        clans: (clansData.data?.clans || []).length,
        mergeRequests: (mergesData.data?.requests || []).length,
      });
      setLoadingData(false);
    });
  }, [user]);

  const updateRole = async (userId: number, role: string) => {
    await fetch("/api/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, role }),
    });
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u));
  };

  if (loading || loadingData) return <div className="min-h-screen bg-stone-950 flex items-center justify-center text-stone-400">Loading...</div>;
  if (user?.role !== "admin") return null;

  return (
    <div className="min-h-screen bg-stone-950 text-white py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-amber-400">Admin Panel</h1>
            <p className="text-stone-400 mt-1">Manage users, merges, and system data</p>
          </div>
          <Link href="/dashboard" className="text-stone-400 hover:text-white text-sm">← Dashboard</Link>
        </div>

        {/* Tab nav */}
        <div className="flex gap-2 mb-6">
          {(["overview", "users", "merges"] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition ${activeTab === tab ? "bg-amber-600 text-white" : "bg-stone-800 text-stone-400 hover:text-white"}`}>
              {tab} {tab === "merges" && pendingMerges.length > 0 && <span className="ml-1 bg-red-600 text-white text-xs px-1.5 py-0.5 rounded-full">{pendingMerges.length}</span>}
            </button>
          ))}
        </div>

        {activeTab === "overview" && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total People" value={stats.persons} icon="👥" href="/persons" />
            <StatCard label="Family Trees" value={stats.trees} icon="🌳" href="/trees" />
            <StatCard label="Clans" value={stats.clans} icon="🦁" href="/clans" />
            <StatCard label="Pending Merges" value={stats.mergeRequests} icon="🔗" href="#" onClick={() => setActiveTab("merges")} highlight={stats.mergeRequests > 0} />
          </div>
        )}

        {activeTab === "users" && (
          <div className="bg-stone-800 border border-stone-700 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-stone-700">
              <h2 className="text-amber-400 font-semibold">All Users ({users.length})</h2>
            </div>
            <div className="divide-y divide-stone-700">
              {users.map(u => (
                <div key={u.id} className="flex items-center gap-4 px-4 py-3">
                  <div className="w-9 h-9 rounded-full bg-stone-700 flex items-center justify-center text-amber-400 font-bold text-sm flex-shrink-0">
                    {u.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">{u.name}</p>
                    <p className="text-stone-400 text-xs truncate">{u.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select value={u.role} onChange={e => updateRole(u.id, e.target.value)}
                      className="text-xs px-2 py-1 bg-stone-700 border border-stone-600 rounded text-white focus:outline-none focus:border-amber-500">
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <p className="text-stone-500 text-xs hidden sm:block">{new Date(u.createdAt).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "merges" && (
          <div className="space-y-4">
            {pendingMerges.length === 0 ? (
              <div className="text-center py-16 text-stone-400">
                <p className="text-4xl mb-3">✅</p>
                <p>No pending merge requests</p>
              </div>
            ) : (
              pendingMerges.map(mr => (
                <div key={mr.id} className="bg-stone-800 border border-stone-700 rounded-xl p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-900/40 text-yellow-400 border border-yellow-700">pending</span>
                        <span className="text-xs text-stone-500">{mr.type === "duplicate_person" ? "👤 Duplicate Person" : "🌳 Family Trees"}</span>
                      </div>
                      {mr.type === "duplicate_person" && (
                        <p className="text-stone-300 text-sm">
                          Merge Person #{mr.sourcePersonId} → Person #{mr.targetPersonId}
                        </p>
                      )}
                      {mr.type === "family_trees" && (
                        <p className="text-stone-300 text-sm">
                          Merge Tree #{mr.sourceTreeId} → Tree #{mr.targetTreeId}
                        </p>
                      )}
                      {mr.reason && <p className="text-stone-400 text-sm mt-1 italic">"{mr.reason}"</p>}
                      <p className="text-stone-500 text-xs mt-2">{new Date(mr.createdAt).toLocaleDateString()}</p>
                    </div>
                    <AdminReviewButtons mergeRequestId={mr.id} onReviewed={() => {
                      setPendingMerges(prev => prev.filter(m => m.id !== mr.id));
                      setStats(s => ({ ...s, mergeRequests: s.mergeRequests - 1 }));
                    }} />
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, href, onClick, highlight }: { label: string; value: number; icon: string; href: string; onClick?: () => void; highlight?: boolean; }) {
  const inner = (
    <div className={`bg-stone-800 border rounded-xl p-5 flex flex-col gap-2 transition ${highlight ? "border-amber-600 bg-amber-900/10" : "border-stone-700 hover:border-amber-500/50"}`}>
      <span className="text-3xl">{icon}</span>
      <p className={`text-3xl font-bold ${highlight ? "text-amber-400" : "text-white"}`}>{value}</p>
      <p className="text-stone-400 text-sm">{label}</p>
    </div>
  );
  if (onClick) return <button onClick={onClick} className="text-left">{inner}</button>;
  return <Link href={href}>{inner}</Link>;
}

function AdminReviewButtons({ mergeRequestId, onReviewed }: { mergeRequestId: number; onReviewed: () => void; }) {
  const [loading, setLoading] = useState(false);

  const review = async (decision: "approved" | "rejected") => {
    if (!confirm(`${decision === "approved" ? "Approve" : "Reject"} this merge request?`)) return;
    setLoading(true);
    await fetch(`/api/merge-requests/${mergeRequestId}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision }),
    });
    setLoading(false);
    onReviewed();
  };

  return (
    <div className="flex flex-col gap-2 min-w-24">
      <button onClick={() => review("approved")} disabled={loading}
        className="py-1.5 px-3 bg-green-800 hover:bg-green-700 text-green-300 text-xs font-medium rounded-lg transition">
        ✓ Approve
      </button>
      <button onClick={() => review("rejected")} disabled={loading}
        className="py-1.5 px-3 bg-red-900/50 hover:bg-red-900 text-red-400 text-xs font-medium rounded-lg transition">
        ✗ Reject
      </button>
    </div>
  );
}

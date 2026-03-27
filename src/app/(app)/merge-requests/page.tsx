"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/src/hooks/useAuth";

interface MergeRequest {
  id: number;
  type: string;
  status: string;
  sourcePersonId?: number;
  targetPersonId?: number;
  sourceTreeId?: number;
  targetTreeId?: number;
  reason?: string;
  requestedByUserId: number;
  reviewedAt?: string;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-900/40 text-yellow-400 border-yellow-700",
  approved: "bg-green-900/40 text-green-400 border-green-700",
  rejected: "bg-red-900/40 text-red-400 border-red-700",
  cancelled: "bg-stone-700 text-stone-400",
};

export default function MergeRequestsPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<MergeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchRequests = async () => {
    setLoading(true);
    const isAdmin = user?.role === "admin";
    const url = `/api/merge-requests${isAdmin ? "?all=1" : ""}`;
    const res = await fetch(url);
    const data = await res.json();
    setRequests(data.data?.requests || []);
    setLoading(false);
  };

  useEffect(() => { if (user !== undefined) fetchRequests(); }, [user]);

  const filtered = statusFilter === "all" ? requests : requests.filter(r => r.status === statusFilter);

  return (
    <div className="min-h-screen bg-stone-950 text-white py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-amber-400">Merge Requests</h1>
            <p className="text-stone-400 mt-1">Propose and manage family history merges</p>
          </div>
          <Link href="/merge-requests/new" className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-lg transition">
            + New Merge Request
          </Link>
        </div>

        <div className="flex gap-2 mb-6 flex-wrap">
          {["all", "pending", "approved", "rejected"].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition capitalize ${statusFilter === s ? "bg-amber-600 text-white" : "bg-stone-800 text-stone-400 hover:text-white"}`}>
              {s}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="bg-stone-800 rounded-xl h-24 animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-stone-400">
            <p className="text-4xl mb-3">🔗</p>
            <p className="text-lg mb-2">No merge requests found</p>
            <Link href="/merge-requests/new" className="text-amber-400 hover:text-amber-300">Create one →</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(mr => (
              <div key={mr.id} className="bg-stone-800 border border-stone-700 rounded-xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_COLORS[mr.status] || "bg-stone-700 text-stone-400"}`}>
                        {mr.status}
                      </span>
                      <span className="text-xs text-stone-500">
                        {mr.type === "duplicate_person" ? "👤 Duplicate Person" : "🌳 Family Trees"}
                      </span>
                    </div>

                    {mr.type === "duplicate_person" && (
                      <p className="text-stone-300 text-sm">
                        Merge Person #{mr.sourcePersonId} into Person #{mr.targetPersonId}
                      </p>
                    )}
                    {mr.type === "family_trees" && (
                      <p className="text-stone-300 text-sm">
                        Merge Tree #{mr.sourceTreeId} into Tree #{mr.targetTreeId}
                      </p>
                    )}

                    {mr.reason && <p className="text-stone-400 text-sm mt-1 italic">"{mr.reason}"</p>}
                    <p className="text-stone-500 text-xs mt-2">{new Date(mr.createdAt).toLocaleDateString()}</p>
                  </div>

                  {user?.role === "admin" && mr.status === "pending" && (
                    <ReviewButtons mergeRequestId={mr.id} onReviewed={fetchRequests} />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ReviewButtons({ mergeRequestId, onReviewed }: { mergeRequestId: number; onReviewed: () => void; }) {
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState("");
  const [showNotes, setShowNotes] = useState(false);
  const [pendingDecision, setPendingDecision] = useState<"approved" | "rejected" | null>(null);

  const submit = async (decision: "approved" | "rejected") => {
    setLoading(true);
    await fetch(`/api/merge-requests/${mergeRequestId}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision, reviewNotes: notes }),
    });
    setLoading(false);
    setShowNotes(false);
    onReviewed();
  };

  if (showNotes) {
    return (
      <div className="flex flex-col gap-2 min-w-48">
        <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Review notes (optional)..."
          className="px-2 py-1.5 bg-stone-700 border border-stone-600 rounded text-white text-xs resize-none focus:outline-none focus:border-amber-500" />
        <div className="flex gap-2">
          <button onClick={() => submit(pendingDecision!)} disabled={loading}
            className={`flex-1 py-1 text-xs font-medium rounded transition ${pendingDecision === "approved" ? "bg-green-700 hover:bg-green-600 text-white" : "bg-red-900 hover:bg-red-800 text-white"}`}>
            Confirm {pendingDecision}
          </button>
          <button onClick={() => setShowNotes(false)} className="px-2 py-1 text-xs bg-stone-700 text-stone-400 rounded">Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <button onClick={() => { setPendingDecision("approved"); setShowNotes(true); }}
        className="px-3 py-1.5 bg-green-800 hover:bg-green-700 text-green-300 text-xs font-medium rounded-lg transition">
        ✓ Approve
      </button>
      <button onClick={() => { setPendingDecision("rejected"); setShowNotes(true); }}
        className="px-3 py-1.5 bg-red-900/50 hover:bg-red-900 text-red-400 text-xs font-medium rounded-lg transition">
        ✗ Reject
      </button>
    </div>
  );
}

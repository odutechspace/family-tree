"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";

const FamilyTreeViewer = dynamic(() => import("@/src/components/tree/FamilyTreeViewer"), { ssr: false, loading: () => <div className="flex items-center justify-center h-full text-stone-400">Loading tree...</div> });

interface FamilyTree {
  id: number; name: string; description?: string; visibility: string; ownerUserId: number; rootPersonId?: number;
}
interface Person {
  id: number; firstName: string; lastName: string; nickname?: string; gender: string;
  birthDate?: string; deathDate?: string; aliveStatus: string; photoUrl?: string;
}
interface Relationship {
  id: number; personAId: number; personBId: number; type: string; status: string;
  startDate?: string; ceremonyType?: string; unionOrder?: number;
}

export default function TreeViewPage() {
  const { id } = useParams<{ id: string }>();
  const [tree, setTree] = useState<FamilyTree | null>(null);
  const [persons, setPersons] = useState<Person[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddMember, setShowAddMember] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const fetchTree = useCallback(async () => {
    const res = await fetch(`/api/trees/${id}`);
    const data = await res.json();
    if (res.ok) {
      setTree(data.data.tree);
      setPersons(data.data.persons || []);
      setRelationships(data.data.relationships || []);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchTree(); }, [fetchTree]);

  if (loading) return <div className="min-h-screen bg-stone-950 flex items-center justify-center text-stone-400">Loading...</div>;
  if (!tree) return <div className="min-h-screen bg-stone-950 flex items-center justify-center text-red-400">Tree not found.</div>;

  return (
    <div className="flex flex-col min-h-screen bg-stone-950 text-white">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-stone-900 border-b border-stone-800">
        <div className="flex items-center gap-3">
          <Link href="/trees" className="text-stone-400 hover:text-white text-sm">← Trees</Link>
          <div>
            <h1 className="text-lg font-bold text-amber-400">{tree.name}</h1>
            {tree.description && <p className="text-stone-400 text-xs">{tree.description}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-0.5 rounded-full ${tree.visibility === "public" ? "bg-green-900/40 text-green-400" : "bg-stone-700 text-stone-400"}`}>
            {tree.visibility}
          </span>
          <button onClick={() => setShowAddMember(true)}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium rounded-lg transition">
            + Add Person
          </button>
          <button onClick={() => setSidebarOpen(!sidebarOpen)}
            className="px-3 py-1.5 bg-stone-700 hover:bg-stone-600 text-white text-sm rounded-lg transition">
            {sidebarOpen ? "Hide" : "People"} ({persons.length})
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Tree canvas */}
        <div className="flex-1" style={{ height: "calc(100vh - 120px)" }}>
          {persons.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-stone-400">
              <p className="text-5xl mb-4">🌳</p>
              <p className="text-lg mb-2">No people in this tree yet</p>
              <button onClick={() => setShowAddMember(true)} className="text-amber-400 hover:text-amber-300">
                Add the first person →
              </button>
            </div>
          ) : (
            <FamilyTreeViewer persons={persons} relationships={relationships} rootPersonId={tree.rootPersonId} />
          )}
        </div>

        {/* Sidebar */}
        {sidebarOpen && (
          <div className="w-64 bg-stone-900 border-l border-stone-800 overflow-y-auto p-4">
            <h3 className="text-amber-400 font-semibold mb-3">People in Tree</h3>
            <div className="space-y-2">
              {persons.map(p => (
                <Link key={p.id} href={`/persons/${p.id}`}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-stone-800 transition">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${p.gender === "male" ? "bg-blue-900 text-blue-300" : p.gender === "female" ? "bg-pink-900 text-pink-300" : "bg-stone-700 text-stone-300"}`}>
                    {p.firstName[0]}{p.lastName[0]}
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium leading-tight">{p.firstName} {p.lastName}</p>
                    {p.aliveStatus === "deceased" && <p className="text-stone-500 text-xs">†</p>}
                  </div>
                </Link>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-stone-800">
              <Link href={`/merge-requests/new?sourceTreeId=${id}`}
                className="block text-center text-sm text-amber-400 hover:text-amber-300">
                Request Tree Merge →
              </Link>
            </div>
          </div>
        )}
      </div>

      {showAddMember && (
        <AddMemberModal
          treeId={Number(id)}
          existingPersonIds={persons.map(p => p.id)}
          onClose={() => setShowAddMember(false)}
          onSaved={() => { setShowAddMember(false); fetchTree(); }}
        />
      )}
    </div>
  );
}

function AddMemberModal({ treeId, existingPersonIds, onClose, onSaved }: {
  treeId: number; existingPersonIds: number[];
  onClose: () => void; onSaved: () => void;
}) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Person[]>([]);
  const [selected, setSelected] = useState<Person | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!search) { setResults([]); return; }
    const t = setTimeout(async () => {
      const r = await fetch(`/api/persons?search=${encodeURIComponent(search)}&limit=10`);
      const d = await r.json();
      setResults((d.data?.persons || []).filter((p: Person) => !existingPersonIds.includes(p.id)));
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const addToTree = async (personId: number) => {
    setSaving(true);
    setError("");
    const res = await fetch(`/api/trees/${treeId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personId }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.message || "Failed."); setSaving(false); return; }
    onSaved();
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-stone-800 border border-stone-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <h3 className="text-xl font-bold text-amber-400 mb-4">Add Person to Tree</h3>
        {error && <div className="mb-3 p-2 bg-red-900/40 border border-red-700 rounded text-red-300 text-sm">{error}</div>}

        <div className="mb-4">
          <label className="block text-stone-300 text-sm mb-1">Search existing people</label>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Type a name..."
            className="w-full px-3 py-2 bg-stone-700 border border-stone-600 rounded-lg text-white placeholder-stone-500 focus:outline-none focus:border-amber-500" />
          {results.length > 0 && (
            <div className="mt-1 bg-stone-900 border border-stone-700 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
              {results.map(p => (
                <button key={p.id} onClick={() => addToTree(p.id)} disabled={saving}
                  className="w-full text-left px-3 py-2.5 hover:bg-stone-700 text-white text-sm border-b border-stone-700 last:border-0 flex items-center justify-between">
                  <span>{p.firstName} {p.lastName}</span>
                  <span className="text-amber-400 text-xs">Add →</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-stone-700 pt-4">
          <p className="text-stone-400 text-sm mb-2">Or create a new person:</p>
          <Link href={`/persons/new?treeId=${treeId}`} onClick={onClose}
            className="block w-full text-center py-2 bg-stone-700 hover:bg-stone-600 text-white text-sm rounded-lg transition">
            Create New Person →
          </Link>
        </div>

        <button onClick={onClose} className="mt-4 w-full py-2 bg-stone-700 hover:bg-stone-600 text-stone-400 text-sm rounded-lg transition">
          Close
        </button>
      </div>
    </div>
  );
}

"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

interface Person { id: number; firstName: string; lastName: string; }
interface FamilyTree { id: number; name: string; }

function NewMergeRequestForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mergeType, setMergeType] = useState(searchParams.get("sourceTreeId") ? "family_trees" : "duplicate_person");
  const [form, setForm] = useState({
    sourcePersonId: searchParams.get("sourcePersonId") || "",
    targetPersonId: "",
    sourceTreeId: searchParams.get("sourceTreeId") || "",
    targetTreeId: "",
    connectingPersonId: "",
    reason: "",
    evidenceNotes: "",
  });
  const [searches, setSearches] = useState({ source: "", target: "", connecting: "", sourceTree: "", targetTree: "" });
  const [results, setResults] = useState<{ source: Person[]; target: Person[]; connecting: Person[]; sourceTree: FamilyTree[]; targetTree: FamilyTree[] }>({ source: [], target: [], connecting: [], sourceTree: [], targetTree: [] });
  const [labels, setLabels] = useState({ source: "", target: "", connecting: "", sourceTree: "", targetTree: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const searchPersons = async (field: "source" | "target" | "connecting", q: string) => {
    if (!q) { setResults(r => ({ ...r, [field]: [] })); return; }
    const res = await fetch(`/api/persons?search=${encodeURIComponent(q)}&limit=8`);
    const data = await res.json();
    setResults(r => ({ ...r, [field]: data.data?.persons || [] }));
  };

  const searchTrees = async (field: "sourceTree" | "targetTree", q: string) => {
    if (!q) { setResults(r => ({ ...r, [field]: [] })); return; }
    const res = await fetch(`/api/trees?mine=1`);
    const data = await res.json();
    const all = data.data?.trees || [];
    setResults(r => ({ ...r, [field]: all.filter((t: FamilyTree) => t.name.toLowerCase().includes(q.toLowerCase())) }));
  };

  useEffect(() => {
    const t = setTimeout(() => searchPersons("source", searches.source), 300);
    return () => clearTimeout(t);
  }, [searches.source]);
  useEffect(() => {
    const t = setTimeout(() => searchPersons("target", searches.target), 300);
    return () => clearTimeout(t);
  }, [searches.target]);
  useEffect(() => {
    const t = setTimeout(() => searchPersons("connecting", searches.connecting), 300);
    return () => clearTimeout(t);
  }, [searches.connecting]);
  useEffect(() => {
    const t = setTimeout(() => searchTrees("sourceTree", searches.sourceTree), 300);
    return () => clearTimeout(t);
  }, [searches.sourceTree]);
  useEffect(() => {
    const t = setTimeout(() => searchTrees("targetTree", searches.targetTree), 300);
    return () => clearTimeout(t);
  }, [searches.targetTree]);

  const PersonSearch = ({ field, label, formKey }: { field: "source" | "target" | "connecting"; label: string; formKey: string }) => (
    <div>
      <label className="block text-stone-300 text-sm font-medium mb-1">{label}</label>
      <input value={labels[field as keyof typeof labels] || searches[field]} onChange={e => { setSearches(s => ({ ...s, [field]: e.target.value })); setLabels(l => ({ ...l, [field]: "" })); setForm(f => ({ ...f, [formKey]: "" })); }}
        placeholder="Search by name..."
        className="w-full px-3 py-2 bg-stone-700 border border-stone-600 rounded-lg text-white placeholder-stone-500 focus:outline-none focus:border-amber-500" />
      {results[field].length > 0 && (
        <div className="mt-1 bg-stone-900 border border-stone-700 rounded-lg overflow-hidden max-h-40 overflow-y-auto">
          {results[field].map((p: Person) => (
            <button key={p.id} onClick={() => { setForm(f => ({ ...f, [formKey]: String(p.id) })); setLabels(l => ({ ...l, [field]: `${p.firstName} ${p.lastName}` })); setResults(r => ({ ...r, [field]: [] })); }}
              className="w-full text-left px-3 py-2 hover:bg-stone-700 text-white text-sm border-b border-stone-700 last:border-0">
              {p.firstName} {p.lastName}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const body: any = { type: mergeType, reason: form.reason, evidenceNotes: form.evidenceNotes };
      if (mergeType === "duplicate_person") {
        if (!form.sourcePersonId || !form.targetPersonId) { setError("Please select both persons."); setLoading(false); return; }
        body.sourcePersonId = Number(form.sourcePersonId);
        body.targetPersonId = Number(form.targetPersonId);
        if (form.connectingPersonId) body.connectingPersonId = Number(form.connectingPersonId);
      } else {
        if (!form.sourceTreeId || !form.targetTreeId) { setError("Please select both trees."); setLoading(false); return; }
        body.sourceTreeId = Number(form.sourceTreeId);
        body.targetTreeId = Number(form.targetTreeId);
        if (form.connectingPersonId) body.connectingPersonId = Number(form.connectingPersonId);
      }
      const res = await fetch("/api/merge-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || "Failed."); return; }
      router.push("/merge-requests");
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-950 text-white py-8 px-4">
      <div className="max-w-xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/merge-requests" className="text-stone-400 hover:text-white">← Back</Link>
          <h1 className="text-2xl font-bold text-amber-400">New Merge Request</h1>
        </div>

        <div className="mb-6 p-4 bg-amber-900/20 border border-amber-700/50 rounded-xl text-amber-300 text-sm">
          <strong>What is a merge request?</strong><br />
          Use this when you find duplicate person profiles for the same real person, or when two separate family trees actually belong to the same extended family. An admin will review and approve the merge.
        </div>

        {error && <div className="mb-4 p-3 bg-red-900/40 border border-red-700 rounded-lg text-red-300 text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-stone-800 border border-stone-700 rounded-xl p-5">
            <label className="block text-stone-300 text-sm font-medium mb-3">What are you merging?</label>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setMergeType("duplicate_person")}
                className={`p-3 rounded-lg border text-sm font-medium transition ${mergeType === "duplicate_person" ? "border-amber-500 bg-amber-900/30 text-amber-400" : "border-stone-600 bg-stone-700 text-stone-400 hover:text-white"}`}>
                👤 Duplicate People
              </button>
              <button type="button" onClick={() => setMergeType("family_trees")}
                className={`p-3 rounded-lg border text-sm font-medium transition ${mergeType === "family_trees" ? "border-amber-500 bg-amber-900/30 text-amber-400" : "border-stone-600 bg-stone-700 text-stone-400 hover:text-white"}`}>
                🌳 Family Trees
              </button>
            </div>
          </div>

          <div className="bg-stone-800 border border-stone-700 rounded-xl p-5 space-y-4">
            {mergeType === "duplicate_person" ? (
              <>
                <h3 className="text-amber-400 font-medium">Select the two duplicate person profiles</h3>
                <PersonSearch field="source" label="Original Person (to keep)" formKey="sourcePersonId" />
                <PersonSearch field="target" label="Duplicate Person (to merge into original)" formKey="targetPersonId" />
                <PersonSearch field="connecting" label="Connecting Ancestor (optional)" formKey="connectingPersonId" />
              </>
            ) : (
              <>
                <h3 className="text-amber-400 font-medium">Select the two family trees</h3>
                <div>
                  <label className="block text-stone-300 text-sm font-medium mb-1">Source Tree (to merge from)</label>
                  <input value={searches.sourceTree} onChange={e => setSearches(s => ({ ...s, sourceTree: e.target.value }))} placeholder="Search your trees..."
                    className="w-full px-3 py-2 bg-stone-700 border border-stone-600 rounded-lg text-white placeholder-stone-500 focus:outline-none focus:border-amber-500" />
                  {results.sourceTree.length > 0 && (
                    <div className="mt-1 bg-stone-900 border border-stone-700 rounded-lg overflow-hidden">
                      {results.sourceTree.map((t: FamilyTree) => (
                        <button key={t.id} onClick={() => { setForm(f => ({ ...f, sourceTreeId: String(t.id) })); setSearches(s => ({ ...s, sourceTree: t.name })); setResults(r => ({ ...r, sourceTree: [] })); }}
                          className="w-full text-left px-3 py-2 hover:bg-stone-700 text-white text-sm">
                          {t.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-stone-300 text-sm font-medium mb-1">Target Tree (to merge into)</label>
                  <input value={searches.targetTree} onChange={e => setSearches(s => ({ ...s, targetTree: e.target.value }))} placeholder="Search your trees..."
                    className="w-full px-3 py-2 bg-stone-700 border border-stone-600 rounded-lg text-white placeholder-stone-500 focus:outline-none focus:border-amber-500" />
                  {results.targetTree.length > 0 && (
                    <div className="mt-1 bg-stone-900 border border-stone-700 rounded-lg overflow-hidden">
                      {results.targetTree.map((t: FamilyTree) => (
                        <button key={t.id} onClick={() => { setForm(f => ({ ...f, targetTreeId: String(t.id) })); setSearches(s => ({ ...s, targetTree: t.name })); setResults(r => ({ ...r, targetTree: [] })); }}
                          className="w-full text-left px-3 py-2 hover:bg-stone-700 text-white text-sm">
                          {t.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <PersonSearch field="connecting" label="Connecting Person (shared ancestor / relative)" formKey="connectingPersonId" />
              </>
            )}
          </div>

          <div className="bg-stone-800 border border-stone-700 rounded-xl p-5 space-y-4">
            <h3 className="text-amber-400 font-medium">Justification</h3>
            <div>
              <label className="block text-stone-300 text-sm font-medium mb-1">Reason *</label>
              <textarea rows={2} required value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="Why should these be merged?"
                className="w-full px-3 py-2 bg-stone-700 border border-stone-600 rounded-lg text-white placeholder-stone-500 focus:outline-none focus:border-amber-500 resize-none" />
            </div>
            <div>
              <label className="block text-stone-300 text-sm font-medium mb-1">Evidence & Notes</label>
              <textarea rows={3} value={form.evidenceNotes} onChange={e => setForm(f => ({ ...f, evidenceNotes: e.target.value }))} placeholder="Supporting evidence, shared birth dates, common relatives, documents..."
                className="w-full px-3 py-2 bg-stone-700 border border-stone-600 rounded-lg text-white placeholder-stone-500 focus:outline-none focus:border-amber-500 resize-none" />
            </div>
          </div>

          <div className="flex gap-4">
            <button type="submit" disabled={loading}
              className="flex-1 py-3 bg-amber-600 hover:bg-amber-500 disabled:bg-amber-800 text-white font-semibold rounded-lg transition">
              {loading ? "Submitting..." : "Submit Merge Request"}
            </button>
            <Link href="/merge-requests" className="px-6 py-3 bg-stone-700 hover:bg-stone-600 text-white rounded-lg transition text-center">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function NewMergeRequestPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-stone-950 flex items-center justify-center text-stone-400">Loading...</div>}>
      <NewMergeRequestForm />
    </Suspense>
  );
}

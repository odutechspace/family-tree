"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NewTreePage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", description: "", visibility: "private" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/trees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || "Failed."); return; }
      router.push(`/trees/${data.data.tree.id}`);
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-950 text-white py-8 px-4">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/trees" className="text-stone-400 hover:text-white">← Trees</Link>
          <h1 className="text-2xl font-bold text-amber-400">New Family Tree</h1>
        </div>
        {error && <div className="mb-4 p-3 bg-red-900/40 border border-red-700 rounded-lg text-red-300 text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="bg-stone-800 border border-stone-700 rounded-xl p-6 space-y-5">
          <div>
            <label className="block text-stone-300 text-sm font-medium mb-1">Tree Name *</label>
            <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Osei Family Tree"
              className="w-full px-3 py-2.5 bg-stone-700 border border-stone-600 rounded-lg text-white placeholder-stone-500 focus:outline-none focus:border-amber-500" />
          </div>
          <div>
            <label className="block text-stone-300 text-sm font-medium mb-1">Description</label>
            <textarea rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe this family lineage..."
              className="w-full px-3 py-2.5 bg-stone-700 border border-stone-600 rounded-lg text-white placeholder-stone-500 focus:outline-none focus:border-amber-500 resize-none" />
          </div>
          <div>
            <label className="block text-stone-300 text-sm font-medium mb-1">Visibility</label>
            <select value={form.visibility} onChange={e => setForm(f => ({ ...f, visibility: e.target.value }))}
              className="w-full px-3 py-2.5 bg-stone-700 border border-stone-600 rounded-lg text-white focus:outline-none focus:border-amber-500">
              <option value="private">Private — only you</option>
              <option value="family_only">Family Only — people in the tree</option>
              <option value="public">Public — anyone can view</option>
            </select>
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-3 bg-amber-600 hover:bg-amber-500 disabled:bg-amber-800 text-white font-semibold rounded-lg transition">
            {loading ? "Creating..." : "Create Family Tree"}
          </button>
        </form>
      </div>
    </div>
  );
}

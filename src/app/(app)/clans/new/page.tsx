"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NewClanPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "", alternateName: "", totem: "", praisePoem: "",
    originRegion: "", originCountry: "", ethnicGroup: "", history: "", logoUrl: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/clans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || "Failed."); return; }
      router.push(`/clans/${data.data.clan.id}`);
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-950 text-white py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/clans" className="text-stone-400 hover:text-white">← Clans</Link>
          <h1 className="text-2xl font-bold text-amber-400">Add Clan / Lineage</h1>
        </div>
        {error && <div className="mb-4 p-3 bg-red-900/40 border border-red-700 rounded-lg text-red-300 text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="bg-stone-800 border border-stone-700 rounded-xl p-6 space-y-4">
            <h2 className="text-amber-400 font-semibold">Identity</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-stone-300 text-sm font-medium mb-1">Clan Name *</label>
                <input required value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Zulu, Akan, Kikuyu, Zazzau"
                  className="w-full px-3 py-2.5 bg-stone-700 border border-stone-600 rounded-lg text-white placeholder-stone-500 focus:outline-none focus:border-amber-500" />
              </div>
              <div>
                <label className="block text-stone-300 text-sm font-medium mb-1">Alternate / Praise Name</label>
                <input value={form.alternateName} onChange={e => set("alternateName", e.target.value)} placeholder="e.g. Amadlozi, Omowale"
                  className="w-full px-3 py-2.5 bg-stone-700 border border-stone-600 rounded-lg text-white placeholder-stone-500 focus:outline-none focus:border-amber-500" />
              </div>
              <div>
                <label className="block text-stone-300 text-sm font-medium mb-1">Totem</label>
                <input value={form.totem} onChange={e => set("totem", e.target.value)} placeholder="e.g. Lion, Elephant, Baobab"
                  className="w-full px-3 py-2.5 bg-stone-700 border border-stone-600 rounded-lg text-white placeholder-stone-500 focus:outline-none focus:border-amber-500" />
              </div>
              <div>
                <label className="block text-stone-300 text-sm font-medium mb-1">Ethnic Group</label>
                <input value={form.ethnicGroup} onChange={e => set("ethnicGroup", e.target.value)} placeholder="e.g. Yoruba, Nguni, Bantu"
                  className="w-full px-3 py-2.5 bg-stone-700 border border-stone-600 rounded-lg text-white placeholder-stone-500 focus:outline-none focus:border-amber-500" />
              </div>
              <div>
                <label className="block text-stone-300 text-sm font-medium mb-1">Origin Region</label>
                <input value={form.originRegion} onChange={e => set("originRegion", e.target.value)} placeholder="e.g. West Africa, Great Lakes"
                  className="w-full px-3 py-2.5 bg-stone-700 border border-stone-600 rounded-lg text-white placeholder-stone-500 focus:outline-none focus:border-amber-500" />
              </div>
              <div>
                <label className="block text-stone-300 text-sm font-medium mb-1">Origin Country</label>
                <input value={form.originCountry} onChange={e => set("originCountry", e.target.value)} placeholder="e.g. Nigeria, Kenya, Zimbabwe"
                  className="w-full px-3 py-2.5 bg-stone-700 border border-stone-600 rounded-lg text-white placeholder-stone-500 focus:outline-none focus:border-amber-500" />
              </div>
            </div>
          </section>

          <section className="bg-stone-800 border border-stone-700 rounded-xl p-6 space-y-4">
            <h2 className="text-amber-400 font-semibold">Heritage</h2>
            <div>
              <label className="block text-stone-300 text-sm font-medium mb-1">Praise Poem / Izibongo / Oriki</label>
              <textarea rows={4} value={form.praisePoem} onChange={e => set("praisePoem", e.target.value)} placeholder="The clan's ancestral praise poem or oral tradition..."
                className="w-full px-3 py-2.5 bg-stone-700 border border-stone-600 rounded-lg text-white placeholder-stone-500 focus:outline-none focus:border-amber-500 resize-none" />
            </div>
            <div>
              <label className="block text-stone-300 text-sm font-medium mb-1">Clan History</label>
              <textarea rows={4} value={form.history} onChange={e => set("history", e.target.value)} placeholder="Historical background, migrations, notable ancestors..."
                className="w-full px-3 py-2.5 bg-stone-700 border border-stone-600 rounded-lg text-white placeholder-stone-500 focus:outline-none focus:border-amber-500 resize-none" />
            </div>
          </section>

          <div className="flex gap-4">
            <button type="submit" disabled={loading}
              className="flex-1 py-3 bg-amber-600 hover:bg-amber-500 disabled:bg-amber-800 text-white font-semibold rounded-lg transition">
              {loading ? "Saving..." : "Add Clan"}
            </button>
            <Link href="/clans" className="px-6 py-3 bg-stone-700 hover:bg-stone-600 text-white rounded-lg transition text-center">Cancel</Link>
          </div>
        </form>
      </div>
    </div>
  );
}

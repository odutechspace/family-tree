"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

interface Clan {
  id: number; name: string; alternateName?: string; totem?: string;
  originRegion?: string; originCountry?: string; ethnicGroup?: string;
  isVerified: boolean;
}

export default function ClansPage() {
  const [clans, setClans] = useState<Clan[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchClans = async (q = "") => {
    setLoading(true);
    const res = await fetch(`/api/clans?search=${encodeURIComponent(q)}`);
    const data = await res.json();
    setClans(data.data?.clans || []);
    setLoading(false);
  };

  useEffect(() => {
    const t = setTimeout(() => fetchClans(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { fetchClans(); }, []);

  return (
    <div className="min-h-screen bg-stone-950 text-white py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-amber-400">Clans & Lineages</h1>
            <p className="text-stone-400 mt-1">Explore African clans, totems, and ancestral groups</p>
          </div>
          <Link href="/clans/new" className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-lg transition">
            + Add Clan
          </Link>
        </div>

        <input
          type="text"
          placeholder="Search clans, totems, ethnic groups..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full px-4 py-3 mb-6 bg-stone-800 border border-stone-700 rounded-lg text-white placeholder-stone-500 focus:outline-none focus:border-amber-500 transition"
        />

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="bg-stone-800 rounded-xl h-40 animate-pulse" />)}
          </div>
        ) : clans.length === 0 ? (
          <div className="text-center py-16 text-stone-400">
            <p className="text-5xl mb-4">🦁</p>
            <p className="text-lg mb-2">No clans found</p>
            <Link href="/clans/new" className="text-amber-400 hover:text-amber-300">Add the first clan →</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {clans.map(clan => (
              <Link key={clan.id} href={`/clans/${clan.id}`}
                className="bg-stone-800 border border-stone-700 hover:border-amber-500/50 rounded-xl p-5 transition group">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-900/30 border border-amber-700/30 flex items-center justify-center text-xl">
                    {clan.totem ? "🦁" : "🌍"}
                  </div>
                  {clan.isVerified && <span className="text-xs px-1.5 py-0.5 bg-green-900/40 text-green-400 rounded border border-green-700">✓</span>}
                </div>
                <h3 className="font-bold text-white group-hover:text-amber-400 transition text-lg">{clan.name}</h3>
                {clan.alternateName && <p className="text-amber-400/60 text-sm">{clan.alternateName}</p>}
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {clan.totem && <span className="text-xs px-2 py-0.5 bg-amber-900/30 text-amber-400 rounded-full border border-amber-700/30">Totem: {clan.totem}</span>}
                  {clan.ethnicGroup && <span className="text-xs px-2 py-0.5 bg-stone-700 text-stone-300 rounded-full">{clan.ethnicGroup}</span>}
                  {clan.originCountry && <span className="text-xs px-2 py-0.5 bg-stone-700 text-stone-300 rounded-full">🌍 {clan.originCountry}</span>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

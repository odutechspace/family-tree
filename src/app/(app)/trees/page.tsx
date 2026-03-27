"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/src/hooks/useAuth";

interface FamilyTree {
  id: number;
  name: string;
  description?: string;
  visibility: string;
  rootPersonId?: number;
  createdAt: string;
}

export default function TreesPage() {
  const { user } = useAuth();
  const [trees, setTrees] = useState<FamilyTree[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"mine" | "public">("mine");

  const fetchTrees = async (which: "mine" | "public") => {
    setLoading(true);
    const url = which === "mine" ? "/api/trees?mine=1" : "/api/trees";
    const res = await fetch(url);
    const data = await res.json();
    setTrees(data.data?.trees || []);
    setLoading(false);
  };

  useEffect(() => { fetchTrees(tab); }, [tab]);

  return (
    <div className="min-h-screen bg-stone-950 text-white py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-amber-400">Family Trees</h1>
            <p className="text-stone-400 mt-1">Visualize and manage your family lineages</p>
          </div>
          <Link href="/trees/new" className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-lg transition">
            + New Tree
          </Link>
        </div>

        <div className="flex gap-2 mb-6">
          <button onClick={() => setTab("mine")} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tab === "mine" ? "bg-amber-600 text-white" : "bg-stone-800 text-stone-400 hover:text-white"}`}>
            My Trees
          </button>
          <button onClick={() => setTab("public")} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tab === "public" ? "bg-amber-600 text-white" : "bg-stone-800 text-stone-400 hover:text-white"}`}>
            Public Trees
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="bg-stone-800 rounded-xl h-40 animate-pulse" />)}
          </div>
        ) : trees.length === 0 ? (
          <div className="text-center py-16 text-stone-400">
            <p className="text-5xl mb-4">🌳</p>
            <p className="text-lg mb-2">{tab === "mine" ? "You have no trees yet" : "No public trees yet"}</p>
            <Link href="/trees/new" className="text-amber-400 hover:text-amber-300">Create your first family tree →</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {trees.map(tree => (
              <Link key={tree.id} href={`/trees/${tree.id}`}
                className="bg-stone-800 border border-stone-700 hover:border-amber-500/50 rounded-xl p-5 transition group flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-lg bg-amber-900/30 flex items-center justify-center text-xl">🌳</div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${tree.visibility === "public" ? "bg-green-900/40 text-green-400" : tree.visibility === "family_only" ? "bg-blue-900/40 text-blue-400" : "bg-stone-700 text-stone-400"}`}>
                    {tree.visibility.replace("_", " ")}
                  </span>
                </div>
                <div>
                  <h3 className="font-semibold text-white group-hover:text-amber-400 transition">{tree.name}</h3>
                  {tree.description && <p className="text-stone-400 text-sm mt-1 line-clamp-2">{tree.description}</p>}
                </div>
                <p className="text-stone-500 text-xs mt-auto">{new Date(tree.createdAt).toLocaleDateString()}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

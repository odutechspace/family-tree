"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

interface Person {
  id: number;
  firstName: string;
  middleName?: string;
  lastName: string;
  nickname?: string;
  gender: string;
  birthDate?: string;
  aliveStatus: string;
  photoUrl?: string;
  tribeEthnicity?: string;
  originCountry?: string;
}

export default function PersonsPage() {
  const [persons, setPersons] = useState<Person[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  const fetchPersons = async (q = "") => {
    setLoading(true);
    const res = await fetch(`/api/persons?search=${encodeURIComponent(q)}&limit=40`);
    const data = await res.json();
    setPersons(data.data?.persons || []);
    setTotal(data.data?.total || 0);
    setLoading(false);
  };

  useEffect(() => {
    const t = setTimeout(() => fetchPersons(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { fetchPersons(); }, []);

  return (
    <div className="min-h-screen bg-stone-950 text-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-amber-400">People Directory</h1>
            <p className="text-stone-400 mt-1">{total} people in the database</p>
          </div>
          <Link
            href="/persons/new"
            className="flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-lg transition"
          >
            + Add Person
          </Link>
        </div>

        <input
          type="text"
          placeholder="Search by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-3 mb-6 bg-stone-800 border border-stone-700 rounded-lg text-white placeholder-stone-500 focus:outline-none focus:border-amber-500 transition"
        />

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-stone-800 rounded-xl h-48 animate-pulse" />
            ))}
          </div>
        ) : persons.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-stone-400 text-lg mb-4">No people found</p>
            <Link href="/persons/new" className="text-amber-400 hover:text-amber-300">
              Add the first person →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {persons.map((p) => (
              <Link
                key={p.id}
                href={`/persons/${p.id}`}
                className="bg-stone-800 border border-stone-700 hover:border-amber-500/50 rounded-xl p-4 flex flex-col items-center gap-3 transition group"
              >
                <div className="w-16 h-16 rounded-full overflow-hidden bg-stone-700 flex items-center justify-center text-2xl font-bold text-amber-400">
                  {p.photoUrl ? (
                    <img src={p.photoUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    `${p.firstName[0]}${p.lastName[0]}`
                  )}
                </div>
                <div className="text-center">
                  <p className="font-semibold text-white group-hover:text-amber-400 transition leading-tight">
                    {p.firstName} {p.lastName}
                  </p>
                  {p.nickname && <p className="text-stone-400 text-xs mt-0.5">"{p.nickname}"</p>}
                  <div className="flex flex-wrap gap-1 justify-center mt-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${p.gender === "male" ? "bg-blue-900/50 text-blue-300" : p.gender === "female" ? "bg-pink-900/50 text-pink-300" : "bg-stone-700 text-stone-400"}`}>
                      {p.gender}
                    </span>
                    {p.aliveStatus === "deceased" && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-stone-700 text-stone-400">†</span>
                    )}
                  </div>
                  {p.tribeEthnicity && <p className="text-stone-500 text-xs mt-1">{p.tribeEthnicity}</p>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

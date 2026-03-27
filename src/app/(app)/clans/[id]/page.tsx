"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface Clan {
  id: number; name: string; alternateName?: string; totem?: string;
  praisePoem?: string; originRegion?: string; originCountry?: string;
  ethnicGroup?: string; history?: string; isVerified: boolean;
}
interface Person {
  id: number; firstName: string; lastName: string; gender: string; aliveStatus: string;
}

export default function ClanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [clan, setClan] = useState<Clan | null>(null);
  const [members, setMembers] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/clans/${id}`)
      .then(r => r.json())
      .then(data => {
        setClan(data.data?.clan || null);
        setMembers(data.data?.members || []);
        setLoading(false);
      });
  }, [id]);

  if (loading) return <div className="min-h-screen bg-stone-950 flex items-center justify-center text-stone-400">Loading...</div>;
  if (!clan) return <div className="min-h-screen bg-stone-950 flex items-center justify-center text-red-400">Clan not found.</div>;

  return (
    <div className="min-h-screen bg-stone-950 text-white py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/clans" className="text-stone-400 hover:text-white">← Clans</Link>
        </div>

        {/* Header */}
        <div className="bg-gradient-to-r from-amber-900/30 to-stone-800 border border-amber-700/30 rounded-2xl p-8 mb-6">
          <div className="flex items-start gap-6">
            <div className="w-20 h-20 rounded-xl bg-amber-900/50 border border-amber-700/50 flex items-center justify-center text-4xl flex-shrink-0">
              🦁
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-3xl font-bold text-amber-400">{clan.name}</h1>
                {clan.isVerified && <span className="text-xs px-2 py-0.5 bg-green-900/40 text-green-400 rounded-full border border-green-700">✓ Verified</span>}
              </div>
              {clan.alternateName && <p className="text-amber-300/70 text-lg mb-3">{clan.alternateName}</p>}
              <div className="flex flex-wrap gap-2">
                {clan.totem && <Badge>Totem: {clan.totem}</Badge>}
                {clan.ethnicGroup && <Badge>{clan.ethnicGroup}</Badge>}
                {clan.originCountry && <Badge>🌍 {clan.originRegion ? `${clan.originRegion}, ` : ""}{clan.originCountry}</Badge>}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {clan.praisePoem && (
              <section className="bg-stone-800 border border-stone-700 rounded-xl p-6">
                <h2 className="text-amber-400 font-semibold mb-4">Praise Poem / Izibongo / Oriki</h2>
                <p className="text-amber-300/80 italic leading-relaxed whitespace-pre-wrap font-serif text-lg">{clan.praisePoem}</p>
              </section>
            )}
            {clan.history && (
              <section className="bg-stone-800 border border-stone-700 rounded-xl p-6">
                <h2 className="text-amber-400 font-semibold mb-4">Clan History</h2>
                <p className="text-stone-300 leading-relaxed whitespace-pre-wrap">{clan.history}</p>
              </section>
            )}
          </div>

          <div className="space-y-4">
            <section className="bg-stone-800 border border-stone-700 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-amber-400 font-semibold">Members ({members.length})</h2>
                <Link href={`/persons?clanId=${id}`} className="text-stone-400 text-xs hover:text-amber-400">View all</Link>
              </div>
              {members.length === 0 ? (
                <p className="text-stone-500 text-sm">No members yet. Add people with this clan assigned.</p>
              ) : (
                <div className="space-y-2">
                  {members.slice(0, 10).map(p => (
                    <Link key={p.id} href={`/persons/${p.id}`} className="flex items-center gap-2 hover:text-amber-400 transition">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${p.gender === "male" ? "bg-blue-900 text-blue-300" : "bg-pink-900 text-pink-300"}`}>
                        {p.firstName[0]}{p.lastName[0]}
                      </div>
                      <span className="text-stone-300 text-sm">{p.firstName} {p.lastName}</span>
                      {p.aliveStatus === "deceased" && <span className="text-stone-500 text-xs ml-auto">†</span>}
                    </Link>
                  ))}
                  {members.length > 10 && <p className="text-stone-500 text-xs">+{members.length - 10} more</p>}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="text-xs px-2.5 py-1 bg-stone-700/80 text-stone-300 rounded-full">{children}</span>;
}

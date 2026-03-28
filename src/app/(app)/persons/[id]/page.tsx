"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface Relationship {
  id: number;
  personAId: number;
  personBId: number;
  type: string;
  status: string;
  startDate?: string;
  ceremonyType?: string;
  unionOrder?: number;
  notes?: string;
}

interface LifeEvent {
  id: number;
  type: string;
  customType?: string;
  title?: string;
  description?: string;
  eventDate?: string;
  eventDateApprox?: string;
  location?: string;
}

interface Person {
  id: number;
  firstName: string;
  middleName?: string;
  lastName: string;
  maidenName?: string;
  nickname?: string;
  gender: string;
  birthDate?: string;
  birthPlace?: string;
  aliveStatus: string;
  deathDate?: string;
  deathPlace?: string;
  photoUrl?: string;
  biography?: string;
  oralHistory?: string;
  tribeEthnicity?: string;
  totem?: string;
  originVillage?: string;
  originCountry?: string;
  isVerified: boolean;
}

const EVENT_ICONS: Record<string, string> = {
  birth: "👶", death: "✝️", naming_ceremony: "🌿", initiation: "🔥",
  lobola: "🐄", bridewealth: "🐄", traditional_marriage: "💍",
  church_marriage: "⛪", civil_marriage: "📜", graduation: "🎓",
  education: "📚", migration: "✈️", achievement: "🏆", memorial: "🕯️",
  burial: "⚱️", custom: "📌",
};

export default function PersonDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [person, setPerson] = useState<Person | null>(null);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [lifeEvents, setLifeEvents] = useState<LifeEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddRel, setShowAddRel] = useState(false);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [relatedPersons, setRelatedPersons] = useState<Person[]>([]);

  const fetchData = async () => {
    const res = await fetch(`/api/persons/${id}`);
    const data = await res.json();
    if (res.ok) {
      setPerson(data.data.person);
      setRelationships(data.data.relationships || []);
      setLifeEvents(data.data.lifeEvents || []);
    }
    setLoading(false);
  };

  const fetchRelatedPerson = async (personId: number) => {
    if (relatedPersons.find(p => p.id === personId)) return;
    const res = await fetch(`/api/persons/${personId}`);
    const data = await res.json();
    if (res.ok) setRelatedPersons(prev => [...prev, data.data.person]);
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  useEffect(() => {
    relationships.forEach(r => {
      const otherId = r.personAId === Number(id) ? r.personBId : r.personAId;
      fetchRelatedPerson(otherId);
    });
  }, [relationships]);

  const getRelatedPerson = (rel: Relationship) => {
    const otherId = rel.personAId === Number(id) ? rel.personBId : rel.personAId;
    return relatedPersons.find(p => p.id === otherId);
  };

  const relTypeLabel = (type: string, rel: Relationship) => {
    const isA = rel.personAId === Number(id);
    const labels: Record<string, string> = {
      parent_child: isA ? "Parent of" : "Child of",
      spouse: "Spouse",
      partner: "Partner",
      sibling: "Sibling",
      half_sibling: "Half-sibling",
      step_parent: isA ? "Step-parent of" : "Step-child of",
      adopted: isA ? "Adopted parent of" : "Adopted child of",
      guardian: isA ? "Guardian of" : "Ward of",
      co_wife: "Co-wife with",
      levirate: "Levirate union with",
    };
    return labels[type] || type;
  };

  if (loading) return <div className="min-h-screen bg-stone-950 flex items-center justify-center"><div className="text-stone-400">Loading...</div></div>;
  if (!person) return <div className="min-h-screen bg-stone-950 flex items-center justify-center"><div className="text-red-400">Person not found.</div></div>;

  return (
    <div className="min-h-screen bg-stone-950 text-white py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/persons" className="text-stone-400 hover:text-white">← People</Link>
        </div>

        {/* Header */}
        <div className="bg-stone-800 border border-stone-700 rounded-2xl p-6 mb-6 flex flex-col sm:flex-row gap-6">
          <div className="w-24 h-24 rounded-full overflow-hidden bg-stone-700 flex items-center justify-center text-3xl font-bold text-amber-400 flex-shrink-0">
            {person.photoUrl ? <img src={person.photoUrl} alt="" className="w-full h-full object-cover" /> : `${person.firstName[0]}${person.lastName[0]}`}
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-start gap-2 mb-2">
              <h1 className="text-2xl font-bold text-white">{person.firstName} {person.middleName} {person.lastName}</h1>
              {person.isVerified && <span className="text-xs px-2 py-0.5 bg-green-900/50 text-green-400 rounded-full border border-green-700">✓ Verified</span>}
              {person.aliveStatus === "deceased" && <span className="text-xs px-2 py-0.5 bg-stone-700 text-stone-400 rounded-full">†</span>}
            </div>
            {person.nickname && <p className="text-amber-400/80 mb-1">"{person.nickname}"</p>}
            {person.maidenName && <p className="text-stone-400 text-sm">née {person.maidenName}</p>}
            <div className="flex flex-wrap gap-2 mt-3">
              {person.tribeEthnicity && <Badge>{person.tribeEthnicity}</Badge>}
              {person.totem && <Badge>Totem: {person.totem}</Badge>}
              {person.originCountry && <Badge>🌍 {person.originVillage ? `${person.originVillage}, ` : ""}{person.originCountry}</Badge>}
              {person.birthDate && <Badge>Born {new Date(person.birthDate).getFullYear()}</Badge>}
              {person.deathDate && <Badge>† {new Date(person.deathDate).getFullYear()}</Badge>}
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            <Link href={`/persons/${id}/edit`} className="px-4 py-2 bg-stone-700 hover:bg-stone-600 text-white text-sm rounded-lg transition">Edit</Link>
            <Link href={`/merge-requests/new?sourcePersonId=${id}`} className="px-4 py-2 bg-amber-900/50 hover:bg-amber-900 text-amber-400 text-sm rounded-lg border border-amber-700/50 transition">
              Request Merge
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Biography */}
            {(person.biography || person.oralHistory) && (
              <section className="bg-stone-800 border border-stone-700 rounded-xl p-5">
                {person.biography && (
                  <>
                    <h2 className="text-amber-400 font-semibold mb-3">Biography</h2>
                    <p className="text-stone-300 leading-relaxed whitespace-pre-wrap">{person.biography}</p>
                  </>
                )}
                {person.oralHistory && (
                  <>
                    <h2 className="text-amber-400 font-semibold mt-4 mb-3">Oral History & Traditions</h2>
                    <p className="text-stone-300 leading-relaxed whitespace-pre-wrap italic">{person.oralHistory}</p>
                  </>
                )}
              </section>
            )}

            {/* Life Events */}
            <section className="bg-stone-800 border border-stone-700 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-amber-400 font-semibold">Life Events</h2>
                <button onClick={() => setShowAddEvent(true)} className="text-sm text-amber-400 hover:text-amber-300">+ Add Event</button>
              </div>
              {lifeEvents.length === 0 ? (
                <p className="text-stone-500 text-sm">No life events recorded yet.</p>
              ) : (
                <div className="space-y-3">
                  {lifeEvents.map(ev => (
                    <div key={ev.id} className="flex gap-3 items-start">
                      <span className="text-xl mt-0.5">{EVENT_ICONS[ev.type] || "📌"}</span>
                      <div>
                        <p className="font-medium text-white">{ev.title || ev.customType || ev.type.replace(/_/g, " ")}</p>
                        {ev.eventDate && <p className="text-stone-400 text-xs">{new Date(ev.eventDate).toLocaleDateString()}{ev.location ? ` · ${ev.location}` : ""}</p>}
                        {ev.eventDateApprox && !ev.eventDate && <p className="text-stone-400 text-xs">{ev.eventDateApprox}</p>}
                        {ev.description && <p className="text-stone-400 text-sm mt-1">{ev.description}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Relationships */}
          <div className="space-y-4">
            <section className="bg-stone-800 border border-stone-700 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-amber-400 font-semibold">Relationships</h2>
                <button onClick={() => setShowAddRel(true)} className="text-sm text-amber-400 hover:text-amber-300">+ Add</button>
              </div>
              {relationships.length === 0 ? (
                <p className="text-stone-500 text-sm">No relationships added yet.</p>
              ) : (
                <div className="space-y-3">
                  {relationships.map(rel => {
                    const other = getRelatedPerson(rel);
                    return (
                      <div key={rel.id} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-stone-700 flex items-center justify-center text-sm font-bold text-amber-400 flex-shrink-0">
                          {other ? `${other.firstName[0]}${other.lastName[0]}` : "?"}
                        </div>
                        <div className="min-w-0">
                          <p className="text-stone-400 text-xs">{relTypeLabel(rel.type, rel)}</p>
                          {other ? (
                            <Link href={`/persons/${other.id}`} className="text-white text-sm hover:text-amber-400 font-medium truncate block">
                              {other.firstName} {other.lastName}
                            </Link>
                          ) : (
                            <p className="text-stone-500 text-sm">Loading...</p>
                          )}
                          {rel.type === "spouse" && rel.unionOrder && rel.unionOrder > 1 && (
                            <span className="text-xs text-amber-600">Wife #{rel.unionOrder}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <Link href={`/trees?personId=${id}`} className="block bg-stone-800 border border-stone-700 hover:border-amber-500/50 rounded-xl p-4 text-center transition">
              <p className="text-amber-400 font-medium">View in Family Tree →</p>
            </Link>
          </div>
        </div>
      </div>

      {showAddRel && <AddRelationModal personId={Number(id)} onClose={() => setShowAddRel(false)} onSaved={() => { setShowAddRel(false); fetchData(); }} />}
      {showAddEvent && <AddEventModal personId={Number(id)} onClose={() => setShowAddEvent(false)} onSaved={() => { setShowAddEvent(false); fetchData(); }} />}
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="text-xs px-2.5 py-1 bg-stone-700 text-stone-300 rounded-full">{children}</span>;
}

const REL_TYPES = [
  { value: "parent_child", label: "Parent → Child" },
  { value: "spouse", label: "Spouse (Marriage)" },
  { value: "partner", label: "Partner (Traditional Union)" },
  { value: "sibling", label: "Sibling" },
  { value: "half_sibling", label: "Half-Sibling" },
  { value: "step_parent", label: "Step-Parent → Step-Child" },
  { value: "adopted", label: "Adoptive Parent → Child" },
  { value: "guardian", label: "Guardian → Ward" },
  { value: "co_wife", label: "Co-Wife" },
  { value: "levirate", label: "Levirate Union" },
];

function AddRelationModal({ personId, onClose, onSaved }: { personId: number; onClose: () => void; onSaved: () => void; }) {
  const [form, setForm] = useState({ otherPersonId: "", type: "parent_child", asPersonA: "true", startDate: "", ceremonyType: "", unionOrder: "1", notes: "" });
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!search) { setResults([]); return; }
    const t = setTimeout(async () => {
      const r = await fetch(`/api/persons?search=${encodeURIComponent(search)}&limit=10`);
      const d = await r.json();
      setResults((d.data?.persons || []).filter((p: any) => p.id !== personId));
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const handleSave = async () => {
    if (!form.otherPersonId || !form.type) { setError("Please select a person and type."); return; }
    setSaving(true);
    setError("");
    const personAId = form.asPersonA === "true" ? personId : Number(form.otherPersonId);
    const personBId = form.asPersonA === "true" ? Number(form.otherPersonId) : personId;
    const res = await fetch("/api/relationships", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personAId, personBId, type: form.type, startDate: form.startDate || undefined, ceremonyType: form.ceremonyType || undefined, unionOrder: Number(form.unionOrder), notes: form.notes || undefined }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.message || "Failed to save."); setSaving(false); return; }
    onSaved();
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-stone-800 border border-stone-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <h3 className="text-xl font-bold text-amber-400 mb-4">Add Relationship</h3>
        {error && <div className="mb-3 p-2 bg-red-900/40 border border-red-700 rounded text-red-300 text-sm">{error}</div>}

        <div className="space-y-4">
          <div>
            <label className="block text-stone-300 text-sm mb-1">Search Person</label>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Type a name..."
              className="w-full px-3 py-2 bg-stone-700 border border-stone-600 rounded-lg text-white placeholder-stone-500 focus:outline-none focus:border-amber-500" />
            {results.length > 0 && (
              <div className="mt-1 bg-stone-900 border border-stone-700 rounded-lg overflow-hidden">
                {results.map(p => (
                  <button key={p.id} onClick={() => { setForm(f => ({ ...f, otherPersonId: String(p.id) })); setSearch(`${p.firstName} ${p.lastName}`); setResults([]); }}
                    className="w-full text-left px-3 py-2 hover:bg-stone-700 text-white text-sm border-b border-stone-700 last:border-0">
                    {p.firstName} {p.lastName}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-stone-300 text-sm mb-1">Relationship Type</label>
            <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
              className="w-full px-3 py-2 bg-stone-700 border border-stone-600 rounded-lg text-white focus:outline-none focus:border-amber-500">
              {REL_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          {form.type === "parent_child" && (
            <div>
              <label className="block text-stone-300 text-sm mb-1">I am the...</label>
              <select value={form.asPersonA} onChange={e => setForm(f => ({ ...f, asPersonA: e.target.value }))}
                className="w-full px-3 py-2 bg-stone-700 border border-stone-600 rounded-lg text-white focus:outline-none focus:border-amber-500">
                <option value="true">Parent (this person is the child)</option>
                <option value="false">Child (this person is the parent)</option>
              </select>
            </div>
          )}

          {["spouse", "partner", "traditional_marriage"].includes(form.type) && (
            <>
              <div>
                <label className="block text-stone-300 text-sm mb-1">Marriage / Union Date</label>
                <input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                  className="w-full px-3 py-2 bg-stone-700 border border-stone-600 rounded-lg text-white focus:outline-none focus:border-amber-500" />
              </div>
              <div>
                <label className="block text-stone-300 text-sm mb-1">Ceremony Type</label>
                <input value={form.ceremonyType} onChange={e => setForm(f => ({ ...f, ceremonyType: e.target.value }))} placeholder="e.g. Lobola, Church, Civil, Customary"
                  className="w-full px-3 py-2 bg-stone-700 border border-stone-600 rounded-lg text-white placeholder-stone-500 focus:outline-none focus:border-amber-500" />
              </div>
              <div>
                <label className="block text-stone-300 text-sm mb-1">Union Order (1 = first wife/husband)</label>
                <input type="number" min={1} max={10} value={form.unionOrder} onChange={e => setForm(f => ({ ...f, unionOrder: e.target.value }))}
                  className="w-full px-3 py-2 bg-stone-700 border border-stone-600 rounded-lg text-white focus:outline-none focus:border-amber-500" />
              </div>
            </>
          )}

          <div>
            <label className="block text-stone-300 text-sm mb-1">Notes (optional)</label>
            <textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any additional details..."
              className="w-full px-3 py-2 bg-stone-700 border border-stone-600 rounded-lg text-white placeholder-stone-500 focus:outline-none focus:border-amber-500 resize-none" />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:bg-amber-800 text-white font-semibold rounded-lg transition">
            {saving ? "Saving..." : "Save Relationship"}
          </button>
          <button onClick={onClose} className="px-5 py-2.5 bg-stone-700 hover:bg-stone-600 text-white rounded-lg transition">Cancel</button>
        </div>
      </div>
    </div>
  );
}

const EVENT_TYPES = [
  "birth", "death", "naming_ceremony", "initiation", "lobola", "bridewealth",
  "traditional_marriage", "church_marriage", "civil_marriage", "graduation",
  "education", "migration", "achievement", "memorial", "burial", "custom",
];

function AddEventModal({ personId, onClose, onSaved }: { personId: number; onClose: () => void; onSaved: () => void; }) {
  const [form, setForm] = useState({ type: "birth", customType: "", title: "", description: "", eventDate: "", eventDateApprox: "", location: "", country: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    setError("");
    const res = await fetch("/api/life-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personId, ...form, eventDate: form.eventDate || undefined }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.message || "Failed."); setSaving(false); return; }
    onSaved();
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-stone-800 border border-stone-700 rounded-2xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold text-amber-400 mb-4">Add Life Event</h3>
        {error && <div className="mb-3 p-2 bg-red-900/40 border border-red-700 rounded text-red-300 text-sm">{error}</div>}

        <div className="space-y-4">
          <div>
            <label className="block text-stone-300 text-sm mb-1">Event Type</label>
            <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
              className="w-full px-3 py-2 bg-stone-700 border border-stone-600 rounded-lg text-white focus:outline-none focus:border-amber-500">
              {EVENT_TYPES.map(t => <option key={t} value={t}>{EVENT_ICONS[t] || "📌"} {t.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</option>)}
            </select>
          </div>
          {form.type === "custom" && (
            <div>
              <label className="block text-stone-300 text-sm mb-1">Custom Type Label</label>
              <input value={form.customType} onChange={e => setForm(f => ({ ...f, customType: e.target.value }))} placeholder="e.g. Coronation, First Hunt"
                className="w-full px-3 py-2 bg-stone-700 border border-stone-600 rounded-lg text-white placeholder-stone-500 focus:outline-none focus:border-amber-500" />
            </div>
          )}
          <div>
            <label className="block text-stone-300 text-sm mb-1">Title</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Brief title..."
              className="w-full px-3 py-2 bg-stone-700 border border-stone-600 rounded-lg text-white placeholder-stone-500 focus:outline-none focus:border-amber-500" />
          </div>
          <div>
            <label className="block text-stone-300 text-sm mb-1">Date</label>
            <input type="date" value={form.eventDate} onChange={e => setForm(f => ({ ...f, eventDate: e.target.value }))}
              className="w-full px-3 py-2 bg-stone-700 border border-stone-600 rounded-lg text-white focus:outline-none focus:border-amber-500" />
          </div>
          <div>
            <label className="block text-stone-300 text-sm mb-1">Approximate Date (if exact unknown)</label>
            <input value={form.eventDateApprox} onChange={e => setForm(f => ({ ...f, eventDateApprox: e.target.value }))} placeholder="e.g. Around 1960, Early 1970s"
              className="w-full px-3 py-2 bg-stone-700 border border-stone-600 rounded-lg text-white placeholder-stone-500 focus:outline-none focus:border-amber-500" />
          </div>
          <div>
            <label className="block text-stone-300 text-sm mb-1">Location</label>
            <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Village, city..."
              className="w-full px-3 py-2 bg-stone-700 border border-stone-600 rounded-lg text-white placeholder-stone-500 focus:outline-none focus:border-amber-500" />
          </div>
          <div>
            <label className="block text-stone-300 text-sm mb-1">Description</label>
            <textarea rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Details about this event..."
              className="w-full px-3 py-2 bg-stone-700 border border-stone-600 rounded-lg text-white placeholder-stone-500 focus:outline-none focus:border-amber-500 resize-none" />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:bg-amber-800 text-white font-semibold rounded-lg transition">
            {saving ? "Saving..." : "Save Event"}
          </button>
          <button onClick={onClose} className="px-5 py-2.5 bg-stone-700 hover:bg-stone-600 text-white rounded-lg transition">Cancel</button>
        </div>
      </div>
    </div>
  );
}

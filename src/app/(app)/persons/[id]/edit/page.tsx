"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

const GENDER_OPTIONS = ["male", "female", "other", "unknown"];
const ALIVE_OPTIONS = ["alive", "deceased", "unknown"];

interface Clan { id: number; name: string; totem?: string; }

export default function EditPersonPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [clans, setClans] = useState<Clan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<any>({});

  useEffect(() => {
    Promise.all([
      fetch(`/api/persons/${id}`).then(r => r.json()),
      fetch("/api/clans").then(r => r.json()),
    ]).then(([personData, clanData]) => {
      const p = personData.data?.person;
      if (p) {
        setForm({
          firstName: p.firstName || "", middleName: p.middleName || "", lastName: p.lastName || "",
          maidenName: p.maidenName || "", nickname: p.nickname || "",
          gender: p.gender || "unknown", birthDate: p.birthDate ? p.birthDate.split("T")[0] : "",
          birthPlace: p.birthPlace || "", aliveStatus: p.aliveStatus || "unknown",
          deathDate: p.deathDate ? p.deathDate.split("T")[0] : "", deathPlace: p.deathPlace || "",
          photoUrl: p.photoUrl || "", biography: p.biography || "", oralHistory: p.oralHistory || "",
          clanId: p.clanId ? String(p.clanId) : "", tribeEthnicity: p.tribeEthnicity || "",
          totem: p.totem || "", originVillage: p.originVillage || "", originCountry: p.originCountry || "",
        });
      }
      setClans(clanData.data?.clans || []);
      setLoading(false);
    });
  }, [id]);

  const set = (k: string, v: string) => setForm((f: any) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const body: any = { ...form };
      if (!body.clanId) delete body.clanId;
      if (!body.birthDate) delete body.birthDate;
      if (!body.deathDate) delete body.deathDate;

      const res = await fetch(`/api/persons/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || "Failed to update."); return; }
      router.push(`/persons/${id}`);
    } catch {
      setError("Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-stone-950 flex items-center justify-center text-stone-400">Loading...</div>;

  return (
    <div className="min-h-screen bg-stone-950 text-white py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Link href={`/persons/${id}`} className="text-stone-400 hover:text-white">← Back</Link>
          <h1 className="text-2xl font-bold text-amber-400">Edit Person</h1>
        </div>
        {error && <div className="mb-6 p-3 bg-red-900/40 border border-red-700 rounded-lg text-red-300 text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="bg-stone-800 border border-stone-700 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-amber-400 mb-2">Basic Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <Field label="First Name *" value={form.firstName || ""} onChange={v => set("firstName", v)} required />
              <Field label="Middle Name" value={form.middleName || ""} onChange={v => set("middleName", v)} />
              <Field label="Last Name *" value={form.lastName || ""} onChange={v => set("lastName", v)} required />
              <Field label="Maiden Name" value={form.maidenName || ""} onChange={v => set("maidenName", v)} />
              <Field label="Nickname / Praise Name" value={form.nickname || ""} onChange={v => set("nickname", v)} />
              <div>
                <label className="block text-stone-300 text-sm font-medium mb-1">Gender</label>
                <select value={form.gender || "unknown"} onChange={e => set("gender", e.target.value)}
                  className="w-full px-3 py-2.5 bg-stone-700 border border-stone-600 rounded-lg text-white focus:outline-none focus:border-amber-500">
                  {GENDER_OPTIONS.map(g => <option key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</option>)}
                </select>
              </div>
            </div>
          </section>

          <section className="bg-stone-800 border border-stone-700 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-amber-400 mb-2">Life Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Birth Date" type="date" value={form.birthDate || ""} onChange={v => set("birthDate", v)} />
              <Field label="Birth Place" value={form.birthPlace || ""} onChange={v => set("birthPlace", v)} />
              <div>
                <label className="block text-stone-300 text-sm font-medium mb-1">Status</label>
                <select value={form.aliveStatus || "unknown"} onChange={e => set("aliveStatus", e.target.value)}
                  className="w-full px-3 py-2.5 bg-stone-700 border border-stone-600 rounded-lg text-white focus:outline-none focus:border-amber-500">
                  {ALIVE_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </select>
              </div>
              {form.aliveStatus === "deceased" && (
                <>
                  <Field label="Death Date" type="date" value={form.deathDate || ""} onChange={v => set("deathDate", v)} />
                  <Field label="Death Place" value={form.deathPlace || ""} onChange={v => set("deathPlace", v)} />
                </>
              )}
            </div>
          </section>

          <section className="bg-stone-800 border border-stone-700 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-amber-400 mb-2">African Heritage</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-stone-300 text-sm font-medium mb-1">Clan</label>
                <select value={form.clanId || ""} onChange={e => set("clanId", e.target.value)}
                  className="w-full px-3 py-2.5 bg-stone-700 border border-stone-600 rounded-lg text-white focus:outline-none focus:border-amber-500">
                  <option value="">— Select clan —</option>
                  {clans.map(c => <option key={c.id} value={c.id}>{c.name} {c.totem ? `(${c.totem})` : ""}</option>)}
                </select>
              </div>
              <Field label="Tribe / Ethnicity" value={form.tribeEthnicity || ""} onChange={v => set("tribeEthnicity", v)} />
              <Field label="Totem" value={form.totem || ""} onChange={v => set("totem", v)} />
              <Field label="Origin Village" value={form.originVillage || ""} onChange={v => set("originVillage", v)} />
              <Field label="Origin Country" value={form.originCountry || ""} onChange={v => set("originCountry", v)} />
            </div>
          </section>

          <section className="bg-stone-800 border border-stone-700 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-amber-400 mb-2">Story & Media</h2>
            <Field label="Photo URL" value={form.photoUrl || ""} onChange={v => set("photoUrl", v)} />
            <TextArea label="Biography" value={form.biography || ""} onChange={v => set("biography", v)} rows={3} />
            <TextArea label="Oral History / Traditions" value={form.oralHistory || ""} onChange={v => set("oralHistory", v)} rows={3} />
          </section>

          <div className="flex gap-4">
            <button type="submit" disabled={saving}
              className="flex-1 py-3 bg-amber-600 hover:bg-amber-500 disabled:bg-amber-800 text-white font-semibold rounded-lg transition">
              {saving ? "Saving..." : "Save Changes"}
            </button>
            <Link href={`/persons/${id}`} className="px-6 py-3 bg-stone-700 hover:bg-stone-600 text-white rounded-lg transition text-center">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, required, type = "text", placeholder }: {
  label: string; value: string; onChange: (v: string) => void;
  required?: boolean; type?: string; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-stone-300 text-sm font-medium mb-1">{label}</label>
      <input type={type} required={required} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-3 py-2.5 bg-stone-700 border border-stone-600 rounded-lg text-white placeholder-stone-500 focus:outline-none focus:border-amber-500 transition" />
    </div>
  );
}

function TextArea({ label, value, onChange, rows = 3 }: {
  label: string; value: string; onChange: (v: string) => void; rows?: number;
}) {
  return (
    <div>
      <label className="block text-stone-300 text-sm font-medium mb-1">{label}</label>
      <textarea rows={rows} value={value} onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2.5 bg-stone-700 border border-stone-600 rounded-lg text-white placeholder-stone-500 focus:outline-none focus:border-amber-500 transition resize-none" />
    </div>
  );
}

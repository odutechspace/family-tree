"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import { Textarea } from "@/src/components/ui/textarea";

const GENDER_OPTIONS = ["male", "female", "other", "unknown"];
const ALIVE_OPTIONS = ["alive", "deceased", "unknown"];

interface Clan {
  id: number;
  name: string;
  totem?: string;
}

export default function NewPersonPage() {
  const router = useRouter();
  const [clans, setClans] = useState<Clan[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    maidenName: "",
    nickname: "",
    gender: "unknown",
    birthDate: "",
    birthPlace: "",
    aliveStatus: "unknown",
    deathDate: "",
    deathPlace: "",
    photoUrl: "",
    biography: "",
    oralHistory: "",
    clanId: "",
    tribeEthnicity: "",
    totem: "",
    originVillage: "",
    originCountry: "",
  });

  useEffect(() => {
    fetch("/api/clans")
      .then((r) => r.json())
      .then((d) => setClans(d.data?.clans || []));
  }, []);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const body: Record<string, unknown> = { ...form };
      if (!body.clanId) delete body.clanId;
      if (!body.birthDate) delete body.birthDate;
      if (!body.deathDate) delete body.deathDate;

      const res = await fetch("/api/persons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Failed to create person.");
        return;
      }
      router.push(`/persons/${data.data.person.id}`);
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 py-8 text-foreground">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/persons">← Back</Link>
          </Button>
          <h1 className="text-2xl font-bold text-primary">Add New Person</h1>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-primary">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 space-y-0">
              <Field label="First Name *" value={form.firstName} onChange={(v) => set("firstName", v)} required />
              <Field label="Middle Name" value={form.middleName} onChange={(v) => set("middleName", v)} />
              <Field label="Last Name *" value={form.lastName} onChange={(v) => set("lastName", v)} required />
              <Field label="Maiden Name" value={form.maidenName} onChange={(v) => set("maidenName", v)} />
              <Field label="Nickname / Praise Name" value={form.nickname} onChange={(v) => set("nickname", v)} />
              <div className="space-y-2">
                <Label>Gender</Label>
                <Select value={form.gender} onValueChange={(v) => set("gender", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GENDER_OPTIONS.map((g) => (
                      <SelectItem key={g} value={g}>
                        {g.charAt(0).toUpperCase() + g.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-primary">Life Details</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <Field label="Birth Date" type="date" value={form.birthDate} onChange={(v) => set("birthDate", v)} />
              <Field label="Birth Place" value={form.birthPlace} onChange={(v) => set("birthPlace", v)} />
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.aliveStatus} onValueChange={(v) => set("aliveStatus", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ALIVE_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {form.aliveStatus === "deceased" && (
                <>
                  <Field label="Death Date" type="date" value={form.deathDate} onChange={(v) => set("deathDate", v)} />
                  <Field label="Death Place" value={form.deathPlace} onChange={(v) => set("deathPlace", v)} />
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-primary">African Heritage</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Clan</Label>
                <Select value={form.clanId || "__none__"} onValueChange={(v) => set("clanId", v === "__none__" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="— Select clan —" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Select clan —</SelectItem>
                    {clans.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name} {c.totem ? `(${c.totem})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Field
                label="Tribe / Ethnicity"
                value={form.tribeEthnicity}
                onChange={(v) => set("tribeEthnicity", v)}
                placeholder="e.g. Yoruba, Zulu, Kikuyu"
              />
              <Field label="Totem" value={form.totem} onChange={(v) => set("totem", v)} placeholder="e.g. Lion, Elephant" />
              <Field label="Origin Village" value={form.originVillage} onChange={(v) => set("originVillage", v)} />
              <Field label="Origin Country" value={form.originCountry} onChange={(v) => set("originCountry", v)} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-primary">Story & Media</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label="Photo URL" value={form.photoUrl} onChange={(v) => set("photoUrl", v)} placeholder="https://..." />
              <div className="space-y-2">
                <Label>Biography</Label>
                <Textarea
                  rows={3}
                  value={form.biography}
                  onChange={(e) => set("biography", e.target.value)}
                  placeholder="Write a short biography..."
                />
              </div>
              <div className="space-y-2">
                <Label>Oral History / Traditions</Label>
                <Textarea
                  rows={3}
                  value={form.oralHistory}
                  onChange={(e) => set("oralHistory", e.target.value)}
                  placeholder="Stories, proverbs, or traditions passed down..."
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-4">
            <Button type="submit" disabled={loading} className="flex-1" size="lg">
              {loading ? "Saving..." : "Add Person"}
            </Button>
            <Button variant="secondary" size="lg" asChild>
              <Link href="/persons">Cancel</Link>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

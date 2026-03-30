"use client";
import { useQueries } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

import { Button } from "@/src/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/card";
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
import { apiGetData } from "@/src/lib/api-fetch";
import { queryKeys } from "@/src/lib/query-keys";

const GENDER_OPTIONS = ["male", "female", "other", "unknown"];
const ALIVE_OPTIONS = ["alive", "deceased", "unknown"];

interface Clan {
  id: number;
  name: string;
  totem?: string;
}

export default function EditPersonPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<Record<string, string>>({});

  const [personQ, clansQ] = useQueries({
    queries: [
      {
        queryKey: queryKeys.persons.detail(id ?? ""),
        queryFn: () =>
          apiGetData<{ person: Record<string, unknown> }>(`/api/persons/${id}`),
        enabled: !!id,
      },
      {
        queryKey: queryKeys.clans.list({ search: "" }),
        queryFn: () => apiGetData<{ clans: Clan[] }>("/api/clans"),
      },
    ],
  });

  const clans = clansQ.data?.clans ?? [];
  const loading = personQ.isPending || clansQ.isPending;

  useEffect(() => {
    const p = personQ.data?.person;
    if (!p) return;
    setForm({
      firstName: (p.firstName as string) || "",
      middleName: (p.middleName as string) || "",
      lastName: (p.lastName as string) || "",
      maidenName: (p.maidenName as string) || "",
      nickname: (p.nickname as string) || "",
      gender: (p.gender as string) || "unknown",
      birthDate: p.birthDate
        ? String(p.birthDate).split("T")[0]
        : "",
      birthPlace: (p.birthPlace as string) || "",
      aliveStatus: (p.aliveStatus as string) || "unknown",
      deathDate: p.deathDate
        ? String(p.deathDate).split("T")[0]
        : "",
      deathPlace: (p.deathPlace as string) || "",
      photoUrl: (p.photoUrl as string) || "",
      biography: (p.biography as string) || "",
      oralHistory: (p.oralHistory as string) || "",
      clanId: p.clanId ? String(p.clanId) : "",
      tribeEthnicity: (p.tribeEthnicity as string) || "",
      totem: (p.totem as string) || "",
      originVillage: (p.originVillage as string) || "",
      originCountry: (p.originCountry as string) || "",
    });
  }, [personQ.data]);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const body: Record<string, unknown> = { ...form };

      if (!body.clanId) delete body.clanId;
      if (!body.birthDate) delete body.birthDate;
      if (!body.deathDate) delete body.deathDate;

      const res = await fetch(`/api/persons/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Failed to update.");

        return;
      }
      router.push(`/persons/${id}`);
    } catch {
      setError("Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8 text-foreground">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 flex items-center gap-3">
          <Button asChild size="sm" variant="ghost">
            <Link href={`/persons/${id}`}>← Back</Link>
          </Button>
          <h1 className="text-2xl font-bold text-primary">Edit Person</h1>
        </div>
        {error && (
          <div className="mb-6 rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}
        <form className="space-y-6" onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle className="text-primary">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <Field
                required
                label="First Name *"
                value={form.firstName || ""}
                onChange={(v) => set("firstName", v)}
              />
              <Field
                label="Middle Name"
                value={form.middleName || ""}
                onChange={(v) => set("middleName", v)}
              />
              <Field
                required
                label="Last Name *"
                value={form.lastName || ""}
                onChange={(v) => set("lastName", v)}
              />
              <Field
                label="Maiden Name"
                value={form.maidenName || ""}
                onChange={(v) => set("maidenName", v)}
              />
              <Field
                label="Nickname / Praise Name"
                value={form.nickname || ""}
                onChange={(v) => set("nickname", v)}
              />
              <div className="space-y-2">
                <Label>Gender</Label>
                <Select
                  value={form.gender || "unknown"}
                  onValueChange={(v) => set("gender", v)}
                >
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
              <Field
                label="Birth Date"
                type="date"
                value={form.birthDate || ""}
                onChange={(v) => set("birthDate", v)}
              />
              <Field
                label="Birth Place"
                value={form.birthPlace || ""}
                onChange={(v) => set("birthPlace", v)}
              />
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.aliveStatus || "unknown"}
                  onValueChange={(v) => set("aliveStatus", v)}
                >
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
                  <Field
                    label="Death Date"
                    type="date"
                    value={form.deathDate || ""}
                    onChange={(v) => set("deathDate", v)}
                  />
                  <Field
                    label="Death Place"
                    value={form.deathPlace || ""}
                    onChange={(v) => set("deathPlace", v)}
                  />
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
                <Select
                  value={form.clanId || "__none__"}
                  onValueChange={(v) =>
                    set("clanId", v === "__none__" ? "" : v)
                  }
                >
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
                value={form.tribeEthnicity || ""}
                onChange={(v) => set("tribeEthnicity", v)}
              />
              <Field
                label="Totem"
                value={form.totem || ""}
                onChange={(v) => set("totem", v)}
              />
              <Field
                label="Origin Village"
                value={form.originVillage || ""}
                onChange={(v) => set("originVillage", v)}
              />
              <Field
                label="Origin Country"
                value={form.originCountry || ""}
                onChange={(v) => set("originCountry", v)}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-primary">Story & Media</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field
                label="Photo URL"
                value={form.photoUrl || ""}
                onChange={(v) => set("photoUrl", v)}
              />
              <div className="space-y-2">
                <Label>Biography</Label>
                <Textarea
                  rows={3}
                  value={form.biography || ""}
                  onChange={(e) => set("biography", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Oral History / Traditions</Label>
                <Textarea
                  rows={3}
                  value={form.oralHistory || ""}
                  onChange={(e) => set("oralHistory", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-4">
            <Button
              className="flex-1"
              disabled={saving}
              size="lg"
              type="submit"
            >
              {saving ? "Saving..." : "Save Changes"}
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link href={`/persons/${id}`}>Cancel</Link>
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
        placeholder={placeholder}
        required={required}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

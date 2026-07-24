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
import { DatePicker } from "@/src/components/ui/date-picker";
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
import { Switch } from "@/src/components/ui/switch";
import { apiGetData } from "@/src/lib/api-fetch";
import { queryKeys } from "@/src/lib/query-keys";

const GENDER_OPTIONS = ["male", "female", "other", "unknown"] as const;
const ALIVE_OPTIONS = ["alive", "deceased", "unknown"] as const;

interface Clan {
  id: number;
  name: string;
  totem?: string;
}

function asString(value: unknown): string {
  if (value == null) return "";
  return String(value);
}

function toDateInput(value: unknown): string {
  if (!value) return "";
  const match = String(value).match(/^(\d{4}-\d{2}-\d{2})/);
  return match?.[1] ?? "";
}

function normalizeOption(
  value: unknown,
  allowed: readonly string[],
  fallback: string,
): string {
  const normalized = asString(value).trim().toLowerCase();
  return allowed.includes(normalized) ? normalized : fallback;
}

function personToForm(p: Record<string, unknown>): Record<string, string> {
  return {
    firstName: asString(p.firstName),
    middleName: asString(p.middleName),
    lastName: asString(p.lastName),
    maidenName: asString(p.maidenName),
    nickname: asString(p.nickname),
    gender: normalizeOption(p.gender, GENDER_OPTIONS, "unknown"),
    birthDate: toDateInput(p.birthDate),
    birthPlace: asString(p.birthPlace),
    aliveStatus: normalizeOption(p.aliveStatus, ALIVE_OPTIONS, "unknown"),
    deathDate: toDateInput(p.deathDate),
    deathPlace: asString(p.deathPlace),
    photoUrl: asString(p.photoUrl),
    biography: asString(p.biography),
    oralHistory: asString(p.oralHistory),
    clanId: p.clanId != null && p.clanId !== "" ? String(p.clanId) : "",
    tribeEthnicity: asString(p.tribeEthnicity),
    totem: asString(p.totem),
    originVillage: asString(p.originVillage),
    originCountry: asString(p.originCountry),
    visibility: normalizeOption(
      p.visibility,
      ["public", "connections", "stewards"],
      "connections",
    ),
    isPrivate: p.isPrivate === true || p.isPrivate === "true" ? "true" : "false",
  };
}

export default function EditPersonPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  // null until person data is mapped — avoids Radix Select mounting on fallbacks
  const [form, setForm] = useState<Record<string, string> | null>(null);
  const [canEdit, setCanEdit] = useState(true);
  const [proposeMsg, setProposeMsg] = useState("");

  const [personQ, clansQ] = useQueries({
    queries: [
      {
        queryKey: queryKeys.persons.detail(id ?? ""),
        queryFn: () =>
          apiGetData<{
            person: Record<string, unknown>;
            canEdit?: boolean;
          }>(`/api/persons/${id}`),
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
    setForm(null);
  }, [id]);

  useEffect(() => {
    const p = personQ.data?.person;
    if (!p) return;
    setForm(personToForm(p));
    setCanEdit(personQ.data?.canEdit !== false);
  }, [personQ.data, id]);

  const set = (k: string, v: string) =>
    setForm((f) => (f ? { ...f, [k]: v } : f));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    setError("");
    try {
      const body: Record<string, unknown> = { ...form };

      if (!body.clanId) delete body.clanId;
      if (!body.birthDate) delete body.birthDate;
      if (!body.deathDate) delete body.deathDate;
      body.isPrivate = form.isPrivate === "true";

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
      if (data.data?.proposed) {
        setProposeMsg(
          "Your changes were submitted as a proposal for a steward to review.",
        );
        return;
      }
      router.push(`/persons/${id}`);
    } catch {
      setError("Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !form) {
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
        {!canEdit && (
          <div className="mb-6 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-sm text-primary">
            You are not a steward of this person. Saving will suggest changes for
            steward review instead of writing directly.
          </div>
        )}
        {proposeMsg && (
          <div className="mb-6 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm">
            {proposeMsg}{" "}
            <Link className="underline" href="/proposals">
              View proposals
            </Link>
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
                  key={`gender-${id}`}
                  value={form.gender}
                  onValueChange={(v) => set("gender", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
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
              <div className="space-y-2">
                <Label>Birth Date</Label>
                <DatePicker
                  placeholder="Select birth date"
                  value={form.birthDate || ""}
                  onChange={(v) => set("birthDate", v)}
                />
              </div>
              <Field
                label="Birth Place"
                value={form.birthPlace || ""}
                onChange={(v) => set("birthPlace", v)}
              />
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  key={`status-${id}`}
                  value={form.aliveStatus}
                  onValueChange={(v) => set("aliveStatus", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
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
                  <div className="space-y-2">
                    <Label>Death Date</Label>
                    <DatePicker
                      placeholder="Select death date"
                      value={form.deathDate || ""}
                      onChange={(v) => set("deathDate", v)}
                    />
                  </div>
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
                  key={`clan-${id}`}
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
              <div className="space-y-2 col-span-2">
                <Label>Visibility</Label>
                <Select
                  key={`visibility-${id}`}
                  value={form.visibility || "connections"}
                  onValueChange={(v) => set("visibility", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">
                      Public — anyone on My Ukoo
                    </SelectItem>
                    <SelectItem value="connections">
                      Family — relatives in the graph
                    </SelectItem>
                    <SelectItem value="stewards">
                      Family — relatives in the graph (not publicly listed)
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Relatives within a few degrees of kinship can view this person
                  unless you hide them below.
                </p>
              </div>
              <div className="col-span-2 flex items-start justify-between gap-4 rounded-lg border border-border p-3">
                <div className="space-y-1">
                  <Label htmlFor="isPrivate">
                    Hide from relatives (only me and stewards can view)
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Overrides the visibility choice above. Use for sensitive
                    living people who should not appear to other relatives.
                  </p>
                </div>
                <Switch
                  checked={form.isPrivate === "true"}
                  id="isPrivate"
                  onCheckedChange={(checked) =>
                    set("isPrivate", checked ? "true" : "false")
                  }
                />
              </div>
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
              {saving
                ? "Saving..."
                : canEdit
                  ? "Save Changes"
                  : "Suggest Changes"}
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

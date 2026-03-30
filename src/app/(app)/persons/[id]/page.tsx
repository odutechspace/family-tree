"use client";
import { useQueries, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
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
import { Trash2 } from "lucide-react";

import {
  formatPersonDisplayName,
  getPersonInitials,
} from "@/src/lib/personDisplayName";
import { apiGetData } from "@/src/lib/api-fetch";
import { queryKeys } from "@/src/lib/query-keys";

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
  personCode?: string;
}

interface SuggestedMatch {
  person: {
    id: number;
    firstName: string;
    middleName?: string;
    lastName: string;
    maidenName?: string;
    nickname?: string;
    gender: string;
    birthDate?: string;
    aliveStatus: string;
    photoUrl?: string;
    personCode?: string;
    tribeEthnicity?: string;
    originCountry?: string;
  };
  score: number;
  reasons: string[];
}

const EVENT_ICONS: Record<string, string> = {
  birth: "👶",
  death: "✝️",
  naming_ceremony: "🌿",
  initiation: "🔥",
  lobola: "🐄",
  bridewealth: "🐄",
  traditional_marriage: "💍",
  church_marriage: "⛪",
  civil_marriage: "📜",
  graduation: "🎓",
  education: "📚",
  migration: "✈️",
  achievement: "🏆",
  memorial: "🕯️",
  burial: "⚱️",
  custom: "📌",
};

export default function PersonDetailPage() {
  const { id } = useParams<{ id: string }>();
  const personIdNum = Number(id);

  const { data: bundle, isPending, refetch } = useQuery({
    queryKey: queryKeys.persons.detail(id ?? ""),
    queryFn: () =>
      apiGetData<{
        person: Person;
        relationships: Relationship[];
        lifeEvents: LifeEvent[];
      }>(`/api/persons/${id}`),
    enabled: !!id,
  });

  const person = bundle?.person ?? null;
  const relationships = bundle?.relationships ?? [];
  const lifeEvents = bundle?.lifeEvents ?? [];

  const { data: suggestions = [] } = useQuery({
    queryKey: queryKeys.persons.suggestions(id ?? ""),
    queryFn: async () => {
      const d = await apiGetData<{ suggestions: SuggestedMatch[] }>(
        `/api/persons/suggestions?personId=${id}`,
      );
      return d.suggestions ?? [];
    },
    enabled: !!person,
  });

  const otherIds = useMemo(() => {
    const s = new Set<number>();
    for (const r of relationships) {
      const oid = r.personAId === personIdNum ? r.personBId : r.personAId;
      s.add(oid);
    }
    return [...s];
  }, [relationships, personIdNum]);

  const relatedQueries = useQueries({
    queries: otherIds.map((oid) => ({
      queryKey: queryKeys.persons.detail(oid),
      queryFn: () =>
        apiGetData<{ person: Person }>(`/api/persons/${oid}`),
      staleTime: 60_000,
    })),
  });

  const relatedPersons = relatedQueries
    .map((q) => q.data?.person)
    .filter((x): x is Person => !!x);

  const [showAddRel, setShowAddRel] = useState(false);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [relRemoveError, setRelRemoveError] = useState("");
  const [deletingRelId, setDeletingRelId] = useState<number | null>(null);

  const fetchData = () => {
    void refetch();
  };

  const loading = isPending;

  const getRelatedPerson = (rel: Relationship) => {
    const otherId =
      rel.personAId === Number(id) ? rel.personBId : rel.personAId;

    return relatedPersons.find((p) => p.id === otherId);
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

  const removeRelationship = async (
    rel: Relationship,
    other: Person | undefined,
  ) => {
    const otherName = other
      ? formatPersonDisplayName(other)
      : "this person";
    const linkDesc = relTypeLabel(rel.type, rel);
    if (
      !window.confirm(
        `Remove this relationship?\n\n${linkDesc} ${otherName} (relationship #${rel.id}).\n\nRemoving a parent–child link does not undo sibling links that may have been added automatically. Use + Add afterward to link people correctly (parent must be person A for Parent → Child).`,
      )
    ) {
      return;
    }
    setRelRemoveError("");
    setDeletingRelId(rel.id);
    try {
      const res = await fetch(`/api/relationships/${rel.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json();

      if (!res.ok) {
        setRelRemoveError(data.message || "Could not remove relationship.");

        return;
      }
      await refetch();
    } finally {
      setDeletingRelId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        Loading...
      </div>
    );
  }
  if (!person) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-destructive">
        Person not found.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8 text-foreground">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-center gap-3">
          <Button asChild size="sm" variant="ghost">
            <Link href="/persons">← People</Link>
          </Button>
        </div>

        <Card className="mb-6">
          <CardContent className="flex flex-col gap-6 p-6 sm:flex-row">
            <div className="flex h-24 w-24 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-3xl font-bold text-primary">
              {person.photoUrl ? (
                <img
                  alt=""
                  className="h-full w-full object-cover"
                  src={person.photoUrl}
                />
              ) : (
                getPersonInitials(person)
              )}
            </div>
            <div className="flex-1">
              <div className="mb-2 flex flex-wrap items-start gap-2">
                <h1 className="text-2xl font-bold">
                  {formatPersonDisplayName(person)}
                </h1>
                {person.isVerified && (
                  <span className="rounded-full border border-emerald-200 bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400">
                    ✓ Verified
                  </span>
                )}
                {person.aliveStatus === "deceased" && (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    †
                  </span>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {person.tribeEthnicity && (
                  <Badge>{person.tribeEthnicity}</Badge>
                )}
                {person.totem && <Badge>Totem: {person.totem}</Badge>}
                {person.originCountry && (
                  <Badge>
                    🌍 {person.originVillage ? `${person.originVillage}, ` : ""}
                    {person.originCountry}
                  </Badge>
                )}
                {person.birthDate && (
                  <Badge>Born {new Date(person.birthDate).getFullYear()}</Badge>
                )}
                {person.deathDate && (
                  <Badge>† {new Date(person.deathDate).getFullYear()}</Badge>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:items-end">
              <Button asChild size="sm" variant="secondary">
                <Link href={`/persons/${id}/edit`}>Edit</Link>
              </Button>
              <Button
                asChild
                className="border-primary/40 text-primary"
                size="sm"
                variant="outline"
              >
                <Link href={`/merge-requests/new?sourcePersonId=${id}`}>
                  Request Merge
                </Link>
              </Button>
              {person.personCode && (
                <button
                  className="flex items-center gap-1.5 rounded-lg border border-dashed border-primary/40 bg-primary/5 px-2.5 py-1.5 text-xs font-mono text-primary transition-colors hover:bg-primary/10"
                  title="Copy person code to share with relatives"
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(person.personCode!);
                    setCodeCopied(true);
                    setTimeout(() => setCodeCopied(false), 2000);
                  }}
                >
                  {codeCopied ? "Copied!" : person.personCode}
                  <span className="text-primary/60">
                    {codeCopied ? "✓" : "⎘"}
                  </span>
                </button>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {(person.biography || person.oralHistory) && (
              <Card>
                <CardContent className="space-y-4 p-5">
                  {person.biography && (
                    <>
                      <h2 className="font-semibold text-primary">Biography</h2>
                      <p className="whitespace-pre-wrap leading-relaxed text-foreground">
                        {person.biography}
                      </p>
                    </>
                  )}
                  {person.oralHistory && (
                    <>
                      <h2 className="mt-4 font-semibold text-primary">
                        Oral History & Traditions
                      </h2>
                      <p className="whitespace-pre-wrap italic leading-relaxed text-muted-foreground">
                        {person.oralHistory}
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base text-primary">
                  Life Events
                </CardTitle>
                <Button
                  className="h-auto p-0 text-primary"
                  variant="link"
                  onClick={() => setShowAddEvent(true)}
                >
                  + Add Event
                </Button>
              </CardHeader>
              <CardContent>
                {lifeEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No life events recorded yet.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {lifeEvents.map((ev) => (
                      <div key={ev.id} className="flex items-start gap-3">
                        <span className="mt-0.5 text-xl">
                          {EVENT_ICONS[ev.type] || "📌"}
                        </span>
                        <div>
                          <p className="font-medium text-foreground">
                            {ev.title ||
                              ev.customType ||
                              ev.type.replace(/_/g, " ")}
                          </p>
                          {ev.eventDate && (
                            <p className="text-xs text-muted-foreground">
                              {new Date(ev.eventDate).toLocaleDateString()}
                              {ev.location ? ` · ${ev.location}` : ""}
                            </p>
                          )}
                          {ev.eventDateApprox && !ev.eventDate && (
                            <p className="text-xs text-muted-foreground">
                              {ev.eventDateApprox}
                            </p>
                          )}
                          {ev.description && (
                            <p className="mt-1 text-sm text-muted-foreground">
                              {ev.description}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base text-primary">
                  Relationships
                </CardTitle>
                <Button
                  className="h-auto p-0 text-primary"
                  variant="link"
                  onClick={() => setShowAddRel(true)}
                >
                  + Add
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  To fix a wrong parent–child link: remove it here, check related
                  people for any incorrect sibling links, then use{" "}
                  <span className="font-medium text-foreground">+ Add</span> with
                  Parent → Child (parent as person A).
                </p>
                {relRemoveError && (
                  <p className="text-sm text-destructive">{relRemoveError}</p>
                )}
                {relationships.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No relationships added yet.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {relationships.map((rel) => {
                      const other = getRelatedPerson(rel);

                      return (
                        <div
                          key={rel.id}
                          className="flex items-center gap-3"
                          title={`Relationship #${rel.id}`}
                        >
                          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-muted text-sm font-bold text-primary">
                            {other ? getPersonInitials(other) : "?"}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs text-muted-foreground">
                              {relTypeLabel(rel.type, rel)}
                              <span className="ms-1 font-mono text-[10px] text-muted-foreground/80">
                                #{rel.id}
                              </span>
                            </p>
                            {other ? (
                              <Link
                                className="block truncate text-sm font-medium text-foreground hover:text-primary"
                                href={`/persons/${other.id}`}
                                title={formatPersonDisplayName(other)}
                              >
                                {formatPersonDisplayName(other)}
                              </Link>
                            ) : (
                              <p className="text-sm text-muted-foreground">
                                Loading...
                              </p>
                            )}
                            {rel.type === "spouse" &&
                              rel.unionOrder &&
                              rel.unionOrder > 1 && (
                                <span className="text-xs text-accent-foreground/80">
                                  Wife #{rel.unionOrder}
                                </span>
                              )}
                          </div>
                          <Button
                            aria-label={`Remove relationship ${rel.id}`}
                            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                            disabled={deletingRelId !== null}
                            size="icon"
                            type="button"
                            variant="ghost"
                            onClick={() => removeRelationship(rel, other)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <Button asChild className="h-auto w-full py-4" variant="outline">
              <Link href={`/trees?personId=${id}`}>
                <span className="font-medium text-primary">
                  View in Family Tree →
                </span>
              </Link>
            </Button>

            {suggestions.length > 0 && (
              <Card className="border-amber-200 dark:border-amber-800">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
                    <span>🔍</span> Possible Matches
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    These people in other trees may be the same person. Review
                    and submit a merge request if they match.
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {suggestions.map((s) => (
                    <div
                      key={s.person.id}
                      className="rounded-lg border border-border bg-muted/30 p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <Link
                            className="line-clamp-2 text-sm font-medium text-foreground hover:text-primary"
                            href={`/persons/${s.person.id}`}
                            title={formatPersonDisplayName(s.person)}
                          >
                            {formatPersonDisplayName(s.person)}
                          </Link>
                          {s.person.personCode && (
                            <p className="font-mono text-xs text-muted-foreground">
                              {s.person.personCode}
                            </p>
                          )}
                          <div className="mt-1 flex flex-wrap gap-1">
                            {s.reasons.map((r) => (
                              <span
                                key={r}
                                className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                              >
                                {r}
                              </span>
                            ))}
                          </div>
                        </div>
                        <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                          {s.score}%
                        </span>
                      </div>
                      <div className="mt-2">
                        <Button
                          asChild
                          className="h-7 w-full text-xs border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-400"
                          size="sm"
                          variant="outline"
                        >
                          <Link
                            href={`/merge-requests/new?sourcePersonId=${id}&targetPersonId=${s.person.id}`}
                          >
                            Flag as Same Person
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {showAddRel && (
        <AddRelationModal
          personId={Number(id)}
          onClose={() => setShowAddRel(false)}
          onSaved={() => {
            setShowAddRel(false);
            fetchData();
          }}
        />
      )}
      {showAddEvent && (
        <AddEventModal
          personId={Number(id)}
          onClose={() => setShowAddEvent(false)}
          onSaved={() => {
            setShowAddEvent(false);
            fetchData();
          }}
        />
      )}
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-border bg-muted px-2.5 py-1 text-xs text-muted-foreground">
      {children}
    </span>
  );
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

function AddRelationModal({
  personId,
  onClose,
  onSaved,
}: {
  personId: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    otherPersonId: "",
    type: "parent_child",
    asPersonA: "true",
    startDate: "",
    ceremonyType: "",
    unionOrder: "1",
    notes: "",
  });
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<
    {
      id: number;
      firstName: string;
      middleName?: string;
      lastName: string;
      maidenName?: string;
      nickname?: string;
    }[]
  >([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!search) {
      setResults([]);

      return;
    }
    const t = setTimeout(async () => {
      const r = await fetch(
        `/api/persons?search=${encodeURIComponent(search)}&limit=10`,
      );
      const d = await r.json();

      setResults(
        (d.data?.persons || []).filter(
          (p: { id: number }) => p.id !== personId,
        ),
      );
    }, 300);

    return () => clearTimeout(t);
  }, [search, personId]);

  const handleSave = async () => {
    if (!form.otherPersonId || !form.type) {
      setError("Please select a person and type.");

      return;
    }
    setSaving(true);
    setError("");
    const personAId =
      form.asPersonA === "true" ? personId : Number(form.otherPersonId);
    const personBId =
      form.asPersonA === "true" ? Number(form.otherPersonId) : personId;
    const res = await fetch("/api/relationships", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personAId,
        personBId,
        type: form.type,
        startDate: form.startDate || undefined,
        ceremonyType: form.ceremonyType || undefined,
        unionOrder: Number(form.unionOrder),
        notes: form.notes || undefined,
      }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.message || "Failed to save.");
      setSaving(false);

      return;
    }
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm dark:bg-black/60">
      <Card className="max-h-[90vh] w-full max-w-md overflow-y-auto shadow-lg">
        <CardHeader>
          <CardTitle className="text-primary">Add Relationship</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 px-2 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label>Search Person</Label>
            <Input
              placeholder="Type a name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {results.length > 0 && (
              <div className="mt-1 max-h-48 overflow-y-auto rounded-md border border-border bg-popover">
                {results.map((p) => (
                  <button
                    key={p.id}
                    className="w-full border-b border-border px-3 py-2 text-left text-sm last:border-0 hover:bg-accent"
                    type="button"
                    onClick={() => {
                      setForm((f) => ({ ...f, otherPersonId: String(p.id) }));
                      setSearch(formatPersonDisplayName(p));
                      setResults([]);
                    }}
                  >
                    {formatPersonDisplayName(p)}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Relationship Type</Label>
            <Select
              value={form.type}
              onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REL_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {form.type === "parent_child" && (
            <div className="space-y-2">
              <Label>I am the...</Label>
              <Select
                value={form.asPersonA}
                onValueChange={(v) => setForm((f) => ({ ...f, asPersonA: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">
                    Parent (this person is the child)
                  </SelectItem>
                  <SelectItem value="false">
                    Child (this person is the parent)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {["spouse", "partner", "traditional_marriage"].includes(
            form.type,
          ) && (
            <>
              <div className="space-y-2">
                <Label>Marriage / Union Date</Label>
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, startDate: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Ceremony Type</Label>
                <Input
                  placeholder="e.g. Lobola, Church, Civil, Customary"
                  value={form.ceremonyType}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, ceremonyType: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Union Order (1 = first wife/husband)</Label>
                <Input
                  max={10}
                  min={1}
                  type="number"
                  value={form.unionOrder}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, unionOrder: e.target.value }))
                  }
                />
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea
              placeholder="Any additional details..."
              rows={2}
              value={form.notes}
              onChange={(e) =>
                setForm((f) => ({ ...f, notes: e.target.value }))
              }
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              className="flex-1"
              disabled={saving}
              type="button"
              onClick={handleSave}
            >
              {saving ? "Saving..." : "Save Relationship"}
            </Button>
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

const EVENT_TYPES = [
  "birth",
  "death",
  "naming_ceremony",
  "initiation",
  "lobola",
  "bridewealth",
  "traditional_marriage",
  "church_marriage",
  "civil_marriage",
  "graduation",
  "education",
  "migration",
  "achievement",
  "memorial",
  "burial",
  "custom",
];

function AddEventModal({
  personId,
  onClose,
  onSaved,
}: {
  personId: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    type: "birth",
    customType: "",
    title: "",
    description: "",
    eventDate: "",
    eventDateApprox: "",
    location: "",
    country: "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    setError("");
    const res = await fetch("/api/life-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personId,
        ...form,
        eventDate: form.eventDate || undefined,
      }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.message || "Failed.");
      setSaving(false);

      return;
    }
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm dark:bg-black/60">
      <Card className="max-h-[90vh] w-full max-w-md overflow-y-auto shadow-lg">
        <CardHeader>
          <CardTitle className="text-primary">Add Life Event</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 px-2 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label>Event Type</Label>
            <Select
              value={form.type}
              onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EVENT_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {EVENT_ICONS[t] || "📌"}{" "}
                    {t
                      .replace(/_/g, " ")
                      .replace(/\b\w/g, (c) => c.toUpperCase())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {form.type === "custom" && (
            <div className="space-y-2">
              <Label>Custom Type Label</Label>
              <Input
                placeholder="e.g. Coronation, First Hunt"
                value={form.customType}
                onChange={(e) =>
                  setForm((f) => ({ ...f, customType: e.target.value }))
                }
              />
            </div>
          )}
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              placeholder="Brief title..."
              value={form.title}
              onChange={(e) =>
                setForm((f) => ({ ...f, title: e.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Date</Label>
            <Input
              type="date"
              value={form.eventDate}
              onChange={(e) =>
                setForm((f) => ({ ...f, eventDate: e.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Approximate Date (if exact unknown)</Label>
            <Input
              placeholder="e.g. Around 1960, Early 1970s"
              value={form.eventDateApprox}
              onChange={(e) =>
                setForm((f) => ({ ...f, eventDateApprox: e.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Location</Label>
            <Input
              placeholder="Village, city..."
              value={form.location}
              onChange={(e) =>
                setForm((f) => ({ ...f, location: e.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              placeholder="Details about this event..."
              rows={3}
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              className="flex-1"
              disabled={saving}
              type="button"
              onClick={handleSave}
            >
              {saving ? "Saving..." : "Save Event"}
            </Button>
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

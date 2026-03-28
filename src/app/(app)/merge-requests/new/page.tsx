"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { Textarea } from "@/src/components/ui/textarea";

interface Person {
  id: number;
  firstName: string;
  lastName: string;
}
interface FamilyTree {
  id: number;
  name: string;
}

function NewMergeRequestForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mergeType, setMergeType] = useState(
    searchParams.get("sourceTreeId") ? "family_trees" : "duplicate_person",
  );
  const [form, setForm] = useState({
    sourcePersonId: searchParams.get("sourcePersonId") || "",
    targetPersonId: "",
    sourceTreeId: searchParams.get("sourceTreeId") || "",
    targetTreeId: "",
    connectingPersonId: "",
    reason: "",
    evidenceNotes: "",
  });
  const [searches, setSearches] = useState({
    source: "",
    target: "",
    connecting: "",
    sourceTree: "",
    targetTree: "",
  });
  const [results, setResults] = useState<{
    source: Person[];
    target: Person[];
    connecting: Person[];
    sourceTree: FamilyTree[];
    targetTree: FamilyTree[];
  }>({
    source: [],
    target: [],
    connecting: [],
    sourceTree: [],
    targetTree: [],
  });
  const [labels, setLabels] = useState({
    source: "",
    target: "",
    connecting: "",
    sourceTree: "",
    targetTree: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const searchPersons = async (
    field: "source" | "target" | "connecting",
    q: string,
  ) => {
    if (!q) {
      setResults((r) => ({ ...r, [field]: [] }));

      return;
    }
    const res = await fetch(
      `/api/persons?search=${encodeURIComponent(q)}&limit=8`,
    );
    const data = await res.json();

    setResults((r) => ({ ...r, [field]: data.data?.persons || [] }));
  };

  const searchTrees = async (field: "sourceTree" | "targetTree", q: string) => {
    if (!q) {
      setResults((r) => ({ ...r, [field]: [] }));

      return;
    }
    const res = await fetch(`/api/trees?mine=1`);
    const data = await res.json();
    const all = data.data?.trees || [];

    setResults((r) => ({
      ...r,
      [field]: all.filter((t: FamilyTree) =>
        t.name.toLowerCase().includes(q.toLowerCase()),
      ),
    }));
  };

  useEffect(() => {
    const t = setTimeout(() => searchPersons("source", searches.source), 300);

    return () => clearTimeout(t);
  }, [searches.source]);
  useEffect(() => {
    const t = setTimeout(() => searchPersons("target", searches.target), 300);

    return () => clearTimeout(t);
  }, [searches.target]);
  useEffect(() => {
    const t = setTimeout(
      () => searchPersons("connecting", searches.connecting),
      300,
    );

    return () => clearTimeout(t);
  }, [searches.connecting]);
  useEffect(() => {
    const t = setTimeout(
      () => searchTrees("sourceTree", searches.sourceTree),
      300,
    );

    return () => clearTimeout(t);
  }, [searches.sourceTree]);
  useEffect(() => {
    const t = setTimeout(
      () => searchTrees("targetTree", searches.targetTree),
      300,
    );

    return () => clearTimeout(t);
  }, [searches.targetTree]);

  const PersonSearch = ({
    field,
    label,
    formKey,
  }: {
    field: "source" | "target" | "connecting";
    label: string;
    formKey: string;
  }) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input
        placeholder="Search by name..."
        value={labels[field as keyof typeof labels] || searches[field]}
        onChange={(e) => {
          setSearches((s) => ({ ...s, [field]: e.target.value }));
          setLabels((l) => ({ ...l, [field]: "" }));
          setForm((f) => ({ ...f, [formKey]: "" }));
        }}
      />
      {results[field].length > 0 && (
        <div className="mt-1 max-h-40 overflow-y-auto rounded-md border border-border bg-popover">
          {results[field].map((p: Person) => (
            <button
              key={p.id}
              className="w-full border-b border-border px-3 py-2 text-left text-sm last:border-0 hover:bg-accent"
              type="button"
              onClick={() => {
                setForm((f) => ({ ...f, [formKey]: String(p.id) }));
                setLabels((l) => ({
                  ...l,
                  [field]: `${p.firstName} ${p.lastName}`,
                }));
                setResults((r) => ({ ...r, [field]: [] }));
              }}
            >
              {p.firstName} {p.lastName}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const body: Record<string, unknown> = {
        type: mergeType,
        reason: form.reason,
        evidenceNotes: form.evidenceNotes,
      };

      if (mergeType === "duplicate_person") {
        if (!form.sourcePersonId || !form.targetPersonId) {
          setError("Please select both persons.");
          setLoading(false);

          return;
        }
        body.sourcePersonId = Number(form.sourcePersonId);
        body.targetPersonId = Number(form.targetPersonId);
        if (form.connectingPersonId)
          body.connectingPersonId = Number(form.connectingPersonId);
      } else {
        if (!form.sourceTreeId || !form.targetTreeId) {
          setError("Please select both trees.");
          setLoading(false);

          return;
        }
        body.sourceTreeId = Number(form.sourceTreeId);
        body.targetTreeId = Number(form.targetTreeId);
        if (form.connectingPersonId)
          body.connectingPersonId = Number(form.connectingPersonId);
      }
      const res = await fetch("/api/merge-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Failed.");

        return;
      }
      router.push("/merge-requests");
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 py-8 text-foreground">
      <div className="mx-auto max-w-xl">
        <div className="mb-8 flex items-center gap-3">
          <Button asChild size="sm" variant="ghost">
            <Link href="/merge-requests">← Back</Link>
          </Button>
          <h1 className="text-2xl font-bold text-primary">New Merge Request</h1>
        </div>

        <div className="mb-6 rounded-xl border border-primary/25 bg-primary/5 p-4 text-sm text-foreground">
          <strong className="text-primary">What is a merge request?</strong>
          <br />
          Use this when you find duplicate person profiles for the same real
          person, or when two separate family trees actually belong to the same
          extended family. An admin will review and approve the merge.
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <form className="space-y-6" onSubmit={handleSubmit}>
          <Card>
            <CardContent className="space-y-3 p-5">
              <Label>What are you merging?</Label>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  className="h-auto whitespace-normal py-3 text-sm"
                  type="button"
                  variant={
                    mergeType === "duplicate_person" ? "default" : "outline"
                  }
                  onClick={() => setMergeType("duplicate_person")}
                >
                  👤 Duplicate People
                </Button>
                <Button
                  className="h-auto whitespace-normal py-3 text-sm"
                  type="button"
                  variant={mergeType === "family_trees" ? "default" : "outline"}
                  onClick={() => setMergeType("family_trees")}
                >
                  🌳 Family Trees
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4 p-5">
              {mergeType === "duplicate_person" ? (
                <>
                  <h3 className="font-medium text-primary">
                    Select the two duplicate person profiles
                  </h3>
                  <PersonSearch
                    field="source"
                    formKey="sourcePersonId"
                    label="Original Person (to keep)"
                  />
                  <PersonSearch
                    field="target"
                    formKey="targetPersonId"
                    label="Duplicate Person (to merge into original)"
                  />
                  <PersonSearch
                    field="connecting"
                    formKey="connectingPersonId"
                    label="Connecting Ancestor (optional)"
                  />
                </>
              ) : (
                <>
                  <h3 className="font-medium text-primary">
                    Select the two family trees
                  </h3>
                  <div className="space-y-2">
                    <Label>Source Tree (to merge from)</Label>
                    <Input
                      placeholder="Search your trees..."
                      value={searches.sourceTree}
                      onChange={(e) =>
                        setSearches((s) => ({
                          ...s,
                          sourceTree: e.target.value,
                        }))
                      }
                    />
                    {results.sourceTree.length > 0 && (
                      <div className="mt-1 rounded-md border border-border bg-popover">
                        {results.sourceTree.map((t: FamilyTree) => (
                          <button
                            key={t.id}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-accent"
                            type="button"
                            onClick={() => {
                              setForm((f) => ({
                                ...f,
                                sourceTreeId: String(t.id),
                              }));
                              setSearches((s) => ({
                                ...s,
                                sourceTree: t.name,
                              }));
                              setResults((r) => ({ ...r, sourceTree: [] }));
                            }}
                          >
                            {t.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Target Tree (to merge into)</Label>
                    <Input
                      placeholder="Search your trees..."
                      value={searches.targetTree}
                      onChange={(e) =>
                        setSearches((s) => ({
                          ...s,
                          targetTree: e.target.value,
                        }))
                      }
                    />
                    {results.targetTree.length > 0 && (
                      <div className="mt-1 rounded-md border border-border bg-popover">
                        {results.targetTree.map((t: FamilyTree) => (
                          <button
                            key={t.id}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-accent"
                            type="button"
                            onClick={() => {
                              setForm((f) => ({
                                ...f,
                                targetTreeId: String(t.id),
                              }));
                              setSearches((s) => ({
                                ...s,
                                targetTree: t.name,
                              }));
                              setResults((r) => ({ ...r, targetTree: [] }));
                            }}
                          >
                            {t.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <PersonSearch
                    field="connecting"
                    formKey="connectingPersonId"
                    label="Connecting Person (shared ancestor / relative)"
                  />
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base text-primary">
                Justification
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Reason *</Label>
                <Textarea
                  required
                  placeholder="Why should these be merged?"
                  rows={2}
                  value={form.reason}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, reason: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Evidence & Notes</Label>
                <Textarea
                  placeholder="Supporting evidence, shared birth dates, common relatives, documents..."
                  rows={3}
                  value={form.evidenceNotes}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, evidenceNotes: e.target.value }))
                  }
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-4">
            <Button
              className="flex-1"
              disabled={loading}
              size="lg"
              type="submit"
            >
              {loading ? "Submitting..." : "Submit Merge Request"}
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link href="/merge-requests">Cancel</Link>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function NewMergeRequestPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
          Loading...
        </div>
      }
    >
      <NewMergeRequestForm />
    </Suspense>
  );
}

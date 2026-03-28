"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";

import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";

const FamilyTreeViewer = dynamic(() => import("@/src/components/tree/FamilyTreeViewer"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-muted-foreground">Loading tree...</div>
  ),
});

interface FamilyTree {
  id: number;
  name: string;
  description?: string;
  visibility: string;
  ownerUserId: number;
  rootPersonId?: number;
}
interface Person {
  id: number;
  firstName: string;
  lastName: string;
  nickname?: string;
  gender: string;
  birthDate?: string;
  deathDate?: string;
  aliveStatus: string;
  photoUrl?: string;
}
interface Relationship {
  id: number;
  personAId: number;
  personBId: number;
  type: string;
  status: string;
  startDate?: string;
  ceremonyType?: string;
  unionOrder?: number;
}

function avatarClass(gender: string) {
  if (gender === "male") return "bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300";
  if (gender === "female") return "bg-pink-100 text-pink-800 dark:bg-pink-950/50 dark:text-pink-300";
  return "bg-muted text-muted-foreground";
}

export default function TreeViewPage() {
  const { id } = useParams<{ id: string }>();
  const [tree, setTree] = useState<FamilyTree | null>(null);
  const [persons, setPersons] = useState<Person[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddMember, setShowAddMember] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const fetchTree = useCallback(async () => {
    const res = await fetch(`/api/trees/${id}`);
    const data = await res.json();
    if (res.ok) {
      setTree(data.data.tree);
      setPersons(data.data.persons || []);
      setRelationships(data.data.relationships || []);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchTree();
  }, [fetchTree]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">Loading...</div>
    );
  }
  if (!tree) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-destructive">Tree not found.</div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <div className="flex items-center justify-between border-b border-border bg-card px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/trees">← Trees</Link>
          </Button>
          <div>
            <h1 className="text-lg font-bold text-primary">{tree.name}</h1>
            {tree.description && <p className="text-xs text-muted-foreground">{tree.description}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-xs ${
              tree.visibility === "public"
                ? "border border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {tree.visibility}
          </span>
          <Button size="sm" onClick={() => setShowAddMember(true)}>
            + Add Person
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? "Hide" : "People"} ({persons.length})
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1" style={{ height: "calc(100vh - 120px)" }}>
          {persons.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
              <p className="mb-4 text-5xl">🌳</p>
              <p className="mb-2 text-lg">No people in this tree yet</p>
              <Button variant="link" className="text-primary" onClick={() => setShowAddMember(true)}>
                Add the first person →
              </Button>
            </div>
          ) : (
            <FamilyTreeViewer persons={persons} relationships={relationships} rootPersonId={tree.rootPersonId} />
          )}
        </div>

        {sidebarOpen && (
          <div className="w-64 overflow-y-auto border-l border-border bg-card p-4">
            <h3 className="mb-3 font-semibold text-primary">People in Tree</h3>
            <div className="space-y-2">
              {persons.map((p) => (
                <Link
                  key={p.id}
                  href={`/persons/${p.id}`}
                  className="flex items-center gap-2 rounded-lg p-2 transition-colors hover:bg-accent"
                >
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${avatarClass(p.gender)}`}
                  >
                    {p.firstName[0]}
                    {p.lastName[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium leading-tight text-foreground">
                      {p.firstName} {p.lastName}
                    </p>
                    {p.aliveStatus === "deceased" && <p className="text-xs text-muted-foreground">†</p>}
                  </div>
                </Link>
              ))}
            </div>
            <div className="mt-4 border-t border-border pt-4">
              <Button variant="link" className="h-auto w-full p-0 text-primary" asChild>
                <Link href={`/merge-requests/new?sourceTreeId=${id}`}>Request Tree Merge →</Link>
              </Button>
            </div>
          </div>
        )}
      </div>

      {showAddMember && (
        <AddMemberModal
          treeId={Number(id)}
          existingPersonIds={persons.map((p) => p.id)}
          onClose={() => setShowAddMember(false)}
          onSaved={() => {
            setShowAddMember(false);
            fetchTree();
          }}
        />
      )}
    </div>
  );
}

function AddMemberModal({
  treeId,
  existingPersonIds,
  onClose,
  onSaved,
}: {
  treeId: number;
  existingPersonIds: number[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Person[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!search) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      const r = await fetch(`/api/persons?search=${encodeURIComponent(search)}&limit=10`);
      const d = await r.json();
      setResults((d.data?.persons || []).filter((p: Person) => !existingPersonIds.includes(p.id)));
    }, 300);
    return () => clearTimeout(t);
  }, [search, existingPersonIds]);

  const addToTree = async (personId: number) => {
    setSaving(true);
    setError("");
    const res = await fetch(`/api/trees/${treeId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personId }),
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
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle className="text-primary">Add Person to Tree</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 px-2 py-2 text-sm text-destructive">{error}</div>
          )}

          <div className="space-y-2">
            <Label>Search existing people</Label>
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Type a name..." />
            {results.length > 0 && (
              <div className="mt-1 max-h-48 overflow-y-auto rounded-md border border-border bg-popover">
                {results.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => addToTree(p.id)}
                    disabled={saving}
                    className="flex w-full items-center justify-between border-b border-border px-3 py-2.5 text-left text-sm last:border-0 hover:bg-accent"
                  >
                    <span>
                      {p.firstName} {p.lastName}
                    </span>
                    <span className="text-xs text-primary">Add →</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-border pt-4">
            <p className="mb-2 text-sm text-muted-foreground">Or create a new person:</p>
            <Button variant="secondary" className="w-full" asChild>
              <Link href={`/persons/new?treeId=${treeId}`} onClick={onClose}>
                Create New Person →
              </Link>
            </Button>
          </div>

          <Button variant="outline" className="w-full" onClick={onClose}>
            Close
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

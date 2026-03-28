"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";

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

const FamilyTreeViewer = dynamic(
  () => import("@/src/components/tree/FamilyTreeViewer"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        Loading tree...
      </div>
    ),
  },
);

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

// Minimal person form fields used in quick-create flows
interface QuickPersonForm {
  firstName: string;
  lastName: string;
  gender: string;
  aliveStatus: string;
}

const GENDER_OPTIONS = ["male", "female", "other", "unknown"];
const ALIVE_OPTIONS = ["alive", "deceased", "unknown"];

const REL_LABELS: Record<string, string> = {
  parent_child: "Parent → Child",
  spouse: "Spouse (Marriage)",
  partner: "Partner (Traditional Union)",
  sibling: "Sibling",
  half_sibling: "Half-Sibling",
  step_parent: "Step-Parent",
  adopted: "Adopted",
  guardian: "Guardian",
  co_wife: "Co-Wife",
  levirate: "Levirate Union",
};

function avatarClass(gender: string) {
  if (gender === "male")
    return "bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300";
  if (gender === "female")
    return "bg-pink-100 text-pink-800 dark:bg-pink-950/50 dark:text-pink-300";

  return "bg-muted text-muted-foreground";
}

// ─── Helper: create person + add to tree ──────────────────────────────────────

async function createPersonAndAddToTree(
  form: QuickPersonForm,
  treeId: number,
): Promise<{ ok: boolean; person?: Person; message?: string }> {
  const pRes = await fetch("/api/persons", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(form),
  });
  const pData = await pRes.json();

  if (!pRes.ok)
    return { ok: false, message: pData.message || "Failed to create person." };

  const person: Person = pData.data.person;

  const mRes = await fetch(`/api/trees/${treeId}/members`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ personId: person.id }),
  });

  if (!mRes.ok)
    return { ok: false, message: "Created person but could not add to tree." };

  return { ok: true, person };
}

async function createRelationship(
  personAId: number,
  personBId: number,
  type: string,
  extra?: { startDate?: string; ceremonyType?: string; unionOrder?: number },
) {
  const res = await fetch("/api/relationships", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ personAId, personBId, type, ...extra }),
  });

  return res.ok;
}

// ─── Small reusable QuickPersonFields component ───────────────────────────────

function QuickPersonFields({
  form,
  onChange,
}: {
  form: QuickPersonForm;
  onChange: (k: keyof QuickPersonForm, v: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-1">
        <Label className="text-xs">First Name *</Label>
        <Input
          required
          className="h-8 text-sm"
          placeholder="First name"
          value={form.firstName}
          onChange={(e) => onChange("firstName", e.target.value)}
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Last Name *</Label>
        <Input
          required
          className="h-8 text-sm"
          placeholder="Last name"
          value={form.lastName}
          onChange={(e) => onChange("lastName", e.target.value)}
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Gender</Label>
        <Select
          value={form.gender}
          onValueChange={(v) => onChange("gender", v)}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {GENDER_OPTIONS.map((g) => (
              <SelectItem key={g} className="text-sm" value={g}>
                {g.charAt(0).toUpperCase() + g.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Status</Label>
        <Select
          value={form.aliveStatus}
          onValueChange={(v) => onChange("aliveStatus", v)}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ALIVE_OPTIONS.map((s) => (
              <SelectItem key={s} className="text-sm" value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

const EMPTY_QUICK_FORM: QuickPersonForm = {
  firstName: "",
  lastName: "",
  gender: "unknown",
  aliveStatus: "alive",
};

// ─── Guided Start Wizard ───────────────────────────────────────────────────────

type WizardStep = "anchor" | "spouse" | "child" | "parent" | "done";

function StartWizard({
  treeId,
  onDone,
}: {
  treeId: number;
  onDone: () => void;
}) {
  const [step, setStep] = useState<WizardStep>("anchor");
  const [rootPerson, setRootPerson] = useState<Person | null>(null);
  const [form, setForm] = useState<QuickPersonForm>(EMPTY_QUICK_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [skip, setSkip] = useState(false);

  const setField = (k: keyof QuickPersonForm, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleAnchor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName || !form.lastName) return;
    setSaving(true);
    setError("");
    const result = await createPersonAndAddToTree(form, treeId);

    if (!result.ok || !result.person) {
      setError(result.message || "Failed.");
      setSaving(false);

      return;
    }
    setRootPerson(result.person);
    setForm(EMPTY_QUICK_FORM);
    setStep("spouse");
    setSaving(false);
  };

  const handleSpouse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rootPerson) return;
    if (skip) {
      setSkip(false);
      setStep("child");

      return;
    }
    if (!form.firstName || !form.lastName) return;
    setSaving(true);
    setError("");
    const result = await createPersonAndAddToTree(form, treeId);

    if (!result.ok || !result.person) {
      setError(result.message || "Failed.");
      setSaving(false);

      return;
    }
    await createRelationship(rootPerson.id, result.person.id, "spouse");
    setForm(EMPTY_QUICK_FORM);
    setStep("child");
    setSaving(false);
  };

  const handleChild = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rootPerson) return;
    if (skip) {
      setSkip(false);
      setStep("parent");

      return;
    }
    if (!form.firstName || !form.lastName) return;
    setSaving(true);
    setError("");
    const result = await createPersonAndAddToTree(form, treeId);

    if (!result.ok || !result.person) {
      setError(result.message || "Failed.");
      setSaving(false);

      return;
    }
    await createRelationship(rootPerson.id, result.person.id, "parent_child");
    setForm(EMPTY_QUICK_FORM);
    setStep("parent");
    setSaving(false);
  };

  const handleParent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rootPerson) return;
    if (skip) {
      setSkip(false);
      onDone();

      return;
    }
    if (!form.firstName || !form.lastName) return;
    setSaving(true);
    setError("");
    const result = await createPersonAndAddToTree(form, treeId);

    if (!result.ok || !result.person) {
      setError(result.message || "Failed.");
      setSaving(false);

      return;
    }
    // parent is personA, root is personB
    await createRelationship(result.person.id, rootPerson.id, "parent_child");
    onDone();
  };

  const stepMeta: Record<
    WizardStep,
    {
      title: string;
      subtitle: string;
      num: number;
      total: number;
      onSubmit: (e: React.FormEvent) => void;
    }
  > = {
    anchor: {
      title: "Start with yourself or the family anchor",
      subtitle: "This will be the central person in your tree.",
      num: 1,
      total: 4,
      onSubmit: handleAnchor,
    },
    spouse: {
      title: "Add a spouse or partner",
      subtitle: `Adding a spouse for ${rootPerson?.firstName || "the anchor"}.`,
      num: 2,
      total: 4,
      onSubmit: handleSpouse,
    },
    child: {
      title: "Add a child",
      subtitle: `Adding a child of ${rootPerson?.firstName || "the anchor"}.`,
      num: 3,
      total: 4,
      onSubmit: handleChild,
    },
    parent: {
      title: "Add a parent",
      subtitle: `Adding a parent of ${rootPerson?.firstName || "the anchor"}.`,
      num: 4,
      total: 4,
      onSubmit: handleParent,
    },
    done: { title: "", subtitle: "", num: 4, total: 4, onSubmit: () => {} },
  };

  const meta = stepMeta[step];

  if (step === "done") return null;

  return (
    <div className="flex h-full flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="mb-4 text-center">
          <p className="mb-4 text-5xl">🌳</p>
          <h2 className="text-xl font-bold text-primary">
            Build Your Family Tree
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Step {meta.num} of {meta.total}
          </p>
        </div>

        {/* Progress dots */}
        <div className="mb-6 flex justify-center gap-2">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className={`h-2 w-8 rounded-full transition-all ${n <= meta.num ? "bg-primary" : "bg-muted"}`}
            />
          ))}
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-primary">
              {meta.title}
            </CardTitle>
            {meta.subtitle && (
              <p className="text-xs text-muted-foreground">{meta.subtitle}</p>
            )}
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-3 rounded-md border border-destructive/50 bg-destructive/10 px-2 py-2 text-xs text-destructive">
                {error}
              </div>
            )}
            <form className="space-y-4" onSubmit={meta.onSubmit}>
              <QuickPersonFields form={form} onChange={setField} />
              <div className="flex gap-2 pt-1">
                <Button
                  className="flex-1"
                  disabled={saving}
                  size="sm"
                  type="submit"
                >
                  {saving
                    ? "Saving..."
                    : step === "anchor"
                      ? "Add Anchor Person"
                      : "Add & Continue"}
                </Button>
                {step !== "anchor" && (
                  <Button
                    size="sm"
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setSkip(true);
                      meta.onSubmit({
                        preventDefault: () => {},
                      } as React.FormEvent);
                    }}
                  >
                    Skip
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          You can add more people and relationships at any time.
        </p>
      </div>
    </div>
  );
}

// ─── Add Member Modal (with inline quick-create) ───────────────────────────────

function AddMemberModal({
  treeId,
  existingPersonIds,
  onClose,
  onSaved,
  prefillRelativeOf,
}: {
  treeId: number;
  existingPersonIds: number[];
  onClose: () => void;
  onSaved: () => void;
  prefillRelativeOf?: {
    person: Person;
    relType: string;
    asPersonA: boolean;
  } | null;
}) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Person[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [quickForm, setQuickForm] = useState<QuickPersonForm>({
    ...EMPTY_QUICK_FORM,
  });

  const setField = (k: keyof QuickPersonForm, v: string) =>
    setQuickForm((f) => ({ ...f, [k]: v }));

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
          (p: Person) => !existingPersonIds.includes(p.id),
        ),
      );
    }, 300);

    return () => clearTimeout(t);
  }, [search, existingPersonIds]);

  const addExistingToTree = async (personId: number) => {
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
    if (prefillRelativeOf) {
      const { person: anchor, relType, asPersonA } = prefillRelativeOf;
      const personAId = asPersonA ? anchor.id : personId;
      const personBId = asPersonA ? personId : anchor.id;

      await createRelationship(personAId, personBId, relType);
    }
    onSaved();
  };

  const handleQuickCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickForm.firstName || !quickForm.lastName) return;
    setSaving(true);
    setError("");
    const result = await createPersonAndAddToTree(quickForm, treeId);

    if (!result.ok || !result.person) {
      setError(result.message || "Failed.");
      setSaving(false);

      return;
    }
    if (prefillRelativeOf) {
      const { person: anchor, relType, asPersonA } = prefillRelativeOf;
      const personAId = asPersonA ? anchor.id : result.person.id;
      const personBId = asPersonA ? result.person.id : anchor.id;

      await createRelationship(personAId, personBId, relType);
    }
    onSaved();
  };

  const title = prefillRelativeOf
    ? `Add ${REL_LABELS[prefillRelativeOf.relType] || "Relative"} for ${prefillRelativeOf.person.firstName}`
    : "Add Person to Tree";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm dark:bg-black/60">
      <Card className="max-h-[90vh] w-full max-w-md overflow-y-auto shadow-lg">
        <CardHeader>
          <CardTitle className="text-primary">{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 px-2 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          {!showCreate ? (
            <>
              <div className="space-y-2">
                <Label>Search existing people</Label>
                <Input
                  placeholder="Type a name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {results.length > 0 && (
                  <div className="mt-1 max-h-40 overflow-y-auto rounded-md border border-border bg-popover">
                    {results.map((p) => (
                      <button
                        key={p.id}
                        className="flex w-full items-center justify-between border-b border-border px-3 py-2.5 text-left text-sm last:border-0 hover:bg-accent"
                        disabled={saving}
                        type="button"
                        onClick={() => addExistingToTree(p.id)}
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
                <p className="mb-3 text-sm text-muted-foreground">
                  Or create a new person:
                </p>
                <Button
                  className="w-full"
                  variant="secondary"
                  onClick={() => setShowCreate(true)}
                >
                  + Create New Person
                </Button>
              </div>
            </>
          ) : (
            <form className="space-y-4" onSubmit={handleQuickCreate}>
              <QuickPersonFields form={quickForm} onChange={setField} />
              <p className="text-xs text-muted-foreground">
                For more details (biography, clan, photo) you can edit the
                person&apos;s profile after adding.
              </p>
              <div className="flex gap-2 pt-1">
                <Button
                  className="flex-1"
                  disabled={saving}
                  size="sm"
                  type="submit"
                >
                  {saving ? "Saving..." : "Create & Add to Tree"}
                </Button>
                <Button
                  size="sm"
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreate(false)}
                >
                  Back to Search
                </Button>
              </div>
            </form>
          )}

          <Button
            className="w-full text-muted-foreground"
            variant="ghost"
            onClick={onClose}
          >
            Close
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Invite Family Member Modal ───────────────────────────────────────────────

function InviteModal({
  treeId,
  persons,
  onClose,
}: {
  treeId: number;
  persons: Person[];
  onClose: () => void;
}) {
  const [email, setEmail] = useState("");
  const [personId, setPersonId] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Email is required.");

      return;
    }
    setSaving(true);
    setError("");
    setSuccess("");

    const res = await fetch("/api/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        treeId,
        personId: personId ? Number(personId) : undefined,
        message: message.trim() || undefined,
      }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.message || "Failed to send invite.");
      setSaving(false);

      return;
    }
    setSuccess(`Invite sent to ${email}!`);
    setEmail("");
    setPersonId("");
    setMessage("");
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm dark:bg-black/60">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle className="text-primary">Invite a Family Member</CardTitle>
          <p className="text-sm text-muted-foreground">
            They&apos;ll get an email with a link to join this tree and fill in
            their own details.
          </p>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-3 rounded-md border border-destructive/50 bg-destructive/10 px-2 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-2 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
              {success}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSend}>
            <div className="space-y-1">
              <Label>Email address *</Label>
              <Input
                required
                placeholder="family.member@example.com"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label>
                Link to person in tree{" "}
                <span className="text-xs text-muted-foreground">
                  (optional)
                </span>
              </Label>
              <Select
                value={personId || "__none__"}
                onValueChange={(v) => setPersonId(v === "__none__" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="— Select person —" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">
                    — Not linked to a specific person —
                  </SelectItem>
                  {persons.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.firstName} {p.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                If selected, their account will be automatically linked to that
                person when they accept.
              </p>
            </div>

            <div className="space-y-1">
              <Label>
                Personal message{" "}
                <span className="text-xs text-muted-foreground">
                  (optional)
                </span>
              </Label>
              <Input
                placeholder="e.g. Hi Aunty, come add your memories!"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>

            <div className="flex gap-2 pt-1">
              <Button className="flex-1" disabled={saving} type="submit">
                {saving ? "Sending..." : "Send Invite"}
              </Button>
              <Button type="button" variant="outline" onClick={onClose}>
                Close
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Add Relative Modal (from canvas node) ────────────────────────────────────

type RelativeRole = "parent" | "child" | "spouse";

function AddRelativeModal({
  treeId,
  anchor,
  role,
  existingPersonIds,
  onClose,
  onSaved,
}: {
  treeId: number;
  anchor: Person;
  role: RelativeRole;
  existingPersonIds: number[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const relType = role === "spouse" ? "spouse" : "parent_child";
  const asPersonA = role === "parent" || role === "spouse";

  return (
    <AddMemberModal
      existingPersonIds={existingPersonIds}
      prefillRelativeOf={{ person: anchor, relType, asPersonA }}
      treeId={treeId}
      onClose={onClose}
      onSaved={onSaved}
    />
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function TreeViewPage() {
  const { id } = useParams<{ id: string }>();
  const [tree, setTree] = useState<FamilyTree | null>(null);
  const [persons, setPersons] = useState<Person[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddMember, setShowAddMember] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [addRelative, setAddRelative] = useState<{
    person: Person;
    role: RelativeRole;
  } | null>(null);

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
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        Loading...
      </div>
    );
  }
  if (!tree) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-destructive">
        Tree not found.
      </div>
    );
  }

  const existingPersonIds = persons.map((p) => p.id);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <div className="flex items-center justify-between border-b border-border bg-card px-4 py-3">
        <div className="flex items-center gap-3">
          <Button asChild size="sm" variant="ghost">
            <Link href="/trees">← Trees</Link>
          </Button>
          <div>
            <h1 className="text-lg font-bold text-primary">{tree.name}</h1>
            {tree.description && (
              <p className="text-xs text-muted-foreground">
                {tree.description}
              </p>
            )}
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
          <Button
            className="border-primary/40 text-primary"
            size="sm"
            variant="outline"
            onClick={() => setShowInvite(true)}
          >
            Invite Family
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? "Hide" : "People"} ({persons.length})
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1" style={{ height: "calc(100vh - 120px)" }}>
          {persons.length === 0 ? (
            <StartWizard
              treeId={Number(id)}
              onDone={() => {
                fetchTree();
              }}
            />
          ) : (
            <div className="relative h-full">
              <FamilyTreeViewer
                persons={persons}
                relationships={relationships}
                rootPersonId={tree.rootPersonId}
                onAddRelative={(person, role) =>
                  setAddRelative({ person, role })
                }
              />
            </div>
          )}
        </div>

        {sidebarOpen && (
          <div className="w-64 overflow-y-auto border-l border-border bg-card p-4">
            <h3 className="mb-3 font-semibold text-primary">People in Tree</h3>
            <div className="space-y-2">
              {persons.map((p) => (
                <div
                  key={p.id}
                  className="group flex items-center gap-2 rounded-lg p-2 transition-colors hover:bg-accent"
                >
                  <Link
                    className="flex min-w-0 flex-1 items-center gap-2"
                    href={`/persons/${p.id}`}
                  >
                    <div
                      className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${avatarClass(p.gender)}`}
                    >
                      {p.firstName[0]}
                      {p.lastName[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium leading-tight text-foreground">
                        {p.firstName} {p.lastName}
                      </p>
                      {p.aliveStatus === "deceased" && (
                        <p className="text-xs text-muted-foreground">†</p>
                      )}
                    </div>
                  </Link>
                  <div className="hidden shrink-0 flex-col gap-1 group-hover:flex">
                    <button
                      className="rounded px-1.5 py-0.5 text-xs text-primary hover:bg-primary/10"
                      title="Add child"
                      onClick={() =>
                        setAddRelative({ person: p, role: "child" })
                      }
                    >
                      +Child
                    </button>
                    <button
                      className="rounded px-1.5 py-0.5 text-xs text-primary hover:bg-primary/10"
                      title="Add spouse"
                      onClick={() =>
                        setAddRelative({ person: p, role: "spouse" })
                      }
                    >
                      +Spouse
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 border-t border-border pt-4">
              <Button
                asChild
                className="h-auto w-full p-0 text-primary"
                variant="link"
              >
                <Link href={`/merge-requests/new?sourceTreeId=${id}`}>
                  Request Tree Merge →
                </Link>
              </Button>
            </div>
          </div>
        )}
      </div>

      {showAddMember && (
        <AddMemberModal
          existingPersonIds={existingPersonIds}
          treeId={Number(id)}
          onClose={() => setShowAddMember(false)}
          onSaved={() => {
            setShowAddMember(false);
            fetchTree();
          }}
        />
      )}

      {addRelative && (
        <AddRelativeModal
          anchor={addRelative.person}
          existingPersonIds={existingPersonIds}
          role={addRelative.role}
          treeId={Number(id)}
          onClose={() => setAddRelative(null)}
          onSaved={() => {
            setAddRelative(null);
            fetchTree();
          }}
        />
      )}

      {showInvite && (
        <InviteModal
          persons={persons}
          treeId={Number(id)}
          onClose={() => setShowInvite(false)}
        />
      )}
    </div>
  );
}

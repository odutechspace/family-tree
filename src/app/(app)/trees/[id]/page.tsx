"use client";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { Pencil } from "lucide-react";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/src/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import {
  formatPersonDisplayName,
  getPersonInitials,
} from "@/src/lib/personDisplayName";
import { apiGetData } from "@/src/lib/api-fetch";
import { NotFoundView } from "@/src/components/NotFoundView";
import { queryKeys } from "@/src/lib/query-keys";

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
/** Matches GET /api/persons `data[]` (and tree member payloads). */
interface Person {
  id: number;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  maidenName?: string | null;
  nickname?: string | null;
  gender: string;
  birthDate?: string | null;
  birthPlace?: string | null;
  aliveStatus: string;
  deathDate?: string | null;
  deathPlace?: string | null;
  photoUrl?: string | null;
  biography?: string | null;
  oralHistory?: string | null;
  clanId?: number | null;
  tribeEthnicity?: string | null;
  totem?: string | null;
  originVillage?: string | null;
  originCountry?: string | null;
  personCode?: string | null;
  phoneHash?: string | null;
  linkedUserId?: number | null;
  createdByUserId?: number;
  isVerified?: boolean;
  isPrivate?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/** GET /api/persons?search=… — envelope: `data` is the person array. */
interface PersonsApiListResponse {
  success: boolean;
  message?: string;
  data?: Person[];
  total?: number;
  page?: number;
  limit?: number;
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
  const res = await fetch(`/api/trees/${treeId}/members`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ person: form }),
  });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    return {
      ok: false,
      message:
        (data as { message?: string }).message ||
        "Could not create person and add to tree.",
    };
  }

  const person = (data as { data?: { person?: Person } }).data?.person;
  if (!person) {
    return { ok: false, message: "Person was created but response was incomplete." };
  }

  return { ok: true, person };
}

async function createRelationship(
  personAId: number,
  personBId: number,
  type: string,
  extra?: { startDate?: string; ceremonyType?: string; unionOrder?: number },
): Promise<{ ok: boolean; message?: string }> {
  const res = await fetch("/api/relationships", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ personAId, personBId, type, ...extra }),
  });
  const payload = (await res.json().catch(() => ({}))) as { message?: string };

  if (!res.ok) {
    return {
      ok: false,
      message: payload.message || "Could not create relationship.",
    };
  }

  return { ok: true };
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
            <SelectValue placeholder="Gender" />
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
            <SelectValue placeholder="Status" />
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
      subtitle: `Adding a spouse for ${rootPerson ? formatPersonDisplayName(rootPerson) : "the anchor"}.`,
      num: 2,
      total: 4,
      onSubmit: handleSpouse,
    },
    child: {
      title: "Add a child",
      subtitle: `Adding a child of ${rootPerson ? formatPersonDisplayName(rootPerson) : "the anchor"}.`,
      num: 3,
      total: 4,
      onSubmit: handleChild,
    },
    parent: {
      title: "Add a parent",
      subtitle: `Adding a parent of ${rootPerson ? formatPersonDisplayName(rootPerson) : "the anchor"}.`,
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
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [quickForm, setQuickForm] = useState<QuickPersonForm>({
    ...EMPTY_QUICK_FORM,
  });
  const [codeSearch, setCodeSearch] = useState("");
  const [codeResult, setCodeResult] = useState<Person | null>(null);
  const [codeError, setCodeError] = useState("");

  const setField = (k: keyof QuickPersonForm, v: string) =>
    setQuickForm((f) => ({ ...f, [k]: v }));

  /** When adding a relative, people already in the tree are valid (relationship only). Otherwise hide members. */
  const anchorPersonId = prefillRelativeOf?.person.id;

  const filterSearchRows = (rows: Person[]) => {
    // Always exclude only the anchor person (when adding a relative).
    // In add-to-tree mode anchorPersonId is undefined so nothing extra is excluded;
    // existing members are shown with an "In tree" badge in the result list.
    return rows.filter((p) => p.id !== anchorPersonId);
  };

  const lookupByCode = async () => {
    const code = codeSearch.trim().toUpperCase();

    if (!code) return;
    setCodeError("");
    setCodeResult(null);
    const r = await fetch(`/api/persons?code=${encodeURIComponent(code)}`);
    const d = (await r.json()) as PersonsApiListResponse;

    if (!r.ok) {
      setCodeError(d.message || "No person found with that code.");

      return;
    }

    if (!Array.isArray(d.data)) {
      setCodeError(d.message || "Unexpected response from code lookup.");

      return;
    }

    const found = d.data[0];

    if (!found) {
      setCodeError("No person found with that code.");

      return;
    }
    if (anchorPersonId !== undefined) {
      if (found.id === anchorPersonId) {
        setCodeError("Pick someone other than the person you're linking from.");

        return;
      }
    } else if (existingPersonIds.includes(found.id)) {
      setCodeError("This person is already in the tree.");

      return;
    }
    setCodeResult(found);
  };

  useEffect(() => {
    if (!search.trim()) {
      setResults([]);
      setSearchLoading(false);
      setSearchError("");
      setSearchOpen(false);

      return;
    }
    setSearchLoading(true);
    setSearchError("");
    setSearchOpen(true);
    const t = setTimeout(async () => {
      try {
        const r = await fetch(
          `/api/persons?search=${encodeURIComponent(search.trim())}&limit=10`,
        );
        const d = (await r.json()) as PersonsApiListResponse;

        if (!r.ok) {
          setSearchError(d.message || "Search failed.");
          setResults([]);
        } else if (!Array.isArray(d.data)) {
          setSearchError(d.message || "Search returned an unexpected format.");
          setResults([]);
        } else {
          setResults(filterSearchRows(d.data));
        }
      } catch {
        setSearchError("Search failed.");
        setResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => clearTimeout(t);
  }, [search, existingPersonIds, anchorPersonId]);

  const addExistingToTree = async (personId: number) => {
    setSaving(true);
    setError("");
    const alreadyInTree = existingPersonIds.includes(personId);

    if (!alreadyInTree) {
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
    }

    if (prefillRelativeOf) {
      const { person: anchor, relType, asPersonA } = prefillRelativeOf;
      const personAId = asPersonA ? anchor.id : personId;
      const personBId = asPersonA ? personId : anchor.id;

      const rel = await createRelationship(personAId, personBId, relType);

      if (!rel.ok) {
        setError(rel.message || "Could not create relationship.");
        setSaving(false);

        return;
      }
    }

    setSearchOpen(false);
    setSaving(false);
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
    ? `Add ${REL_LABELS[prefillRelativeOf.relType] || "Relative"} for ${formatPersonDisplayName(prefillRelativeOf.person)}`
    : "Add Person to Tree";

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-h-[90vh] max-w-md gap-0 overflow-y-auto p-0 sm:max-w-md">
        <DialogHeader className="space-y-0 p-6 pb-0 text-left">
          <DialogTitle className="text-xl text-primary">{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 px-6 pb-6 pt-2">
          {error && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 px-2 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          {!showCreate ? (
            <>
              <Popover modal open={searchOpen} onOpenChange={setSearchOpen}>
                <div className="space-y-2">
                  <Label htmlFor="add-member-search">
                    Search existing people
                  </Label>
                  <PopoverAnchor asChild>
                    <Input
                      autoComplete="off"
                      id="add-member-search"
                      placeholder="Type a name..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      onFocus={() => {
                        if (search.trim()) setSearchOpen(true);
                      }}
                    />
                  </PopoverAnchor>
                </div>
                <PopoverContent
                  align="start"
                  className="w-[min(100vw-2rem,var(--radix-popover-trigger-width))] p-0"
                  onOpenAutoFocus={(e) => e.preventDefault()}
                >
                  <div className="max-h-48 overflow-y-auto py-1">
                    {searchLoading && (
                      <p className="px-3 py-2 text-sm text-muted-foreground">
                        Searching…
                      </p>
                    )}
                    {!searchLoading && searchError && (
                      <p className="px-3 py-2 text-sm text-destructive">
                        {searchError}
                      </p>
                    )}
                    {!searchLoading &&
                      !searchError &&
                      search.trim() &&
                      results.length === 0 && (
                        <p className="px-3 py-2 text-sm text-muted-foreground">
                          No matches
                        </p>
                      )}
                    {!searchLoading &&
                      results.map((p) => {
                        const alreadyMember =
                          anchorPersonId === undefined &&
                          existingPersonIds.includes(p.id);

                        return (
                          <Button
                            key={p.id}
                            className="h-auto w-full flex-col items-stretch gap-0.5 rounded-none px-3 py-2.5 text-left text-sm font-normal"
                            disabled={saving || alreadyMember}
                            type="button"
                            variant="ghost"
                            onClick={() =>
                              alreadyMember ? undefined : addExistingToTree(p.id)
                            }
                          >
                            <span className="flex w-full items-center justify-between gap-2">
                              <span
                                className="min-w-0 truncate text-left"
                                title={formatPersonDisplayName(p)}
                              >
                                {formatPersonDisplayName(p)}
                              </span>
                              {alreadyMember ? (
                                <span className="shrink-0 rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
                                  In tree
                                </span>
                              ) : (
                                <span className="shrink-0 text-xs text-primary">
                                  Add →
                                </span>
                              )}
                            </span>
                            {p.personCode ? (
                              <span className="w-full truncate text-left font-mono text-[10px] text-muted-foreground">
                                {p.personCode}
                              </span>
                            ) : null}
                          </Button>
                        );
                      })}
                  </div>
                </PopoverContent>
              </Popover>

              <div className="space-y-2 border-t border-border pt-4">
                <Label>
                  Add by person code{" "}
                  <span className="text-xs text-muted-foreground font-normal">
                    (e.g. UKOO-7K3M2)
                  </span>
                </Label>
                <div className="flex gap-2">
                  <Input
                    className="font-mono text-sm"
                    placeholder="UKOO-XXXXX"
                    value={codeSearch}
                    onChange={(e) => {
                      setCodeSearch(e.target.value.toUpperCase());
                      setCodeResult(null);
                      setCodeError("");
                    }}
                    onKeyDown={(e) => e.key === "Enter" && lookupByCode()}
                  />
                  <Button
                    size="sm"
                    type="button"
                    variant="secondary"
                    onClick={lookupByCode}
                  >
                    Find
                  </Button>
                </div>
                {codeError && (
                  <p className="text-xs text-destructive">{codeError}</p>
                )}
                {codeResult && (
                  <div className="flex items-center justify-between rounded-md border border-primary/30 bg-primary/5 px-3 py-2">
                    <div>
                      <p
                        className="text-sm font-medium"
                        title={formatPersonDisplayName(codeResult)}
                      >
                        {formatPersonDisplayName(codeResult)}
                      </p>
                      {codeResult.personCode ? (
                        <p className="font-mono text-xs text-muted-foreground">
                          {codeResult.personCode}
                        </p>
                      ) : null}
                    </div>
                    <Button
                      disabled={saving}
                      size="sm"
                      type="button"
                      onClick={() => addExistingToTree(codeResult!.id)}
                    >
                      Add →
                    </Button>
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
        </div>
      </DialogContent>
    </Dialog>
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
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-md gap-0 overflow-y-auto p-0 sm:max-w-md">
        <DialogHeader className="space-y-2 p-6 pb-0 text-left">
          <DialogTitle className="text-xl text-primary">
            Invite a Family Member
          </DialogTitle>
          <DialogDescription>
            They&apos;ll get an email with a link to join this tree and fill in
            their own details.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 px-6 pb-6 pt-2">
          {error && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 px-2 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-2 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
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
                      {formatPersonDisplayName(p)}
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
        </div>
      </DialogContent>
    </Dialog>
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
  // parent_child: API uses personA = parent, personB = child (see relationship inference).
  const asPersonA = role === "child" || role === "spouse";

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
  const { data, isPending, refetch } = useQuery({
    queryKey: queryKeys.trees.detail(id ?? ""),
    queryFn: () =>
      apiGetData<{
        tree: FamilyTree;
        persons: Person[];
        relationships: Relationship[];
        myRole: string | null;
        canEdit: boolean;
        canManage: boolean;
      }>(`/api/trees/${id}`),
    enabled: !!id,
  });
  const tree = data?.tree ?? null;
  const persons = data?.persons ?? [];
  const relationships = data?.relationships ?? [];
  const canEdit = data?.canEdit ?? false;
  const canManage = data?.canManage ?? false;
  const loading = isPending;
  const fetchTree = () => {
    void refetch();
  };
  const [showAddMember, setShowAddMember] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showRename, setShowRename] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [renameSaving, setRenameSaving] = useState(false);
  const [renameError, setRenameError] = useState("");
  const [addRelative, setAddRelative] = useState<{
    person: Person;
    role: RelativeRole;
  } | null>(null);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtml = html.style.overflow;
    const prevBody = body.style.overflow;

    html.style.overflow = "hidden";
    body.style.overflow = "hidden";

    return () => {
      html.style.overflow = prevHtml;
      body.style.overflow = prevBody;
    };
  }, []);

  if (loading) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background text-muted-foreground">
        Loading...
      </div>
    );
  }
  if (!tree) {
    return (
      <div className="fixed inset-0 z-[100] overflow-y-auto bg-background">
        <NotFoundView
          description="This family tree may have been deleted, or you don't have access to it."
          links={[
            { href: "/trees", label: "Trees" },
            { href: "/persons", label: "People" },
            { href: "/dashboard", label: "Dashboard" },
          ]}
          primaryHref="/trees"
          primaryLabel="Back to Trees"
          secondaryHref="/dashboard"
          secondaryLabel="Dashboard"
          title="Tree not found"
        />
      </div>
    );
  }

  const existingPersonIds = persons.map((p) => p.id);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-background text-foreground">
      <div className="flex shrink-0 items-center justify-between border-b border-border bg-card px-4 py-3">
        <div className="flex items-center gap-3">
          <Button asChild size="sm" variant="ghost">
            <Link href="/trees">← Trees</Link>
          </Button>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-lg font-bold text-primary">{tree.name}</h1>
              {canManage && (
                <Button
                  aria-label="Rename tree"
                  className="h-7 w-7 text-muted-foreground hover:text-primary"
                  size="icon"
                  title="Rename tree"
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setRenameValue(tree.name);
                    setRenameError("");
                    setShowRename(true);
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
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
          {canEdit && (
            <Button size="sm" onClick={() => setShowAddMember(true)}>
              + Add Person
            </Button>
          )}
          {canManage && (
            <Button
              className="border-primary/40 text-primary"
              size="sm"
              variant="outline"
              onClick={() => setShowInvite(true)}
            >
              Invite Family
            </Button>
          )}
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? "Hide" : "People"} ({persons.length})
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {persons.length === 0 ? (
            canEdit ? (
              <StartWizard
                treeId={Number(id)}
                onDone={() => {
                  fetchTree();
                }}
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center p-6 text-center">
                <p className="mb-2 text-5xl">🌳</p>
                <h2 className="text-lg font-semibold text-primary">
                  This tree is empty
                </h2>
                <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                  You can view this tree; ask the owner for edit access to add
                  people.
                </p>
              </div>
            )
          ) : (
            <div className="relative min-h-0 flex-1">
              <FamilyTreeViewer
                persons={persons}
                relationships={relationships}
                rootPersonId={tree.rootPersonId}
                onAddRelative={
                  canEdit
                    ? (person, role) => setAddRelative({ person, role })
                    : undefined
                }
              />
            </div>
          )}
        </div>

        {sidebarOpen && (
          <div className="flex w-64 shrink-0 flex-col overflow-y-auto border-l border-border bg-card p-4">
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
                      {getPersonInitials(p)}
                    </div>
                    <div className="min-w-0">
                      <p
                        className="truncate text-sm font-medium leading-tight text-foreground"
                        title={formatPersonDisplayName(p)}
                      >
                        {formatPersonDisplayName(p)}
                      </p>
                      {p.aliveStatus === "deceased" && (
                        <p className="text-xs text-muted-foreground">†</p>
                      )}
                    </div>
                  </Link>
                  {canEdit && (
                    <div className="hidden shrink-0 flex-col gap-1 group-hover:flex">
                      <Button
                        className="h-7 px-1.5 text-xs text-primary"
                        size="xs"
                        title="Add child"
                        type="button"
                        variant="ghost"
                        onClick={() =>
                          setAddRelative({ person: p, role: "child" })
                        }
                      >
                        +Child
                      </Button>
                      <Button
                        className="h-7 px-1.5 text-xs text-primary"
                        size="xs"
                        title="Add spouse"
                        type="button"
                        variant="ghost"
                        onClick={() =>
                          setAddRelative({ person: p, role: "spouse" })
                        }
                      >
                        +Spouse
                      </Button>
                    </div>
                  )}
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

      {showAddMember && canEdit && (
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

      {addRelative && canEdit && (
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

      {showInvite && canManage && (
        <InviteModal
          persons={persons}
          treeId={Number(id)}
          onClose={() => setShowInvite(false)}
        />
      )}

      <Dialog
        open={showRename}
        onOpenChange={(open) => {
          if (!open) setShowRename(false);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename tree</DialogTitle>
            <DialogDescription>
              Update the display name for this family tree. Only the owner can
              change it.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              const name = renameValue.trim();
              if (!name) {
                setRenameError("Name is required.");
                return;
              }
              setRenameSaving(true);
              setRenameError("");
              try {
                const res = await fetch(`/api/trees/${id}`, {
                  method: "PATCH",
                  credentials: "include",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ name }),
                });
                const body = await res.json().catch(() => ({}));
                if (!res.ok) {
                  setRenameError(
                    (body as { message?: string }).message ||
                      "Could not rename tree.",
                  );
                  return;
                }
                setShowRename(false);
                await refetch();
              } finally {
                setRenameSaving(false);
              }
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="tree-name">Name</Label>
              <Input
                autoFocus
                id="tree-name"
                maxLength={120}
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
              />
              {renameError ? (
                <p className="text-sm text-destructive">{renameError}</p>
              ) : null}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="secondary"
                disabled={renameSaving}
                onClick={() => setShowRename(false)}
              >
                Cancel
              </Button>
              <Button disabled={renameSaving} type="submit">
                {renameSaving ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

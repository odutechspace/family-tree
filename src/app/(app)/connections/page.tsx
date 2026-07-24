"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { UserAvatar } from "@/src/components/UserAvatar";
import { Button } from "@/src/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/src/components/ui/tabs";
import { apiGetData, apiGetPersonList } from "@/src/lib/api-fetch";
import {
  CONNECTION_REL_OPTIONS,
  RELATIONSHIP_TYPE_LABELS,
} from "@/src/lib/kinshipLabel";
import { formatPersonDisplayName } from "@/src/lib/personDisplayName";
import { queryKeys } from "@/src/lib/query-keys";

interface PersonSummary {
  id: number;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  maidenName?: string | null;
  nickname?: string | null;
  photoUrl?: string | null;
}

interface ConnReq {
  id: number;
  fromUserId: number;
  fromPersonId?: number | null;
  targetPersonId: number;
  proposedRelationshipType?: string | null;
  message?: string | null;
  status: string;
  createdAt: string;
  targetPerson?: PersonSummary | null;
  fromPerson?: PersonSummary | null;
  fromUser?: { id: number; name: string; profilePhotoUrl?: string | null } | null;
}

interface SuggestionsPayload {
  linkedPersonId: number | null;
  matches: Array<{
    candidateId: number;
    score: number;
    reasons: string[];
    deterministic: boolean;
    suggestedRelType?: string;
    person: PersonSummary;
  }>;
  relativesNearby: Array<
    PersonSummary & { degree: number; kinshipLabel: string }
  >;
  reachablePersonIds: number[];
}

type SelectSource = "match" | "search" | "preset";

function relLabel(type?: string | null) {
  if (!type) return "Connection";
  return RELATIONSHIP_TYPE_LABELS[type] || type;
}

function ConnectionsInner() {
  const searchParams = useSearchParams();
  const presetTarget = searchParams.get("targetPersonId");
  const queryClient = useQueryClient();

  const [selected, setSelected] = useState<PersonSummary | null>(null);
  const [selectSource, setSelectSource] = useState<SelectSource | null>(null);
  const [matchMeta, setMatchMeta] = useState<{
    deterministic: boolean;
    score: number;
    suggestedRelType?: string;
  } | null>(null);
  const [relType, setRelType] = useState<string>("");
  const [message, setMessage] = useState("");
  const [formMsg, setFormMsg] = useState("");
  const [formErr, setFormErr] = useState("");
  const [personSearch, setPersonSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(personSearch), 250);
    return () => clearTimeout(t);
  }, [personSearch]);

  const suggestionsQ = useQuery({
    queryKey: queryKeys.me.suggestions,
    queryFn: () => apiGetData<SuggestionsPayload>("/api/me/suggestions"),
  });

  const reachableSet = useMemo(
    () => new Set(suggestionsQ.data?.reachablePersonIds ?? []),
    [suggestionsQ.data?.reachablePersonIds],
  );

  const relativesById = useMemo(() => {
    const map = new Map<
      number,
      PersonSummary & { degree: number; kinshipLabel: string }
    >();
    for (const r of suggestionsQ.data?.relativesNearby ?? []) {
      map.set(r.id, r);
    }
    return map;
  }, [suggestionsQ.data?.relativesNearby]);

  const searchQ = useQuery({
    queryKey: queryKeys.persons.directory({
      search: debouncedSearch,
      limit: 30,
    }),
    queryFn: () =>
      apiGetPersonList<PersonSummary>(
        `/api/persons?search=${encodeURIComponent(debouncedSearch)}&limit=30`,
      ),
    enabled: debouncedSearch.trim().length > 0,
  });

  const presetId = presetTarget ? Number(presetTarget) : NaN;
  const presetValid = Number.isFinite(presetId) && presetId > 0;

  const presetQ = useQuery({
    queryKey: queryKeys.persons.detail(presetValid ? presetId : 0),
    queryFn: () =>
      apiGetData<{ person: PersonSummary }>(`/api/persons/${presetId}`),
    enabled: presetValid && !selected,
  });

  useEffect(() => {
    if (selected || !presetQ.data?.person) return;
    const p = presetQ.data.person;
    if (reachableSet.has(p.id)) return; // already related — don't compose
    setSelected(p);
    setSelectSource("preset");
    setMatchMeta(null);
    setRelType("");
  }, [presetQ.data, selected, reachableSet]);

  const incomingQ = useQuery({
    queryKey: queryKeys.connectionRequests.list("incoming"),
    queryFn: () =>
      apiGetData<{ requests: ConnReq[] }>(
        "/api/connection-requests?box=incoming",
      ),
  });
  const outgoingQ = useQuery({
    queryKey: queryKeys.connectionRequests.list("outgoing"),
    queryFn: () =>
      apiGetData<{ requests: ConnReq[] }>(
        "/api/connection-requests?box=outgoing",
      ),
  });

  const send = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error("Choose a person first.");
      if (!relType) throw new Error("Choose how you are related.");
      const res = await fetch("/api/connection-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetPersonId: selected.id,
          proposedRelationshipType: relType,
          message: message || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to send.");
      return data;
    },
    onSuccess: () => {
      setFormMsg("Connection request sent.");
      setFormErr("");
      setMessage("");
      queryClient.invalidateQueries({
        queryKey: queryKeys.connectionRequests.list("outgoing"),
      });
    },
    onError: (err) =>
      setFormErr(err instanceof Error ? err.message : "Failed."),
  });

  const respond = useMutation({
    mutationFn: async (args: {
      id: number;
      decision: "accepted" | "declined";
    }) => {
      const res = await fetch(`/api/connection-requests/${args.id}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision: args.decision }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed.");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.connectionRequests.list("incoming"),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.me.relatives });
      queryClient.invalidateQueries({ queryKey: queryKeys.me.suggestions });
    },
  });

  const searchResults = searchQ.data?.items ?? [];
  const matches = suggestionsQ.data?.matches ?? [];
  const relativesNearby = suggestionsQ.data?.relativesNearby ?? [];
  const hasLinkedPerson = suggestionsQ.data?.linkedPersonId != null;

  function selectFromMatch(m: SuggestionsPayload["matches"][number]) {
    setSelected(m.person);
    setSelectSource("match");
    setMatchMeta({
      deterministic: m.deterministic,
      score: m.score,
      suggestedRelType: m.suggestedRelType,
    });
    setRelType(m.suggestedRelType || "same_person");
    setFormMsg("");
    setFormErr("");
  }

  function selectFromSearch(p: PersonSummary) {
    setSelected(p);
    setSelectSource("search");
    setMatchMeta(null);
    setRelType("");
    setFormMsg("");
    setFormErr("");
  }

  function clearSelection() {
    setSelected(null);
    setSelectSource(null);
    setMatchMeta(null);
    setRelType("");
  }

  const canSend = Boolean(selected && relType && !reachableSet.has(selected.id));

  return (
    <div className="min-h-screen bg-background px-4 py-8 text-foreground">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-primary">Connections</h1>
            <p className="text-sm text-muted-foreground">
              Relatives already on your graph vs people to link or merge
            </p>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link href="/dashboard">Dashboard</Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your relatives nearby</CardTitle>
            <CardDescription>
              Already on your family graph — kinship is inferred (e.g.
              grandmother). No connection request needed.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {!hasLinkedPerson && !suggestionsQ.isPending ? (
              <p className="text-sm text-muted-foreground">
                Link your account to a person on{" "}
                <Link className="text-primary underline" href="/profile">
                  Profile
                </Link>{" "}
                to see relatives.
              </p>
            ) : null}
            {suggestionsQ.isPending ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : null}
            {!suggestionsQ.isPending &&
            hasLinkedPerson &&
            relativesNearby.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No nearby relatives yet.
              </p>
            ) : null}
            <ul className="space-y-2">
              {relativesNearby.map((p) => {
                const label = formatPersonDisplayName(p);
                return (
                  <li
                    key={`rel-${p.id}`}
                    className="flex items-center justify-between gap-3"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <UserAvatar
                        name={label}
                        size="md"
                        src={p.photoUrl}
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{label}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {p.kinshipLabel}
                        </p>
                      </div>
                    </div>
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/persons/${p.id}`}>View</Link>
                    </Button>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">People to connect</CardTitle>
            <CardDescription>
              Possible duplicates or people not yet on your graph. Choose a
              direct relationship (parent/child, sibling, …) — not grandmother,
              which is inferred from parents.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="personSearch">Search people</Label>
              <Input
                id="personSearch"
                placeholder="Type a name…"
                value={personSearch}
                onChange={(e) => setPersonSearch(e.target.value)}
              />
              {debouncedSearch.trim() ? (
                <ul className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-border p-2">
                  {searchQ.isPending ? (
                    <li className="px-2 py-1 text-sm text-muted-foreground">
                      Searching…
                    </li>
                  ) : searchResults.length === 0 ? (
                    <li className="px-2 py-1 text-sm text-muted-foreground">
                      No people match that name.
                    </li>
                  ) : (
                    searchResults.map((p) => {
                      const label = formatPersonDisplayName(p);
                      const already = reachableSet.has(p.id);
                      const kin = relativesById.get(p.id);
                      const active = selected?.id === p.id;
                      return (
                        <li key={p.id}>
                          {already ? (
                            <div className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm">
                              <div className="flex min-w-0 items-center gap-2">
                                <UserAvatar
                                  name={label}
                                  size="sm"
                                  src={p.photoUrl}
                                />
                                <div className="min-w-0">
                                  <p className="truncate">{label}</p>
                                  <p className="truncate text-xs text-muted-foreground">
                                    Already on your family graph
                                    {kin ? ` — ${kin.kinshipLabel}` : ""}
                                  </p>
                                </div>
                              </div>
                              <Button asChild size="sm" variant="ghost">
                                <Link href={`/persons/${p.id}`}>View</Link>
                              </Button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                                active
                                  ? "bg-primary/15 text-foreground"
                                  : "hover:bg-muted"
                              }`}
                              onClick={() => selectFromSearch(p)}
                            >
                              <UserAvatar
                                name={label}
                                size="sm"
                                src={p.photoUrl}
                              />
                              <span className="min-w-0 truncate">{label}</span>
                            </button>
                          )}
                        </li>
                      );
                    })
                  )}
                </ul>
              ) : null}
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Possible matches</p>
              {suggestionsQ.isPending ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : null}
              {!suggestionsQ.isPending && matches.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No match suggestions. Search above to find someone new.
                </p>
              ) : null}
              <ul className="space-y-2">
                {matches.map((m) => {
                  const label = formatPersonDisplayName(m.person);
                  return (
                    <li
                      key={`m-${m.candidateId}`}
                      className="flex items-center justify-between gap-3"
                    >
                      <Link
                        className="flex min-w-0 items-center gap-2"
                        href={`/persons/${m.person.id}`}
                      >
                        <UserAvatar
                          name={label}
                          size="md"
                          src={m.person.photoUrl}
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {label}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {m.reasons.slice(0, 2).join(" · ") ||
                              "Possible match"}
                          </p>
                        </div>
                      </Link>
                      <Button
                        size="sm"
                        type="button"
                        variant={
                          selected?.id === m.person.id
                            ? "default"
                            : "secondary"
                        }
                        onClick={() => selectFromMatch(m)}
                      >
                        {selected?.id === m.person.id ? "Selected" : "Connect"}
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Send a connection request</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {formErr ? (
              <p className="text-sm text-destructive">{formErr}</p>
            ) : null}
            {formMsg ? (
              <p className="text-sm text-primary">{formMsg}</p>
            ) : null}

            {selected ? (
              <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-muted/40 px-3 py-2">
                <div className="flex min-w-0 items-center gap-2">
                  <UserAvatar
                    name={formatPersonDisplayName(selected)}
                    size="md"
                    src={selected.photoUrl}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {formatPersonDisplayName(selected)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {selectSource === "match"
                        ? matchMeta?.deterministic
                          ? "Likely the same person — merge suggested"
                          : "Possible match"
                        : "From search"}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  type="button"
                  variant="ghost"
                  onClick={clearSelection}
                >
                  Clear
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Select someone from possible matches or search (not from
                relatives above).
              </p>
            )}

            <div className="space-y-1">
              <Label>How are you related?</Label>
              <Select
                value={relType || undefined}
                onValueChange={setRelType}
                disabled={!selected}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a direct relationship" />
                </SelectTrigger>
                <SelectContent>
                  {CONNECTION_REL_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Labels like grandmother are shown for people already on your
                tree. To add someone new, choose a direct link (e.g.
                Parent/child).
              </p>
            </div>
            <div className="space-y-1">
              <Label>Message</Label>
              <Textarea
                rows={2}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Optional note for their steward…"
              />
            </div>
            <Button
              disabled={send.isPending || !canSend}
              onClick={() => send.mutate()}
            >
              {send.isPending ? "Sending…" : "Send request"}
            </Button>
          </CardContent>
        </Card>

        <Tabs defaultValue="incoming">
          <TabsList>
            <TabsTrigger value="incoming">Incoming</TabsTrigger>
            <TabsTrigger value="outgoing">Outgoing</TabsTrigger>
          </TabsList>
          <TabsContent value="incoming" className="space-y-3 pt-3">
            {(incomingQ.data?.requests ?? []).map((r) => {
              const fromName =
                (r.fromPerson && formatPersonDisplayName(r.fromPerson)) ||
                r.fromUser?.name ||
                "Someone";
              const targetName = r.targetPerson
                ? formatPersonDisplayName(r.targetPerson)
                : "a person you steward";
              return (
                <Card key={r.id}>
                  <CardContent className="flex items-center justify-between gap-3 py-4">
                    <div className="flex min-w-0 items-start gap-3">
                      <UserAvatar
                        name={fromName}
                        size="md"
                        src={
                          r.fromPerson?.photoUrl ||
                          r.fromUser?.profilePhotoUrl
                        }
                      />
                      <div className="min-w-0 text-sm">
                        <p>
                          <span className="font-medium">{fromName}</span>
                          {" wants to connect with "}
                          <span className="font-medium">{targetName}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {relLabel(r.proposedRelationshipType)} ·{" "}
                          {new Date(r.createdAt).toLocaleString()}
                        </p>
                        {r.message ? (
                          <p className="mt-1 italic text-muted-foreground">
                            “{r.message}”
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button
                        size="sm"
                        disabled={respond.isPending}
                        onClick={() =>
                          respond.mutate({ id: r.id, decision: "accepted" })
                        }
                      >
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={respond.isPending}
                        onClick={() =>
                          respond.mutate({ id: r.id, decision: "declined" })
                        }
                      >
                        Decline
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {!incomingQ.isPending &&
            (incomingQ.data?.requests ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No incoming requests.
              </p>
            ) : null}
          </TabsContent>
          <TabsContent value="outgoing" className="space-y-3 pt-3">
            {(outgoingQ.data?.requests ?? []).map((r) => {
              const targetName = r.targetPerson
                ? formatPersonDisplayName(r.targetPerson)
                : "Unknown person";
              return (
                <Card key={r.id}>
                  <CardContent className="flex items-center gap-3 py-4 text-sm">
                    <UserAvatar
                      name={targetName}
                      size="md"
                      src={r.targetPerson?.photoUrl}
                    />
                    <div className="min-w-0">
                      <p className="font-medium">{targetName}</p>
                      <p className="text-xs text-muted-foreground">
                        {relLabel(r.proposedRelationshipType)} · {r.status}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {!outgoingQ.isPending &&
            (outgoingQ.data?.requests ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No outgoing requests.
              </p>
            ) : null}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default function ConnectionsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-muted-foreground">
          Loading…
        </div>
      }
    >
      <ConnectionsInner />
    </Suspense>
  );
}

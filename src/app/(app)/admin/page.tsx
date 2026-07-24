"use client";
import { useMutation, useQueries, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/src/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/src/components/ui/tabs";
import { useAuth } from "@/src/hooks/useAuth";
import {
  formatPersonDisplayName,
  getInitialsFromDisplayName,
} from "@/src/lib/personDisplayName";
import { apiGetData, apiGetPersonList } from "@/src/lib/api-fetch";
import { queryKeys } from "@/src/lib/query-keys";

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  profilePhotoUrl?: string;
  displayName?: string;
}
interface PersonSummary {
  id: number;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  maidenName?: string | null;
  nickname?: string | null;
}
interface TreeSummary {
  id: number;
  name: string;
}
interface MergeRequest {
  id: number;
  type: string;
  status: string;
  reason?: string;
  createdAt: string;
  sourcePersonId?: number;
  targetPersonId?: number;
  sourceTreeId?: number;
  targetTreeId?: number;
  sourcePerson?: PersonSummary | null;
  targetPerson?: PersonSummary | null;
  sourceTree?: TreeSummary | null;
  targetTree?: TreeSummary | null;
}

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<
    "overview" | "users" | "merges" | "audits"
  >("overview");
  const adminEnabled = user?.role === "admin";

  const [usersQ, mergesQ, personsQ, treesQ, clansQ, auditsQ] = useQueries({
    queries: [
      {
        queryKey: queryKeys.admin.users,
        queryFn: () => apiGetData<{ users: User[] }>("/api/users"),
        enabled: adminEnabled,
      },
      {
        queryKey: queryKeys.mergeRequests.list({
          all: true,
          status: "pending",
        }),
        queryFn: () =>
          apiGetData<{ requests: MergeRequest[] }>(
            "/api/merge-requests?all=1&status=pending",
          ),
        enabled: adminEnabled,
      },
      {
        queryKey: queryKeys.persons.summary({ limit: 1 }),
        queryFn: () => apiGetPersonList("/api/persons?limit=1"),
        enabled: adminEnabled,
      },
      {
        queryKey: queryKeys.admin.treesAll,
        queryFn: () => apiGetData<{ trees: unknown[] }>("/api/trees"),
        enabled: adminEnabled,
      },
      {
        queryKey: queryKeys.admin.clansAll,
        queryFn: () => apiGetData<{ clans: unknown[] }>("/api/clans"),
        enabled: adminEnabled,
      },
      {
        queryKey: queryKeys.mergeAudits.list,
        queryFn: () =>
          apiGetData<{
            audits: Array<{
              id: number;
              sourcePersonId: number;
              targetPersonId: number;
              performedByUserId: number;
              createdAt: string;
              undoneAt?: string | null;
            }>;
          }>("/api/merge-audits"),
        enabled: adminEnabled,
      },
    ],
  });

  const users = usersQ.data?.users ?? [];
  const pendingMerges = mergesQ.data?.requests ?? [];
  const stats = useMemo(
    () => ({
      persons: personsQ.data?.total ?? 0,
      trees: (treesQ.data?.trees ?? []).length,
      clans: (clansQ.data?.clans ?? []).length,
      mergeRequests: pendingMerges.length,
    }),
    [personsQ.data, treesQ.data, clansQ.data, pendingMerges],
  );

  const loadingData =
    adminEnabled &&
    (usersQ.isPending ||
      mergesQ.isPending ||
      personsQ.isPending ||
      treesQ.isPending ||
      clansQ.isPending);

  useEffect(() => {
    if (!loading && user?.role !== "admin") {
      router.push("/dashboard");
    }
  }, [user, loading, router]);

  const updateRoleMutation = useMutation({
    mutationFn: async (vars: { userId: number; role: string }) => {
      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: vars.userId, role: vars.role }),
      });

      if (!res.ok) throw new Error("Failed to update role");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.users });
    },
  });

  const updateRole = (userId: number, role: string) => {
    updateRoleMutation.mutate({ userId, role });
  };

  if (loading || loadingData)
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center text-stone-400">
        Loading...
      </div>
    );
  if (user?.role !== "admin") return null;

  return (
    <div className="min-h-screen bg-stone-950 text-white py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-amber-400">Admin Panel</h1>
            <p className="text-stone-400 mt-1">
              Manage users, merges, and system data
            </p>
          </div>
          <Link
            className="text-stone-400 hover:text-white text-sm"
            href="/dashboard"
          >
            ← Dashboard
          </Link>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(v) =>
            setActiveTab(v as "overview" | "users" | "merges" | "audits")
          }
        >
          <TabsList className="mb-6 grid h-auto w-full max-w-2xl grid-cols-4 gap-1 rounded-lg bg-stone-800 p-1">
            <TabsTrigger
              className="capitalize text-stone-400 data-[state=active]:bg-amber-600 data-[state=active]:text-white"
              value="overview"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              className="capitalize text-stone-400 data-[state=active]:bg-amber-600 data-[state=active]:text-white"
              value="users"
            >
              Users
            </TabsTrigger>
            <TabsTrigger
              className="relative capitalize text-stone-400 data-[state=active]:bg-amber-600 data-[state=active]:text-white"
              value="merges"
            >
              Merges
              {pendingMerges.length > 0 && (
                <Badge
                  className="ml-1.5 border-0 bg-red-600 px-1.5 py-0 text-[10px] text-white hover:bg-red-600"
                  variant="destructive"
                >
                  {pendingMerges.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              className="capitalize text-stone-400 data-[state=active]:bg-amber-600 data-[state=active]:text-white"
              value="audits"
            >
              Audits
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <StatCard
                href="/persons"
                icon="👥"
                label="Total People"
                value={stats.persons}
              />
              <StatCard
                href="/trees"
                icon="🌳"
                label="Family Trees"
                value={stats.trees}
              />
              <StatCard
                href="/clans"
                icon="🦁"
                label="Clans"
                value={stats.clans}
              />
              <StatCard
                highlight={stats.mergeRequests > 0}
                href="#"
                icon="🔗"
                label="Pending Merges"
                value={stats.mergeRequests}
                onClick={() => setActiveTab("merges")}
              />
            </div>
          </TabsContent>

          <TabsContent value="users">
            <div className="overflow-hidden rounded-xl border border-stone-700 bg-stone-800">
              <div className="p-4 border-b border-stone-700">
                <h2 className="text-amber-400 font-semibold">
                  All Users ({users.length})
                </h2>
              </div>
              <div className="divide-y divide-stone-700">
                {users.map((u) => (
                  <div key={u.id} className="flex items-center gap-4 px-4 py-3">
                    <div className="w-9 h-9 rounded-full bg-stone-700 flex items-center justify-center text-amber-400 font-bold text-sm flex-shrink-0">
                      {getInitialsFromDisplayName(u.displayName || u.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-white font-medium truncate"
                        title={u.displayName || u.name}
                      >
                        {u.displayName || u.name}
                      </p>
                      <p className="text-stone-400 text-xs truncate">
                        {u.email}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select
                        value={u.role}
                        onValueChange={(r) => updateRole(u.id, r)}
                      >
                        <SelectTrigger className="h-8 w-[104px] border-stone-600 bg-stone-700 text-xs text-white focus:ring-amber-500">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="border-stone-600 bg-stone-800 text-white">
                          <SelectItem
                            className="text-xs focus:bg-stone-700"
                            value="user"
                          >
                            User
                          </SelectItem>
                          <SelectItem
                            className="text-xs focus:bg-stone-700"
                            value="admin"
                          >
                            Admin
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <p className="text-stone-500 text-xs hidden sm:block">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent className="space-y-4" value="merges">
            {pendingMerges.length === 0 ? (
              <div className="text-center py-16 text-stone-400">
                <p className="text-4xl mb-3">✅</p>
                <p>No pending merge requests</p>
              </div>
            ) : (
              pendingMerges.map((mr) => (
                <div
                  key={mr.id}
                  className="bg-stone-800 border border-stone-700 rounded-xl p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-900/40 text-yellow-400 border border-yellow-700">
                          pending
                        </span>
                        <span className="text-xs text-stone-500">
                          {mr.type === "duplicate_person"
                            ? "👤 Duplicate Person"
                            : "🌳 Family Trees"}
                        </span>
                      </div>
                      {mr.type === "duplicate_person" && (
                        <p className="text-stone-300 text-sm">
                          Merge{" "}
                          <Link
                            className="text-amber-400 hover:underline"
                            href={`/persons/${mr.sourcePersonId}`}
                          >
                            {mr.sourcePerson
                              ? formatPersonDisplayName(mr.sourcePerson)
                              : `Person #${mr.sourcePersonId}`}
                          </Link>{" "}
                          →{" "}
                          <Link
                            className="text-amber-400 hover:underline"
                            href={`/persons/${mr.targetPersonId}`}
                          >
                            {mr.targetPerson
                              ? formatPersonDisplayName(mr.targetPerson)
                              : `Person #${mr.targetPersonId}`}
                          </Link>
                          <span className="ms-1 font-mono text-[10px] text-stone-500">
                            #{mr.sourcePersonId} → #{mr.targetPersonId}
                          </span>
                        </p>
                      )}
                      {mr.type === "family_trees" && (
                        <p className="text-stone-300 text-sm">
                          Merge{" "}
                          <Link
                            className="text-amber-400 hover:underline"
                            href={`/trees/${mr.sourceTreeId}`}
                          >
                            {mr.sourceTree?.name || `Tree #${mr.sourceTreeId}`}
                          </Link>{" "}
                          →{" "}
                          <Link
                            className="text-amber-400 hover:underline"
                            href={`/trees/${mr.targetTreeId}`}
                          >
                            {mr.targetTree?.name || `Tree #${mr.targetTreeId}`}
                          </Link>
                          <span className="ms-1 font-mono text-[10px] text-stone-500">
                            #{mr.sourceTreeId} → #{mr.targetTreeId}
                          </span>
                        </p>
                      )}
                      {mr.reason && (
                        <p className="mt-1 text-sm italic text-stone-400">
                          <q>{mr.reason}</q>
                        </p>
                      )}
                      <p className="text-stone-500 text-xs mt-2">
                        {new Date(mr.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <AdminReviewButtons mergeRequestId={mr.id} />
                  </div>
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="audits">
            <div className="overflow-hidden rounded-xl border border-stone-700 bg-stone-800">
              <div className="border-b border-stone-700 p-4">
                <h2 className="font-semibold text-amber-400">
                  Recent person merges
                </h2>
              </div>
              <div className="divide-y divide-stone-700">
                {(auditsQ.data?.audits ?? []).length === 0 ? (
                  <p className="p-6 text-sm text-stone-400">No merge audits yet.</p>
                ) : (
                  (auditsQ.data?.audits ?? []).map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between gap-3 px-4 py-3"
                    >
                      <div className="text-sm text-stone-200">
                        <p>
                          #{a.sourcePersonId} → #{a.targetPersonId}
                        </p>
                        <p className="text-xs text-stone-500">
                          by user #{a.performedByUserId} ·{" "}
                          {new Date(a.createdAt).toLocaleString()}
                          {a.undoneAt
                            ? ` · undone ${new Date(a.undoneAt).toLocaleString()}`
                            : ""}
                        </p>
                      </div>
                      {!a.undoneAt ? (
                        <UndoMergeButton
                          auditId={a.id}
                          onUndone={() =>
                            queryClient.invalidateQueries({
                              queryKey: queryKeys.mergeAudits.list,
                            })
                          }
                        />
                      ) : (
                        <Badge variant="secondary">Undone</Badge>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  href,
  onClick,
  highlight,
}: {
  label: string;
  value: number;
  icon: string;
  href: string;
  onClick?: () => void;
  highlight?: boolean;
}) {
  const inner = (
    <div
      className={`bg-stone-800 border rounded-xl p-5 flex flex-col gap-2 transition ${highlight ? "border-amber-600 bg-amber-900/10" : "border-stone-700 hover:border-amber-500/50"}`}
    >
      <span className="text-3xl">{icon}</span>
      <p
        className={`text-3xl font-bold ${highlight ? "text-amber-400" : "text-white"}`}
      >
        {value}
      </p>
      <p className="text-stone-400 text-sm">{label}</p>
    </div>
  );

  if (onClick)
    return (
      <Button
        className="h-auto w-full justify-start p-0 text-left font-normal hover:bg-transparent"
        type="button"
        variant="ghost"
        onClick={onClick}
      >
        {inner}
      </Button>
    );

  return <Link href={href}>{inner}</Link>;
}

function UndoMergeButton({
  auditId,
  onUndone,
}: {
  auditId: number;
  onUndone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const undo = async () => {
    setLoading(true);
    try {
      await fetch(`/api/merge-audits/${auditId}/undo`, { method: "POST" });
      setOpen(false);
      onUndone();
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <Button
        size="sm"
        variant="outline"
        className="border-stone-600 text-xs"
        type="button"
        onClick={() => setOpen(true)}
      >
        Undo
      </Button>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Undo this merge?</AlertDialogTitle>
          <AlertDialogDescription>
            This restores the source person and rewires relationships from the
            audit snapshot. This cannot always be perfect if data changed after
            the merge.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={loading}
            onClick={(e) => {
              e.preventDefault();
              void undo();
            }}
          >
            {loading ? "Undoing…" : "Undo merge"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function AdminReviewButtons({ mergeRequestId }: { mergeRequestId: number }) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState<"approved" | "rejected" | null>(null);

  const review = async (decision: "approved" | "rejected") => {
    setLoading(true);
    try {
      await fetch(`/api/merge-requests/${mergeRequestId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      setPending(null);
      queryClient.invalidateQueries({
        queryKey: queryKeys.mergeRequests.list({ all: true, status: "pending" }),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.mergeRequests.list({ all: true }),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.mergeRequests.list({ all: false }),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex min-w-24 flex-col gap-2">
        <Button
          className="bg-green-800 text-xs font-medium text-green-300 hover:bg-green-700"
          disabled={loading}
          size="sm"
          type="button"
          onClick={() => setPending("approved")}
        >
          ✓ Approve
        </Button>
        <Button
          className="bg-red-900/50 text-xs font-medium text-red-400 hover:bg-red-900"
          disabled={loading}
          size="sm"
          type="button"
          variant="destructive"
          onClick={() => setPending("rejected")}
        >
          ✗ Reject
        </Button>
      </div>

      <AlertDialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open) setPending(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pending === "approved"
                ? "Approve this merge request?"
                : "Reject this merge request?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pending === "approved"
                ? "Approving will apply the merge. This action is recorded in merge audits."
                : "Rejecting will close the request without merging."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={
                pending === "rejected"
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : undefined
              }
              disabled={loading || !pending}
              onClick={(e) => {
                e.preventDefault();
                if (pending) void review(pending);
              }}
            >
              {loading
                ? "Working…"
                : pending === "approved"
                  ? "Approve"
                  : "Reject"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import Link from "next/link";

import { useAuth } from "@/src/hooks/useAuth";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent } from "@/src/components/ui/card";
import { Textarea } from "@/src/components/ui/textarea";
import { apiGetData } from "@/src/lib/api-fetch";
import { queryKeys } from "@/src/lib/query-keys";

interface MergeRequest {
  id: number;
  type: string;
  status: string;
  sourcePersonId?: number;
  targetPersonId?: number;
  sourceTreeId?: number;
  targetTreeId?: number;
  reason?: string;
  requestedByUserId: number;
  reviewedAt?: string;
  createdAt: string;
}

const STATUS_STYLES: Record<string, string> = {
  pending:
    "border-amber-200 bg-amber-100 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
  approved:
    "border-emerald-200 bg-emerald-100 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400",
  rejected:
    "border-red-200 bg-red-100 text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400",
  cancelled: "border-border bg-muted text-muted-foreground",
};

export default function MergeRequestsPage() {
  const { user, loading: authLoading } = useAuth();
  const [statusFilter, setStatusFilter] = useState("all");
  const isAdmin = user?.role === "admin";

  const { data, isPending } = useQuery({
    queryKey: queryKeys.mergeRequests.list({ all: isAdmin }),
    queryFn: () =>
      apiGetData<{ requests: MergeRequest[] }>(
        `/api/merge-requests${isAdmin ? "?all=1" : ""}`,
      ),
    enabled: !authLoading && !!user,
  });

  const requests = data?.requests ?? [];
  const loading = authLoading || (isPending && !!user);

  const filtered =
    statusFilter === "all"
      ? requests
      : requests.filter((r) => r.status === statusFilter);

  return (
    <div className="min-h-screen bg-background px-4 py-8 text-foreground">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-bold text-primary">Merge Requests</h1>
            <p className="mt-1 text-muted-foreground">
              Propose and manage family history merges
            </p>
          </div>
          <Button asChild size="lg">
            <Link href="/merge-requests/new">+ New Merge Request</Link>
          </Button>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          {["all", "pending", "approved", "rejected"].map((s) => (
            <Button
              key={s}
              className="capitalize"
              size="sm"
              type="button"
              variant={statusFilter === s ? "default" : "secondary"}
              onClick={() => setStatusFilter(s)}
            >
              {s}
            </Button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <p className="mb-3 text-4xl">🔗</p>
            <p className="mb-2 text-lg">No merge requests found</p>
            <Button asChild className="text-primary" variant="link">
              <Link href="/merge-requests/new">Create one →</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((mr) => (
              <Card key={mr.id}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="mb-2 flex items-center gap-2">
                        <span
                          className={`rounded-full border px-2 py-0.5 text-xs ${STATUS_STYLES[mr.status] || "border-border bg-muted text-muted-foreground"}`}
                        >
                          {mr.status}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {mr.type === "duplicate_person"
                            ? "👤 Duplicate Person"
                            : "🌳 Family Trees"}
                        </span>
                      </div>

                      {mr.type === "duplicate_person" && (
                        <p className="text-sm text-foreground">
                          Merge Person #{mr.sourcePersonId} into Person #
                          {mr.targetPersonId}
                        </p>
                      )}
                      {mr.type === "family_trees" && (
                        <p className="text-sm text-foreground">
                          Merge Tree #{mr.sourceTreeId} into Tree #
                          {mr.targetTreeId}
                        </p>
                      )}

                      {mr.reason && (
                        <p className="mt-1 text-sm italic text-muted-foreground">
                          &quot;{mr.reason}&quot;
                        </p>
                      )}
                      <p className="mt-2 text-xs text-muted-foreground">
                        {new Date(mr.createdAt).toLocaleDateString()}
                      </p>
                    </div>

                    {user?.role === "admin" && mr.status === "pending" && (
                      <ReviewButtons mergeRequestId={mr.id} />
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ReviewButtons({ mergeRequestId }: { mergeRequestId: number }) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState("");
  const [showNotes, setShowNotes] = useState(false);
  const [pendingDecision, setPendingDecision] = useState<
    "approved" | "rejected" | null
  >(null);

  const reviewMutation = useMutation({
    mutationFn: async (vars: {
      decision: "approved" | "rejected";
      reviewNotes: string;
    }) => {
      const res = await fetch(`/api/merge-requests/${mergeRequestId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision: vars.decision,
          reviewNotes: vars.reviewNotes,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(
          (data as { message?: string }).message || "Review failed.",
        );
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.mergeRequests.list({ all: true }),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.mergeRequests.list({ all: false }),
      });
    },
  });

  const submit = (decision: "approved" | "rejected") => {
    setLoading(true);
    reviewMutation.mutate(
      { decision, reviewNotes: notes },
      {
        onSettled: () => {
          setLoading(false);
          setShowNotes(false);
          setNotes("");
        },
      },
    );
  };

  if (showNotes) {
    return (
      <div className="flex min-w-48 flex-col gap-2">
        <Textarea
          className="text-xs"
          placeholder="Review notes (optional)..."
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <div className="flex gap-2">
          <Button
            className="flex-1 text-xs"
            disabled={loading}
            size="sm"
            type="button"
            variant={pendingDecision === "approved" ? "default" : "destructive"}
            onClick={() => pendingDecision && submit(pendingDecision)}
          >
            Confirm {pendingDecision}
          </Button>
          <Button
            className="text-xs"
            size="sm"
            type="button"
            variant="secondary"
            onClick={() => setShowNotes(false)}
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        className="bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-800 dark:hover:bg-emerald-700"
        size="sm"
        type="button"
        onClick={() => {
          setPendingDecision("approved");
          setShowNotes(true);
        }}
      >
        ✓ Approve
      </Button>
      <Button
        size="sm"
        type="button"
        variant="destructive"
        onClick={() => {
          setPendingDecision("rejected");
          setShowNotes(true);
        }}
      >
        ✗ Reject
      </Button>
    </div>
  );
}

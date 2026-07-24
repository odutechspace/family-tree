"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";

import { Button } from "@/src/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/card";
import { Badge } from "@/src/components/ui/badge";
import { apiGetData } from "@/src/lib/api-fetch";
import { queryKeys } from "@/src/lib/query-keys";
import { formatPersonDisplayName } from "@/src/lib/personDisplayName";

interface PersonSummary {
  id: number;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  maidenName?: string | null;
  nickname?: string | null;
}

interface IncomingEdit {
  id: number;
  personId: number;
  proposedByUserId: number;
  kind?: "field_edit" | "remove_relationship";
  relationshipId?: number | null;
  changes: Record<string, unknown>;
  note?: string | null;
  createdAt: string;
  person?: PersonSummary | null;
  relationship?: {
    id: number;
    type: string;
    personAId: number;
    personBId: number;
    personA?: PersonSummary | null;
    personB?: PersonSummary | null;
  } | null;
}

const REL_TYPE_LABELS: Record<string, string> = {
  parent_child: "Parent / child",
  spouse: "Spouse",
  partner: "Partner",
  sibling: "Sibling",
  half_sibling: "Half-sibling",
  step_parent: "Step-parent",
  adopted: "Adoptive",
  guardian: "Guardian",
  co_wife: "Co-wife",
  levirate: "Levirate",
};

export default function ProposalsPage() {
  const queryClient = useQueryClient();
  const { data, isPending } = useQuery({
    queryKey: queryKeys.me.proposedEditsIncoming,
    queryFn: () =>
      apiGetData<{ proposedEdits: IncomingEdit[] }>(
        "/api/me/proposed-edits/incoming",
      ),
  });

  const review = useMutation({
    mutationFn: async (args: {
      id: number;
      decision: "approved" | "rejected";
    }) => {
      const res = await fetch(`/api/proposed-edits/${args.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision: args.decision }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message || "Review failed.");
      return body;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.me.proposedEditsIncoming,
      });
    },
  });

  const edits = data?.proposedEdits ?? [];

  return (
    <div className="min-h-screen bg-background px-4 py-8 text-foreground">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-primary">Edit proposals</h1>
            <p className="text-sm text-muted-foreground">
              Suggested changes and relationship removals awaiting your review
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard">Dashboard</Link>
          </Button>
        </div>

        {isPending ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : edits.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground text-sm">
              No pending proposals.
            </CardContent>
          </Card>
        ) : (
          edits.map((e) => {
            const isRemoval = e.kind === "remove_relationship";
            const a = e.relationship?.personA;
            const b = e.relationship?.personB;
            const typeLabel =
              REL_TYPE_LABELS[e.relationship?.type || ""] ||
              e.relationship?.type ||
              "relationship";

            return (
              <Card key={e.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    {isRemoval
                      ? "Remove relationship"
                      : e.person
                        ? formatPersonDisplayName(e.person)
                        : `Person #${e.personId}`}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Proposed by user #{e.proposedByUserId} ·{" "}
                    {new Date(e.createdAt).toLocaleString()}
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {isRemoval ? (
                    <div className="space-y-1 text-sm">
                      <p>
                        {a ? formatPersonDisplayName(a) : `Person #${e.relationship?.personAId ?? "?"}`}
                        <span className="mx-2 text-muted-foreground">—</span>
                        <Badge variant="outline">{typeLabel}</Badge>
                        <span className="mx-2 text-muted-foreground">—</span>
                        {b ? formatPersonDisplayName(b) : `Person #${e.relationship?.personBId ?? "?"}`}
                      </p>
                      {e.relationshipId ? (
                        <p className="font-mono text-xs text-muted-foreground">
                          relationship #{e.relationshipId}
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(e.changes).map(([k, v]) => (
                        <Badge key={k} variant="outline">
                          {k}: {String(v ?? "—")}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {e.note ? (
                    <p className="text-sm italic text-muted-foreground">
                      “{e.note}”
                    </p>
                  ) : null}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      disabled={review.isPending}
                      onClick={() =>
                        review.mutate({ id: e.id, decision: "approved" })
                      }
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={review.isPending}
                      onClick={() =>
                        review.mutate({ id: e.id, decision: "rejected" })
                      }
                    >
                      Reject
                    </Button>
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/persons/${e.personId}`}>View person</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

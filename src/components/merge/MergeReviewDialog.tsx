"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/src/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog";
import { Badge } from "@/src/components/ui/badge";
import { queryKeys } from "@/src/lib/query-keys";

export interface PendingMerge {
  sourceId: number;
  targetId: number;
  score: number;
  reasons: string[];
  source: { id: number; label: string };
  target: { id: number; label: string };
}

interface MergeReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pendingMerges: PendingMerge[];
  onDone?: () => void;
}

export function MergeReviewDialog({
  open,
  onOpenChange,
  pendingMerges,
  onDone,
}: MergeReviewDialogProps) {
  const queryClient = useQueryClient();
  const [items, setItems] = useState(pendingMerges);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const keyOf = (m: PendingMerge) => `${m.sourceId}-${m.targetId}`;

  const confirmMerge = async (m: PendingMerge) => {
    setBusyId(keyOf(m));
    setError("");
    try {
      const res = await fetch("/api/persons/merge/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceId: m.sourceId,
          targetId: m.targetId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Merge failed.");
      setItems((prev) => prev.filter((x) => keyOf(x) !== keyOf(m)));
      await queryClient.invalidateQueries({ queryKey: queryKeys.me.relatives });
      await queryClient.invalidateQueries({ queryKey: ["trees"] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Merge failed.");
    } finally {
      setBusyId(null);
    }
  };

  const skip = (m: PendingMerge) => {
    setItems((prev) => prev.filter((x) => keyOf(x) !== keyOf(m)));
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) onDone?.();
      }}
    >
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>People in common</DialogTitle>
          <DialogDescription>
            We found people that may already exist in both trees. Merge
            duplicates so the family graph stays clean.
          </DialogDescription>
        </DialogHeader>
        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : null}
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No pending merges. You&apos;re all set.
          </p>
        ) : (
          <ul className="space-y-4">
            {items.map((m) => (
              <li
                key={keyOf(m)}
                className="rounded-lg border border-border p-3 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="text-sm">
                    <p className="font-medium">{m.source.label}</p>
                    <p className="text-muted-foreground text-xs">your copy</p>
                  </div>
                  <span className="text-muted-foreground text-xs">→</span>
                  <div className="text-sm text-right">
                    <p className="font-medium">{m.target.label}</p>
                    <p className="text-muted-foreground text-xs">family tree</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  <Badge variant="secondary">score {m.score}</Badge>
                  {m.reasons.map((r) => (
                    <Badge key={r} variant="outline">
                      {r}
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    disabled={busyId === keyOf(m)}
                    onClick={() => confirmMerge(m)}
                  >
                    {busyId === keyOf(m) ? "Merging…" : "Merge"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busyId === keyOf(m)}
                    onClick={() => skip(m)}
                  >
                    Keep separate
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}

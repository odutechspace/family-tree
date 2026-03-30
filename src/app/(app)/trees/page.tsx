"use client";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import Link from "next/link";

import { Button } from "@/src/components/ui/button";
import { Card, CardContent } from "@/src/components/ui/card";
import { apiGetData } from "@/src/lib/api-fetch";
import { queryKeys } from "@/src/lib/query-keys";

interface FamilyTree {
  id: number;
  name: string;
  description?: string;
  visibility: string;
  rootPersonId?: number;
  createdAt: string;
}

export default function TreesPage() {
  const [tab, setTab] = useState<"mine" | "public">("mine");

  const { data, isPending } = useQuery({
    queryKey: queryKeys.trees.list({ mine: tab === "mine" }),
    queryFn: () =>
      apiGetData<{ trees: FamilyTree[] }>(
        tab === "mine" ? "/api/trees?mine=1" : "/api/trees",
      ),
  });

  const trees = data?.trees ?? [];
  const loading = isPending;

  return (
    <div className="min-h-screen bg-background px-4 py-8 text-foreground">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-bold text-primary">Family Trees</h1>
            <p className="mt-1 text-muted-foreground">
              Visualize and manage your family lineages
            </p>
          </div>
          <Button asChild size="lg">
            <Link href="/trees/new">+ New Tree</Link>
          </Button>
        </div>

        <div className="mb-6 flex gap-2">
          <Button
            size="sm"
            type="button"
            variant={tab === "mine" ? "default" : "secondary"}
            onClick={() => setTab("mine")}
          >
            My Trees
          </Button>
          <Button
            size="sm"
            type="button"
            variant={tab === "public" ? "default" : "secondary"}
            onClick={() => setTab("public")}
          >
            Public Trees
          </Button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-40 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : trees.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <p className="mb-4 text-5xl">🌳</p>
            <p className="mb-2 text-lg">
              {tab === "mine" ? "You have no trees yet" : "No public trees yet"}
            </p>
            <Button asChild className="text-primary" variant="link">
              <Link href="/trees/new">Create your first family tree →</Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            {trees.map((tree) => (
              <Link
                key={tree.id}
                className="group block"
                href={`/trees/${tree.id}`}
              >
                <Card className="h-full border-border transition-colors hover:border-primary/40">
                  <CardContent className="flex flex-col gap-3 p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-xl">
                        🌳
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          tree.visibility === "public"
                            ? "border border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400"
                            : tree.visibility === "family_only"
                              ? "border border-blue-200 bg-blue-100 text-blue-800 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-400"
                              : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {tree.visibility.replace("_", " ")}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground transition-colors group-hover:text-primary">
                        {tree.name}
                      </h3>
                      {tree.description && (
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                          {tree.description}
                        </p>
                      )}
                    </div>
                    <p className="mt-auto text-xs text-muted-foreground">
                      {new Date(tree.createdAt).toLocaleDateString()}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

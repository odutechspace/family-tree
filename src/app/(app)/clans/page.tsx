"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

import { Button } from "@/src/components/ui/button";
import { Card, CardContent } from "@/src/components/ui/card";
import { Input } from "@/src/components/ui/input";

interface Clan {
  id: number;
  name: string;
  alternateName?: string;
  totem?: string;
  originRegion?: string;
  originCountry?: string;
  ethnicGroup?: string;
  isVerified: boolean;
}

export default function ClansPage() {
  const [clans, setClans] = useState<Clan[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchClans = async (q = "") => {
    setLoading(true);
    const res = await fetch(`/api/clans?search=${encodeURIComponent(q)}`);
    const data = await res.json();

    setClans(data.data?.clans || []);
    setLoading(false);
  };

  useEffect(() => {
    const t = setTimeout(() => fetchClans(search), 300);

    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    fetchClans();
  }, []);

  return (
    <div className="min-h-screen bg-background px-4 py-8 text-foreground">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-bold text-primary">
              Clans & Lineages
            </h1>
            <p className="mt-1 text-muted-foreground">
              Explore African clans, totems, and ancestral groups
            </p>
          </div>
          <Button asChild size="lg">
            <Link href="/clans/new">+ Add Clan</Link>
          </Button>
        </div>

        <Input
          className="mb-6 h-11"
          placeholder="Search clans, totems, ethnic groups..."
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-40 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : clans.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <p className="mb-4 text-5xl">🦁</p>
            <p className="mb-2 text-lg">No clans found</p>
            <Button asChild className="text-primary" variant="link">
              <Link href="/clans/new">Add the first clan →</Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            {clans.map((clan) => (
              <Link
                key={clan.id}
                className="group block"
                href={`/clans/${clan.id}`}
              >
                <Card className="h-full border-border transition-colors hover:border-primary/40">
                  <CardContent className="p-5">
                    <div className="mb-3 flex items-start justify-between">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-xl">
                        {clan.totem ? "🦁" : "🌍"}
                      </div>
                      {clan.isVerified && (
                        <span className="rounded border border-emerald-200 bg-emerald-100 px-1.5 py-0.5 text-xs text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400">
                          ✓
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-bold text-foreground transition-colors group-hover:text-primary">
                      {clan.name}
                    </h3>
                    {clan.alternateName && (
                      <p className="text-sm text-primary/80">
                        {clan.alternateName}
                      </p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {clan.totem && (
                        <span className="rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-xs text-primary">
                          Totem: {clan.totem}
                        </span>
                      )}
                      {clan.ethnicGroup && (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                          {clan.ethnicGroup}
                        </span>
                      )}
                      {clan.originCountry && (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                          🌍 {clan.originCountry}
                        </span>
                      )}
                    </div>
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

"use client";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import Link from "next/link";

import { Button } from "@/src/components/ui/button";
import { Card, CardContent } from "@/src/components/ui/card";
import { Input } from "@/src/components/ui/input";
import {
  formatPersonDisplayName,
  getPersonInitials,
} from "@/src/lib/personDisplayName";
import { apiGetData } from "@/src/lib/api-fetch";
import { queryKeys } from "@/src/lib/query-keys";

interface Person {
  id: number;
  firstName: string;
  middleName?: string;
  lastName: string;
  maidenName?: string;
  nickname?: string;
  gender: string;
  birthDate?: string;
  aliveStatus: string;
  photoUrl?: string;
  tribeEthnicity?: string;
  originCountry?: string;
}

function genderChipClass(gender: string) {
  if (gender === "male")
    return "bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300";
  if (gender === "female")
    return "bg-pink-100 text-pink-800 dark:bg-pink-950/50 dark:text-pink-300";

  return "bg-muted text-muted-foreground";
}

export default function PersonsPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);

    return () => clearTimeout(t);
  }, [search]);

  const { data, isPending } = useQuery({
    queryKey: queryKeys.persons.directory({
      search: debouncedSearch,
      limit: 40,
    }),
    queryFn: () =>
      apiGetData<{ persons: Person[]; total: number }>(
        `/api/persons?search=${encodeURIComponent(debouncedSearch)}&limit=40`,
      ),
  });

  const persons = data?.persons ?? [];
  const total = data?.total ?? 0;
  const loading = isPending;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-bold text-primary">
              People Directory
            </h1>
            <p className="mt-1 text-muted-foreground">
              {total} people in the database
            </p>
          </div>
          <Button asChild size="lg">
            <Link href="/persons/new">+ Add Person</Link>
          </Button>
        </div>

        <Input
          className="mb-6 h-11"
          placeholder="Search by name..."
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {loading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-48 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : persons.length === 0 ? (
          <div className="py-16 text-center">
            <p className="mb-4 text-lg text-muted-foreground">
              No people found
            </p>
            <Button asChild className="text-primary" variant="link">
              <Link href="/persons/new">Add the first person →</Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {persons.map((p) => (
              <Link
                key={p.id}
                className="group block"
                href={`/persons/${p.id}`}
              >
                <Card className="h-full border-border transition-colors hover:border-primary/40">
                  <CardContent className="flex flex-col items-center gap-3 p-4">
                    <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-muted text-2xl font-bold text-primary">
                      {p.photoUrl ? (
                        <img
                          alt=""
                          className="h-full w-full object-cover"
                          src={p.photoUrl}
                        />
                      ) : (
                        getPersonInitials(p)
                      )}
                    </div>
                    <div className="text-center">
                      <p
                        className="line-clamp-3 font-semibold leading-tight text-foreground transition-colors group-hover:text-primary"
                        title={formatPersonDisplayName(p)}
                      >
                        {formatPersonDisplayName(p)}
                      </p>
                      <div className="mt-2 flex flex-wrap justify-center gap-1">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs ${genderChipClass(p.gender)}`}
                        >
                          {p.gender}
                        </span>
                        {p.aliveStatus === "deceased" && (
                          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                            †
                          </span>
                        )}
                      </div>
                      {p.tribeEthnicity && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {p.tribeEthnicity}
                        </p>
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

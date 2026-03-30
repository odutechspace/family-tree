"use client";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import Link from "next/link";

import { Button } from "@/src/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/card";
import {
  formatPersonDisplayName,
  getPersonInitials,
} from "@/src/lib/personDisplayName";
import { apiGetData } from "@/src/lib/api-fetch";
import { queryKeys } from "@/src/lib/query-keys";

interface Clan {
  id: number;
  name: string;
  alternateName?: string;
  totem?: string;
  praisePoem?: string;
  originRegion?: string;
  originCountry?: string;
  ethnicGroup?: string;
  history?: string;
  isVerified: boolean;
}
interface Person {
  id: number;
  firstName: string;
  middleName?: string;
  lastName: string;
  maidenName?: string;
  nickname?: string;
  gender: string;
  aliveStatus: string;
}

function genderAvatar(gender: string) {
  if (gender === "male")
    return "bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300";
  if (gender === "female")
    return "bg-pink-100 text-pink-800 dark:bg-pink-950/50 dark:text-pink-300";

  return "bg-muted text-muted-foreground";
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-border bg-muted px-2.5 py-1 text-xs text-muted-foreground">
      {children}
    </span>
  );
}

export default function ClanDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data, isPending } = useQuery({
    queryKey: queryKeys.clans.detail(id ?? ""),
    queryFn: () =>
      apiGetData<{ clan: Clan; members: Person[] }>(`/api/clans/${id}`),
    enabled: !!id,
  });

  const clan = data?.clan ?? null;
  const members = data?.members ?? [];
  const loading = isPending;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        Loading...
      </div>
    );
  }
  if (!clan) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-destructive">
        Clan not found.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8 text-foreground">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-center gap-3">
          <Button asChild size="sm" variant="ghost">
            <Link href="/clans">← Clans</Link>
          </Button>
        </div>

        <div className="mb-6 rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 to-card p-8">
          <div className="flex items-start gap-6">
            <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary/15 text-4xl">
              🦁
            </div>
            <div className="flex-1">
              <div className="mb-1 flex items-center gap-2">
                <h1 className="text-3xl font-bold text-primary">{clan.name}</h1>
                {clan.isVerified && (
                  <span className="rounded-full border border-emerald-200 bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400">
                    ✓ Verified
                  </span>
                )}
              </div>
              {clan.alternateName && (
                <p className="mb-3 text-lg text-primary/80">
                  {clan.alternateName}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {clan.totem && <Badge>Totem: {clan.totem}</Badge>}
                {clan.ethnicGroup && <Badge>{clan.ethnicGroup}</Badge>}
                {clan.originCountry && (
                  <Badge>
                    🌍 {clan.originRegion ? `${clan.originRegion}, ` : ""}
                    {clan.originCountry}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {clan.praisePoem && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="mb-4 font-semibold text-primary">
                    Praise Poem / Izibongo / Oriki
                  </h2>
                  <p className="font-serif text-lg italic leading-relaxed text-foreground/90 whitespace-pre-wrap">
                    {clan.praisePoem}
                  </p>
                </CardContent>
              </Card>
            )}
            {clan.history && (
              <Card>
                <CardContent className="p-6">
                  <h2 className="mb-4 font-semibold text-primary">
                    Clan History
                  </h2>
                  <p className="leading-relaxed text-foreground whitespace-pre-wrap">
                    {clan.history}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          <div>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base text-primary">
                  Members ({members.length})
                </CardTitle>
                <Button
                  asChild
                  className="h-auto p-0 text-xs text-muted-foreground"
                  variant="link"
                >
                  <Link href={`/persons?clanId=${id}`}>View all</Link>
                </Button>
              </CardHeader>
              <CardContent>
                {members.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No members yet. Add people with this clan assigned.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {members.slice(0, 10).map((p) => (
                      <Link
                        key={p.id}
                        className="flex min-w-0 items-center gap-2 transition-colors hover:text-primary"
                        href={`/persons/${p.id}`}
                        title={formatPersonDisplayName(p)}
                      >
                        <div
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${genderAvatar(p.gender)}`}
                        >
                          {getPersonInitials(p)}
                        </div>
                        <span className="truncate text-sm text-foreground">
                          {formatPersonDisplayName(p)}
                        </span>
                        {p.aliveStatus === "deceased" && (
                          <span className="ml-auto text-xs text-muted-foreground">
                            †
                          </span>
                        )}
                      </Link>
                    ))}
                    {members.length > 10 && (
                      <p className="text-xs text-muted-foreground">
                        +{members.length - 10} more
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

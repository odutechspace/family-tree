"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { Textarea } from "@/src/components/ui/textarea";

export default function NewClanPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    alternateName: "",
    totem: "",
    praisePoem: "",
    originRegion: "",
    originCountry: "",
    ethnicGroup: "",
    history: "",
    logoUrl: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/clans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Failed.");
        return;
      }
      router.push(`/clans/${data.data.clan.id}`);
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 py-8 text-foreground">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/clans">← Clans</Link>
          </Button>
          <h1 className="text-2xl font-bold text-primary">Add Clan / Lineage</h1>
        </div>
        {error && (
          <div className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-primary">Identity</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label>Clan Name *</Label>
                <Input
                  required
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="e.g. Zulu, Akan, Kikuyu, Zazzau"
                />
              </div>
              <div className="space-y-2">
                <Label>Alternate / Praise Name</Label>
                <Input
                  value={form.alternateName}
                  onChange={(e) => set("alternateName", e.target.value)}
                  placeholder="e.g. Amadlozi, Omowale"
                />
              </div>
              <div className="space-y-2">
                <Label>Totem</Label>
                <Input value={form.totem} onChange={(e) => set("totem", e.target.value)} placeholder="e.g. Lion, Elephant, Baobab" />
              </div>
              <div className="space-y-2">
                <Label>Ethnic Group</Label>
                <Input
                  value={form.ethnicGroup}
                  onChange={(e) => set("ethnicGroup", e.target.value)}
                  placeholder="e.g. Yoruba, Nguni, Bantu"
                />
              </div>
              <div className="space-y-2">
                <Label>Origin Region</Label>
                <Input
                  value={form.originRegion}
                  onChange={(e) => set("originRegion", e.target.value)}
                  placeholder="e.g. West Africa, Great Lakes"
                />
              </div>
              <div className="space-y-2">
                <Label>Origin Country</Label>
                <Input
                  value={form.originCountry}
                  onChange={(e) => set("originCountry", e.target.value)}
                  placeholder="e.g. Nigeria, Kenya, Zimbabwe"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-primary">Heritage</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Praise Poem / Izibongo / Oriki</Label>
                <Textarea
                  rows={4}
                  value={form.praisePoem}
                  onChange={(e) => set("praisePoem", e.target.value)}
                  placeholder="The clan's ancestral praise poem or oral tradition..."
                />
              </div>
              <div className="space-y-2">
                <Label>Clan History</Label>
                <Textarea
                  rows={4}
                  value={form.history}
                  onChange={(e) => set("history", e.target.value)}
                  placeholder="Historical background, migrations, notable ancestors..."
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-4">
            <Button type="submit" disabled={loading} className="flex-1" size="lg">
              {loading ? "Saving..." : "Add Clan"}
            </Button>
            <Button variant="secondary" size="lg" asChild>
              <Link href="/clans">Cancel</Link>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { Button } from "@/src/components/ui/button";
import { Card, CardContent } from "@/src/components/ui/card";
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

export default function NewTreePage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", description: "", visibility: "private" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/trees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Failed.");
        return;
      }
      router.push(`/trees/${data.data.tree.id}`);
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 py-8 text-foreground">
      <div className="mx-auto max-w-lg">
        <div className="mb-8 flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/trees">← Trees</Link>
          </Button>
          <h1 className="text-2xl font-bold text-primary">New Family Tree</h1>
        </div>
        {error && (
          <div className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>
        )}

        <Card>
          <CardContent className="space-y-5 p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label>Tree Name *</Label>
                <Input
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Osei Family Tree"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Describe this family lineage..."
                />
              </div>
              <div className="space-y-2">
                <Label>Visibility</Label>
                <Select value={form.visibility} onValueChange={(v) => setForm((f) => ({ ...f, visibility: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private">Private — only you</SelectItem>
                    <SelectItem value="family_only">Family Only — people in the tree</SelectItem>
                    <SelectItem value="public">Public — anyone can view</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" disabled={loading} className="w-full" size="lg">
                {loading ? "Creating..." : "Create Family Tree"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

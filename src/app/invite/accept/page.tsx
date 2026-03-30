"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

import { Button } from "@/src/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/card";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { formatPersonDisplayName } from "@/src/lib/personDisplayName";

interface InviteDetails {
  invite: {
    id: number;
    email: string;
    message?: string;
    treeId: number;
    personId?: number;
    expiresAt: string;
  };
  tree: { id: number; name: string } | null;
  person: {
    id: number;
    firstName: string;
    middleName?: string;
    lastName: string;
    maidenName?: string;
    nickname?: string;
  } | null;
  hasAccount: boolean;
}

function AcceptInvitePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [details, setDetails] = useState<InviteDetails | null>(null);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setLoadError("Invalid invite link — token is missing.");
      setLoading(false);

      return;
    }
    fetch(`/api/invites/accept?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) {
          setLoadError(d.message || "This invite is no longer valid.");
        } else {
          setDetails(d.data);
        }
      })
      .catch(() => setLoadError("Could not load invite details."))
      .finally(() => setLoading(false));
  }, [token]);

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!details) return;

    if (!details.hasAccount) {
      if (!name.trim()) {
        setError("Please enter your name.");

        return;
      }
      if (password.length < 6) {
        setError("Password must be at least 6 characters.");

        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match.");

        return;
      }
    }

    setSubmitting(true);
    setError("");

    const res = await fetch("/api/invites/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        name: name.trim() || undefined,
        password: password || undefined,
      }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.message || "Something went wrong.");
      setSubmitting(false);

      return;
    }

    setSuccess(true);
    setTimeout(() => router.push(`/trees/${data.data.treeId}`), 1500);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        Loading invite...
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center">
        <p className="text-5xl">🔒</p>
        <h2 className="text-xl font-bold text-destructive">{loadError}</h2>
        <Button asChild variant="secondary">
          <Link href="/">Go Home</Link>
        </Button>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background text-center">
        <p className="text-5xl">🌳</p>
        <h2 className="text-xl font-bold text-primary">
          Welcome to the family tree!
        </h2>
        <p className="text-muted-foreground">Redirecting you now...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12 text-foreground">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <p className="mb-3 text-5xl">🌳</p>
          <h1 className="text-2xl font-bold text-primary">
            You&apos;re invited!
          </h1>
          {details?.tree && (
            <p className="mt-2 text-muted-foreground">
              Join the{" "}
              <strong className="text-foreground">{details.tree.name}</strong>{" "}
              family tree on My Ukoo
            </p>
          )}
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-primary">
              {details?.hasAccount
                ? "Confirm your identity"
                : "Create your account"}
            </CardTitle>
            {details?.invite.message && (
              <p className="mt-1 border-l-2 border-primary pl-3 text-sm italic text-muted-foreground">
                &ldquo;{details.invite.message}&rdquo;
              </p>
            )}
          </CardHeader>
          <CardContent>
            {details?.person && (
              <div className="mb-4 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-primary">
                You&apos;ve been identified as{" "}
                <strong>{formatPersonDisplayName(details.person)}</strong> in the
                tree. Your profile will be linked automatically.
              </div>
            )}

            {error && (
              <div className="mb-4 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            {details?.hasAccount ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  An account already exists for{" "}
                  <strong>{details.invite.email}</strong>. Please log in first,
                  then return to this link.
                </p>
                <Button asChild className="w-full">
                  <Link
                    href={`/auth/login?redirect=/invite/accept?token=${encodeURIComponent(token)}`}
                  >
                    Log In to Accept →
                  </Link>
                </Button>
                <Button
                  className="w-full"
                  disabled={submitting}
                  variant="outline"
                  onClick={() =>
                    handleAccept({
                      preventDefault: () => {},
                    } as React.FormEvent)
                  }
                >
                  {submitting
                    ? "Accepting..."
                    : "I'm already logged in — Accept Now"}
                </Button>
              </div>
            ) : (
              <form className="space-y-4" onSubmit={handleAccept}>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    Email (from invite)
                  </Label>
                  <Input
                    disabled
                    className="bg-muted"
                    value={details?.invite.email || ""}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Your Name *</Label>
                  <Input
                    required
                    placeholder="How you'd like to be known"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Password *</Label>
                  <Input
                    required
                    placeholder="At least 6 characters"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Confirm Password *</Label>
                  <Input
                    required
                    placeholder="Repeat your password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
                <Button
                  className="w-full"
                  disabled={submitting}
                  size="lg"
                  type="submit"
                >
                  {submitting ? "Joining..." : "Create Account & Join Tree →"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Invite expires{" "}
          {details?.invite.expiresAt
            ? new Date(details.invite.expiresAt).toLocaleDateString()
            : "soon"}
          .
        </p>
      </div>
    </div>
  );
}

export default function AcceptInvitePageWrapper() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
          Loading...
        </div>
      }
    >
      <AcceptInvitePage />
    </Suspense>
  );
}

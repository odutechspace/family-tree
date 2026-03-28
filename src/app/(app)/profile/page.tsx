"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useAuth, type AuthUser } from "@/src/hooks/useAuth";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";

interface PersonOption {
  id: number;
  firstName: string;
  lastName: string;
  nickname?: string;
}

function formatPerson(p: PersonOption) {
  const nick = p.nickname ? ` "${p.nickname}"` : "";
  return `${p.firstName}${nick} ${p.lastName}`;
}

const NONE = "__none__";

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading, refetch, logout } = useAuth();

  const [profile, setProfile] = useState<AuthUser | null>(null);
  const [loadError, setLoadError] = useState("");

  const [name, setName] = useState("");
  const [profilePhotoUrl, setProfilePhotoUrl] = useState("");
  const [linkedPersonId, setLinkedPersonId] = useState<string>("");

  const [personSearch, setPersonSearch] = useState("");
  const [personOptions, setPersonOptions] = useState<PersonOption[]>([]);
  const [linkedLabel, setLinkedLabel] = useState<string | null>(null);

  const [profileMsg, setProfileMsg] = useState("");
  const [profileErr, setProfileErr] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwdMsg, setPwdMsg] = useState("");
  const [pwdErr, setPwdErr] = useState("");
  const [savingPwd, setSavingPwd] = useState(false);

  const loadProfile = useCallback(async () => {
    setLoadError("");
    try {
      const res = await fetch("/api/users/me");
      const data = await res.json();
      if (!res.ok) {
        setLoadError(data.message || "Could not load profile.");
        return;
      }
      const u = data.data?.user as AuthUser;
      setProfile(u);
      setName(u.name);
      setProfilePhotoUrl(u.profilePhotoUrl || "");
      setLinkedPersonId(u.linkedPersonId != null ? String(u.linkedPersonId) : "");
    } catch {
      setLoadError("Could not load profile.");
    }
  }, []);

  useEffect(() => {
    if (!loading && !user) router.push("/auth/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (user) loadProfile();
  }, [user, loadProfile]);

  useEffect(() => {
    const id = profile?.linkedPersonId;
    if (id == null) {
      setLinkedLabel(null);
      return;
    }
    fetch(`/api/persons/${id}`)
      .then(r => r.json())
      .then(data => {
        const p = data.data?.person as PersonOption | undefined;
        setLinkedLabel(p ? formatPerson(p) : `Person #${id}`);
      })
      .catch(() => setLinkedLabel(`Person #${id}`));
  }, [profile?.linkedPersonId]);

  useEffect(() => {
    const t = setTimeout(() => {
      fetch(`/api/persons?search=${encodeURIComponent(personSearch)}&limit=30`)
        .then(r => r.json())
        .then(data => setPersonOptions(data.data?.persons || []))
        .catch(() => setPersonOptions([]));
    }, 250);
    return () => clearTimeout(t);
  }, [personSearch]);

  useEffect(() => {
    const id = profile?.linkedPersonId;
    if (id == null) return;
    fetch(`/api/persons/${id}`)
      .then(r => r.json())
      .then(data => {
        const p = data.data?.person as PersonOption | undefined;
        if (!p) return;
        setPersonOptions(prev => (prev.some(x => x.id === p.id) ? prev : [p, ...prev]));
      })
      .catch(() => {});
  }, [profile?.linkedPersonId]);

  const onSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileErr("");
    setProfileMsg("");
    setSavingProfile(true);
    try {
      const body: Record<string, unknown> = { name: name.trim() };
      body.profilePhotoUrl = profilePhotoUrl.trim() || null;
      if (linkedPersonId === "") {
        body.linkedPersonId = null;
      } else {
        const n = Number(linkedPersonId);
        if (Number.isNaN(n)) {
          setProfileErr("Choose a valid person or clear the link.");
          setSavingProfile(false);
          return;
        }
        body.linkedPersonId = n;
      }
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setProfileErr(data.message || "Update failed.");
      } else {
        setProfileMsg("Profile saved.");
        await refetch();
        await loadProfile();
      }
    } catch {
      setProfileErr("Something went wrong.");
    } finally {
      setSavingProfile(false);
    }
  };

  const onChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdErr("");
    setPwdMsg("");
    if (newPassword !== confirmPassword) {
      setPwdErr("New passwords do not match.");
      return;
    }
    setSavingPwd(true);
    try {
      const res = await fetch("/api/users/me/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPwdErr(data.message || "Could not update password.");
      } else {
        setPwdMsg("Password updated.");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch {
      setPwdErr("Something went wrong.");
    } finally {
      setSavingPwd(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen px-4 py-16 max-w-lg mx-auto">
        <p className="text-destructive mb-4">{loadError}</p>
        <Link href="/dashboard" className="text-primary font-medium hover:underline">
          Back to dashboard
        </Link>
      </div>
    );
  }

  const selectValue = linkedPersonId === "" ? NONE : linkedPersonId;

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-primary">Your profile</h1>
            <p className="text-muted-foreground text-sm mt-1">Manage how you appear in My Ukoo</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/dashboard">Dashboard</Link>
            </Button>
            <Button variant="ghost" className="text-destructive hover:text-destructive" onClick={() => logout()}>
              Sign out
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>Your sign-in identity (read-only fields).</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-3 text-sm">
              <div className="flex justify-between gap-4 border-b border-border pb-3">
                <dt className="text-muted-foreground">Email</dt>
                <dd className="text-foreground text-right break-all">{profile?.email}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-border pb-3">
                <dt className="text-muted-foreground">Role</dt>
                <dd className="text-foreground capitalize">{profile?.role}</dd>
              </div>
              {profile?.createdAt && (
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Member since</dt>
                  <dd className="text-foreground">
                    {new Date(profile.createdAt).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </dd>
                </div>
              )}
            </dl>
            <p className="text-muted-foreground text-xs mt-4">
              Email cannot be changed here. Contact support if you need to update it.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Public profile</CardTitle>
            <CardDescription>These details are shown across the app.</CardDescription>
          </CardHeader>
          <CardContent>
            {profileErr && (
              <div className="mb-4 p-3 rounded-md border border-destructive/50 bg-destructive/10 text-destructive text-sm">
                {profileErr}
              </div>
            )}
            {profileMsg && (
              <div className="mb-4 p-3 rounded-md border border-primary/30 bg-primary/10 text-sm text-foreground">
                {profileMsg}
              </div>
            )}
            <form onSubmit={onSaveProfile} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="displayName">Display name</Label>
                <Input
                  id="displayName"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  autoComplete="name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="photoUrl">Profile photo URL</Label>
                <Input
                  id="photoUrl"
                  type="url"
                  value={profilePhotoUrl}
                  onChange={e => setProfilePhotoUrl(e.target.value)}
                  placeholder="https://…"
                />
                <p className="text-muted-foreground text-xs">Leave empty to remove your photo.</p>
              </div>
              <div className="space-y-2">
                <Label>Link to your person record</Label>
                <p className="text-muted-foreground text-xs">
                  Connect your account to a person in the directory so features can treat you as that family member.
                </p>
                {linkedLabel && linkedPersonId && (
                  <p className="text-primary text-sm">
                    Currently linked: <span className="text-foreground font-medium">{linkedLabel}</span>
                  </p>
                )}
                <Input
                  value={personSearch}
                  onChange={e => setPersonSearch(e.target.value)}
                  placeholder="Search people by name…"
                  className="mb-2"
                />
                <Select
                  value={selectValue}
                  onValueChange={v => setLinkedPersonId(v === NONE ? "" : v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose a person" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>— Not linked —</SelectItem>
                    {personOptions.map(p => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {formatPerson(p)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" disabled={savingProfile}>
                {savingProfile ? "Saving…" : "Save profile"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Change password</CardTitle>
          </CardHeader>
          <CardContent>
            {pwdErr && (
              <div className="mb-4 p-3 rounded-md border border-destructive/50 bg-destructive/10 text-destructive text-sm">
                {pwdErr}
              </div>
            )}
            {pwdMsg && (
              <div className="mb-4 p-3 rounded-md border border-primary/30 bg-primary/10 text-sm text-foreground">
                {pwdMsg}
              </div>
            )}
            <form onSubmit={onChangePassword} className="space-y-4 max-w-md">
              <div className="space-y-2">
                <Label htmlFor="currentPwd">Current password</Label>
                <Input
                  id="currentPwd"
                  type="password"
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPwd">New password</Label>
                <Input
                  id="newPwd"
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPwd">Confirm new password</Label>
                <Input
                  id="confirmPwd"
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                />
              </div>
              <Button type="submit" variant="secondary" disabled={savingPwd}>
                {savingPwd ? "Updating…" : "Update password"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

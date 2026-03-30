"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useAuth } from "@/src/hooks/useAuth";
import { Button } from "@/src/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/card";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import { formatPersonDisplayName } from "@/src/lib/personDisplayName";
import { apiGetData } from "@/src/lib/api-fetch";
import { queryKeys } from "@/src/lib/query-keys";

interface PersonOption {
  id: number;
  firstName: string;
  middleName?: string;
  lastName: string;
  maidenName?: string;
  nickname?: string;
}

const NONE = "__none__";

export default function ProfilePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, loading, refetch, logout } = useAuth();

  const [name, setName] = useState("");
  const [profilePhotoUrl, setProfilePhotoUrl] = useState("");
  const [linkedPersonId, setLinkedPersonId] = useState<string>("");
  const [personSearch, setPersonSearch] = useState("");
  const [debouncedPersonSearch, setDebouncedPersonSearch] = useState("");

  const [profileMsg, setProfileMsg] = useState("");
  const [profileErr, setProfileErr] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwdMsg, setPwdMsg] = useState("");
  const [pwdErr, setPwdErr] = useState("");

  useEffect(() => {
    if (!loading && !user) router.push("/auth/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    setName(user.name);
    setProfilePhotoUrl(user.profilePhotoUrl || "");
    setLinkedPersonId(
      user.linkedPersonId != null ? String(user.linkedPersonId) : "",
    );
  }, [user]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedPersonSearch(personSearch), 250);
    return () => clearTimeout(t);
  }, [personSearch]);

  const { data: searchData } = useQuery({
    queryKey: queryKeys.persons.directory({
      search: debouncedPersonSearch,
      limit: 30,
    }),
    queryFn: () =>
      apiGetData<{ persons: PersonOption[] }>(
        `/api/persons?search=${encodeURIComponent(debouncedPersonSearch)}&limit=30`,
      ),
  });

  const linkedNumeric =
    linkedPersonId === "" ? null : Number(linkedPersonId);
  const linkedValid =
    linkedNumeric != null && !Number.isNaN(linkedNumeric);

  const { data: linkedBundle } = useQuery({
    queryKey: queryKeys.persons.detail(linkedNumeric ?? 0),
    queryFn: () =>
      apiGetData<{ person: PersonOption }>(`/api/persons/${linkedNumeric}`),
    enabled: linkedValid,
  });

  const linkedLabel = linkedValid
    ? linkedBundle?.person
      ? formatPersonDisplayName(linkedBundle.person)
      : `Person #${linkedNumeric}`
    : null;

  const personOptions = useMemo(() => {
    const fromSearch = searchData?.persons ?? [];
    const p = linkedBundle?.person;
    if (!p) return fromSearch;
    return fromSearch.some((x) => x.id === p.id) ? fromSearch : [p, ...fromSearch];
  }, [searchData, linkedBundle]);

  const saveProfileMutation = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Update failed.");
      }
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.auth.me });
      await refetch();
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (body: { currentPassword: string; newPassword: string }) => {
      const res = await fetch("/api/users/me/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Could not update password.");
      }
      return data;
    },
  });

  const onSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileErr("");
    setProfileMsg("");
    const body: Record<string, unknown> = { name: name.trim() };
    body.profilePhotoUrl = profilePhotoUrl.trim() || null;
    if (linkedPersonId === "") {
      body.linkedPersonId = null;
    } else {
      const n = Number(linkedPersonId);
      if (Number.isNaN(n)) {
        setProfileErr("Choose a valid person or clear the link.");
        return;
      }
      body.linkedPersonId = n;
    }
    saveProfileMutation.mutate(body, {
      onSuccess: () => setProfileMsg("Profile saved."),
      onError: (err) =>
        setProfileErr(err instanceof Error ? err.message : "Update failed."),
    });
  };

  const onChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPwdErr("");
    setPwdMsg("");
    if (newPassword !== confirmPassword) {
      setPwdErr("New passwords do not match.");
      return;
    }
    changePasswordMutation.mutate(
      { currentPassword, newPassword },
      {
        onSuccess: () => {
          setPwdMsg("Password updated.");
          setCurrentPassword("");
          setNewPassword("");
          setConfirmPassword("");
        },
        onError: (err) =>
          setPwdErr(
            err instanceof Error ? err.message : "Something went wrong.",
          ),
      },
    );
  };

  const savingProfile = saveProfileMutation.isPending;
  const savingPwd = changePasswordMutation.isPending;

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Loading…
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
            <p className="text-muted-foreground text-sm mt-1">
              Manage how you appear in My Ukoo
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/dashboard">Dashboard</Link>
            </Button>
            <Button
              className="text-destructive hover:text-destructive"
              variant="ghost"
              onClick={() => logout()}
            >
              Sign out
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>
              Your sign-in identity (read-only fields).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-3 text-sm">
              <div className="flex justify-between gap-4 border-b border-border pb-3">
                <dt className="text-muted-foreground">Email</dt>
                <dd className="text-foreground text-right break-all">
                  {user?.email}
                </dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-border pb-3">
                <dt className="text-muted-foreground">Role</dt>
                <dd className="text-foreground capitalize">{user?.role}</dd>
              </div>
              {user?.createdAt && (
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Member since</dt>
                  <dd className="text-foreground">
                    {new Date(user.createdAt).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </dd>
                </div>
              )}
            </dl>
            <p className="text-muted-foreground text-xs mt-4">
              Email cannot be changed here. Contact support if you need to
              update it.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Public profile</CardTitle>
            <CardDescription>
              These details are shown across the app.
            </CardDescription>
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
            <form className="space-y-4" onSubmit={onSaveProfile}>
              <div className="space-y-2">
                <Label htmlFor="displayName">Display name</Label>
                <Input
                  required
                  autoComplete="name"
                  id="displayName"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="photoUrl">Profile photo URL</Label>
                <Input
                  id="photoUrl"
                  placeholder="https://…"
                  type="url"
                  value={profilePhotoUrl}
                  onChange={(e) => setProfilePhotoUrl(e.target.value)}
                />
                <p className="text-muted-foreground text-xs">
                  Leave empty to remove your photo.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Link to your person record</Label>
                <p className="text-muted-foreground text-xs">
                  Connect your account to a person in the directory so features
                  can treat you as that family member.
                </p>
                {linkedLabel && linkedPersonId && (
                  <p className="text-primary text-sm">
                    Currently linked:{" "}
                    <span className="text-foreground font-medium">
                      {linkedLabel}
                    </span>
                  </p>
                )}
                <Input
                  className="mb-2"
                  placeholder="Search people by name…"
                  value={personSearch}
                  onChange={(e) => setPersonSearch(e.target.value)}
                />
                <Select
                  value={selectValue}
                  onValueChange={(v) => setLinkedPersonId(v === NONE ? "" : v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose a person" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>— Not linked —</SelectItem>
                    {personOptions.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {formatPersonDisplayName(p)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button disabled={savingProfile} type="submit">
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
            <form className="space-y-4 max-w-md" onSubmit={onChangePassword}>
              <div className="space-y-2">
                <Label htmlFor="currentPwd">Current password</Label>
                <Input
                  autoComplete="current-password"
                  id="currentPwd"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPwd">New password</Label>
                <Input
                  autoComplete="new-password"
                  id="newPwd"
                  minLength={8}
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPwd">Confirm new password</Label>
                <Input
                  autoComplete="new-password"
                  id="confirmPwd"
                  minLength={8}
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              <Button disabled={savingPwd} type="submit" variant="secondary">
                {savingPwd ? "Updating…" : "Update password"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

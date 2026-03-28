"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useAuth, type AuthUser } from "@/src/hooks/useAuth";

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
    if (!loading && !user) router.push("/login");
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
      <div className="min-h-screen bg-stone-950 flex items-center justify-center text-stone-400">
        Loading…
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-stone-950 text-white px-4 py-16 max-w-lg mx-auto">
        <p className="text-red-400 mb-4">{loadError}</p>
        <Link href="/dashboard" className="text-amber-400 hover:text-amber-300">
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-950 text-white py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-amber-400">Your profile</h1>
            <p className="text-stone-400 text-sm mt-1">Manage how you appear in My Ukoo</p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/dashboard"
              className="px-4 py-2 rounded-lg border border-stone-600 text-stone-300 hover:bg-stone-800 text-sm transition"
            >
              Dashboard
            </Link>
            <button
              type="button"
              onClick={() => logout()}
              className="px-4 py-2 rounded-lg text-red-400 hover:bg-red-950/40 text-sm transition"
            >
              Sign out
            </button>
          </div>
        </div>

        {/* Account summary */}
        <section className="bg-stone-900/60 border border-stone-800 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Account</h2>
          <dl className="grid gap-3 text-sm">
            <div className="flex justify-between gap-4 border-b border-stone-800 pb-3">
              <dt className="text-stone-500">Email</dt>
              <dd className="text-stone-200 text-right break-all">{profile?.email}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-stone-800 pb-3">
              <dt className="text-stone-500">Role</dt>
              <dd className="text-stone-200 capitalize">{profile?.role}</dd>
            </div>
            {profile?.createdAt && (
              <div className="flex justify-between gap-4">
                <dt className="text-stone-500">Member since</dt>
                <dd className="text-stone-200">
                  {new Date(profile.createdAt).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </dd>
              </div>
            )}
          </dl>
          <p className="text-stone-500 text-xs mt-4">
            Email cannot be changed here. Contact support if you need to update it.
          </p>
        </section>

        {/* Editable profile */}
        <section className="bg-stone-900/60 border border-stone-800 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Public profile</h2>
          {profileErr && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-300 text-sm">
              {profileErr}
            </div>
          )}
          {profileMsg && (
            <div className="mb-4 p-3 bg-emerald-900/30 border border-emerald-800 rounded-lg text-emerald-300 text-sm">
              {profileMsg}
            </div>
          )}
          <form onSubmit={onSaveProfile} className="space-y-4">
            <div>
              <label className="block text-stone-400 text-sm font-medium mb-1.5">Display name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg bg-stone-950 border border-stone-700 text-white focus:ring-2 focus:ring-amber-600 focus:border-transparent outline-none"
                required
                autoComplete="name"
              />
            </div>
            <div>
              <label className="block text-stone-400 text-sm font-medium mb-1.5">Profile photo URL</label>
              <input
                type="url"
                value={profilePhotoUrl}
                onChange={e => setProfilePhotoUrl(e.target.value)}
                placeholder="https://…"
                className="w-full px-4 py-2.5 rounded-lg bg-stone-950 border border-stone-700 text-white focus:ring-2 focus:ring-amber-600 focus:border-transparent outline-none"
              />
              <p className="text-stone-500 text-xs mt-1">Leave empty to remove your photo.</p>
            </div>
            <div>
              <label className="block text-stone-400 text-sm font-medium mb-1.5">Link to your person record</label>
              <p className="text-stone-500 text-xs mb-2">
                Connect your account to a person in the directory so features can treat you as that family member.
              </p>
              {linkedLabel && linkedPersonId && (
                <p className="text-amber-400/90 text-sm mb-2">
                  Currently linked: <span className="text-white">{linkedLabel}</span>
                </p>
              )}
              <input
                type="text"
                value={personSearch}
                onChange={e => setPersonSearch(e.target.value)}
                placeholder="Search people by name…"
                className="w-full px-4 py-2.5 rounded-lg bg-stone-950 border border-stone-700 text-white focus:ring-2 focus:ring-amber-600 focus:border-transparent outline-none mb-2"
              />
              <select
                value={linkedPersonId}
                onChange={e => setLinkedPersonId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg bg-stone-950 border border-stone-700 text-white focus:ring-2 focus:ring-amber-600 outline-none"
              >
                <option value="">— Not linked —</option>
                {personOptions.map(p => (
                  <option key={p.id} value={p.id}>
                    {formatPerson(p)}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={savingProfile}
              className="w-full sm:w-auto px-6 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-semibold rounded-lg transition"
            >
              {savingProfile ? "Saving…" : "Save profile"}
            </button>
          </form>
        </section>

        {/* Password */}
        <section className="bg-stone-900/60 border border-stone-800 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Change password</h2>
          {pwdErr && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-300 text-sm">{pwdErr}</div>
          )}
          {pwdMsg && (
            <div className="mb-4 p-3 bg-emerald-900/30 border border-emerald-800 rounded-lg text-emerald-300 text-sm">
              {pwdMsg}
            </div>
          )}
          <form onSubmit={onChangePassword} className="space-y-4 max-w-md">
            <div>
              <label className="block text-stone-400 text-sm font-medium mb-1.5">Current password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg bg-stone-950 border border-stone-700 text-white focus:ring-2 focus:ring-amber-600 outline-none"
                autoComplete="current-password"
              />
            </div>
            <div>
              <label className="block text-stone-400 text-sm font-medium mb-1.5">New password</label>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg bg-stone-950 border border-stone-700 text-white focus:ring-2 focus:ring-amber-600 outline-none"
                autoComplete="new-password"
                minLength={8}
              />
            </div>
            <div>
              <label className="block text-stone-400 text-sm font-medium mb-1.5">Confirm new password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg bg-stone-950 border border-stone-700 text-white focus:ring-2 focus:ring-amber-600 outline-none"
                autoComplete="new-password"
                minLength={8}
              />
            </div>
            <button
              type="submit"
              disabled={savingPwd}
              className="px-6 py-2.5 bg-stone-700 hover:bg-stone-600 disabled:opacity-50 text-white font-semibold rounded-lg transition"
            >
              {savingPwd ? "Updating…" : "Update password"}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}

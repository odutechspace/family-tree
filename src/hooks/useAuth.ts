"use client";
import { useState, useEffect, useCallback } from "react";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: string;
  profilePhotoUrl?: string | null;
  linkedPersonId?: number | null;
  createdAt?: string;
  updatedAt?: string;
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch("/api/users/me");
      if (res.ok) {
        const data = await res.json();
        setUser(data.data?.user || null);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const logout = async () => {
    await fetch("/api/auth/signout", { method: "POST" });
    setUser(null);
    window.location.href = "/auth/login";
  };

  return { user, loading, refetch: fetchUser, logout };
}

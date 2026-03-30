"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/src/lib/query-keys";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: string;
  profilePhotoUrl?: string | null;
  linkedPersonId?: number | null;
  /** Full structured name when linked to a Person, else matches `name`. */
  displayName?: string;
  /** Two-letter avatar initials. */
  initials?: string;
  createdAt?: string;
  updatedAt?: string;
}

async function fetchAuthUser(): Promise<AuthUser | null> {
  const res = await fetch("/api/users/me");

  if (!res.ok) return null;
  const json = (await res.json()) as { data?: { user?: AuthUser } };

  return json.data?.user ?? null;
}

export function useAuth() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: fetchAuthUser,
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await fetch("/api/auth/signout", { method: "POST" });
    },
    onSettled: () => {
      queryClient.removeQueries({ queryKey: queryKeys.auth.me });
      window.location.href = "/auth/login";
    },
  });

  return {
    user: query.data ?? null,
    loading: query.isPending,
    refetch: () => query.refetch(),
    logout: () => {
      logoutMutation.mutate();
    },
  };
}

"use client";

import { useState } from "react";

import { getInitialsFromDisplayName } from "@/src/lib/personDisplayName";
import { cn } from "@/src/lib/utils";

export interface UserAvatarProps {
  src?: string | null;
  name?: string | null;
  initials?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  alt?: string;
}

const SIZE_CLASS = {
  sm: "h-5 w-5 text-[10px]",
  md: "h-8 w-8 text-xs",
  lg: "h-12 w-12 text-sm",
  xl: "h-20 w-20 text-lg",
} as const;

function resolveInitials(name?: string | null, initials?: string | null) {
  if (initials?.trim()) {
    const letters = [...initials.trim()]
      .filter((c) => /\p{L}/u.test(c))
      .slice(0, 2)
      .join("")
      .toUpperCase();
    return letters || "?";
  }
  return getInitialsFromDisplayName(name || "");
}

export function UserAvatar({
  src,
  name,
  initials,
  size = "md",
  className,
  alt,
}: UserAvatarProps) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src) && !failed;
  const label = alt || name || "User avatar";

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent text-accent-foreground font-bold",
        SIZE_CLASS[size],
        className,
      )}
      title={name || undefined}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt={label}
          className="h-full w-full object-cover"
          src={src!}
          onError={() => setFailed(true)}
        />
      ) : (
        <span aria-hidden>{resolveInitials(name, initials)}</span>
      )}
    </span>
  );
}

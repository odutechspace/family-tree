"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";

import { Logo } from "@/src/components/icons";
import { ThemeSwitch } from "@/src/components/theme-switch";
import { Button } from "@/src/components/ui/button";
import XPBar from "@/src/components/gamification/XPBar";
import { cn } from "@/src/lib/utils";

interface AuthUser {
  id: number;
  name: string;
  role: string;
}

const NAV_LINKS = [
  { href: "/persons", label: "People" },
  { href: "/trees", label: "Trees" },
  { href: "/clans", label: "Clans" },
  { href: "/merge-requests", label: "Merges" },
  { href: "/profile", label: "Profile" },
];

export function Navbar() {
  const pathname = usePathname();
  const { resolvedTheme } = useTheme();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    fetch("/api/users/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setUser(data?.data?.user || null))
      .catch(() => setUser(null));
  }, [pathname]);

  const logout = async () => {
    await fetch("/api/auth/signout", { method: "POST" });
    setUser(null);
    window.location.href = "/";
  };

  if (pathname.startsWith("/auth/")) return null;

  const navClass = (href: string, exact?: boolean) =>
    cn(
      "px-3 py-1.5 rounded-lg text-sm font-medium transition",
      exact
        ? pathname === href
          ? "bg-primary/15 text-primary"
          : "text-muted-foreground hover:text-foreground hover:bg-muted"
        : pathname.startsWith(href)
          ? "bg-primary/15 text-primary"
          : "text-muted-foreground hover:text-foreground hover:bg-muted",
    );

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-14">
        <Link
          className="flex items-center gap-2.5 shrink-0"
          href={user ? "/dashboard" : "/"}
        >
          <Logo
            className="h-8 w-8 shrink-0"
            size={32}
            variant={resolvedTheme === "light" ? "default" : "onDark"}
          />
          <span className="flex flex-col leading-tight">
            <span className="text-primary font-bold text-lg sm:text-xl tracking-tight">
              My Ukoo
            </span>
            <span className="hidden sm:inline text-muted-foreground text-[10px]">
              Discover · Connect · Preserve
            </span>
          </span>
        </Link>

        {user && (
          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                className={navClass(link.href)}
                href={link.href}
              >
                {link.label}
              </Link>
            ))}
            {user.role === "admin" && (
              <Link className={navClass("/admin", true)} href="/admin">
                Admin
              </Link>
            )}
          </div>
        )}

        <div className="flex items-center gap-2">
          <ThemeSwitch />
          {user ? (
            <div className="flex items-center gap-2">
              <XPBar compact />
              <Button
                asChild
                className="hidden sm:flex"
                size="sm"
                variant="secondary"
              >
                <Link href="/profile" title="Your profile">
                  <span className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-accent-foreground text-xs font-bold">
                      {user.name[0]}
                    </span>
                    <span className="max-w-[100px] truncate">
                      {user.name.split(" ")[0]}
                    </span>
                  </span>
                </Link>
              </Button>
              <Button
                aria-label="Open menu"
                className="md:hidden"
                size="icon"
                variant="ghost"
                onClick={() => setMenuOpen(!menuOpen)}
              >
                ☰
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button asChild size="sm" variant="ghost">
                <Link href="/auth/login">Sign In</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/auth/register">Get Started</Link>
              </Button>
            </div>
          )}
        </div>
      </div>

      {menuOpen && user && (
        <div className="md:hidden border-t border-border bg-background px-4 py-3 space-y-1">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              className={cn(
                "block px-3 py-2 rounded-lg text-sm",
                navClass(link.href),
              )}
              href={link.href}
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          {user.role === "admin" && (
            <Link
              className="block px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground"
              href="/admin"
              onClick={() => setMenuOpen(false)}
            >
              Admin
            </Link>
          )}
          <Link
            className="block px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground"
            href="/achievements"
            onClick={() => setMenuOpen(false)}
          >
            Achievements
          </Link>
          <Link
            className="block px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground"
            href="/quests"
            onClick={() => setMenuOpen(false)}
          >
            Quests
          </Link>
          <Link
            className="block px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground"
            href="/leaderboard"
            onClick={() => setMenuOpen(false)}
          >
            Leaderboard
          </Link>
          <Link
            className="block px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground"
            href="/dashboard"
            onClick={() => setMenuOpen(false)}
          >
            Dashboard
          </Link>
          <button
            className="block w-full text-left px-3 py-2 rounded-lg text-sm text-destructive hover:text-destructive/90"
            type="button"
            onClick={logout}
          >
            Sign Out
          </button>
        </div>
      )}
    </nav>
  );
}

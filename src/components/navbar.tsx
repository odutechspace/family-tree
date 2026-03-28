"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { Logo } from "@/src/components/icons";
import { motionTransition } from "@/src/components/motion";
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
  const reduce = useReducedMotion();
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
      "rounded-lg px-3 py-1.5 text-sm font-medium transition",
      exact
        ? pathname === href
          ? "bg-primary/15 text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
        : pathname.startsWith(href)
          ? "bg-primary/15 text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
    );

  return (
    <nav className="fixed left-0 right-0 top-0 z-50 border-b border-border bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <Link href={user ? "/dashboard" : "/"} className="flex shrink-0 items-center gap-2.5">
          <Logo className="h-8 w-8 shrink-0" size={32} variant={resolvedTheme === "light" ? "default" : "onDark"} />
          <span className="flex flex-col leading-tight">
            <span className="text-lg font-bold tracking-tight text-primary sm:text-xl">My Ukoo</span>
            <span className="hidden text-[10px] text-muted-foreground sm:inline">Discover · Connect · Preserve</span>
          </span>
        </Link>

        {user && (
          <div className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className={navClass(link.href)}>
                {link.label}
              </Link>
            ))}
            {user.role === "admin" && (
              <Link href="/admin" className={navClass("/admin", true)}>
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
              <Button variant="secondary" size="sm" className="hidden sm:flex" asChild>
                <Link href="/profile" title="Your profile">
                  <span className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground">
                      {user.name[0]}
                    </span>
                    <span className="max-w-[100px] truncate">{user.name.split(" ")[0]}</span>
                  </span>
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setMenuOpen(!menuOpen)}
                aria-expanded={menuOpen}
                aria-label={menuOpen ? "Close menu" : "Open menu"}
              >
                ☰
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/auth/login">Sign In</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/auth/register">Get Started</Link>
              </Button>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence initial={false}>
        {menuOpen && user && (
          <motion.div
            key="nav-mobile-panel"
            className="border-t border-border bg-background md:hidden"
            initial={reduce ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={reduce ? undefined : { opacity: 0, height: 0 }}
            transition={reduce ? { duration: 0 } : { ...motionTransition, duration: 0.28 }}
            style={{ overflow: "hidden" }}
          >
            <div className="space-y-1 px-4 py-3">
              {NAV_LINKS.map((link, i) => (
                <motion.div
                  key={link.href}
                  initial={reduce ? false : { opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    ...motionTransition,
                    duration: 0.2,
                    delay: reduce ? 0 : i * 0.04,
                  }}
                >
                  <Link
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className={cn("block rounded-lg px-3 py-2 text-sm", navClass(link.href))}
                  >
                    {link.label}
                  </Link>
                </motion.div>
              ))}
              {user.role === "admin" && (
                <Link
                  href="/admin"
                  onClick={() => setMenuOpen(false)}
                  className="block rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
                >
                  Admin
                </Link>
              )}
              <Link
                href="/achievements"
                onClick={() => setMenuOpen(false)}
                className="block rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
              >
                Achievements
              </Link>
              <Link
                href="/quests"
                onClick={() => setMenuOpen(false)}
                className="block rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
              >
                Quests
              </Link>
              <Link
                href="/leaderboard"
                onClick={() => setMenuOpen(false)}
                className="block rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
              >
                Leaderboard
              </Link>
              <Link
                href="/dashboard"
                onClick={() => setMenuOpen(false)}
                className="block rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
              >
                Dashboard
              </Link>
              <button
                type="button"
                onClick={logout}
                className="block w-full rounded-lg px-3 py-2 text-left text-sm text-destructive hover:text-destructive/90"
              >
                Sign Out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}

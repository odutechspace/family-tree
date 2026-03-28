"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeSwitch } from "@/src/components/theme-switch";
import XPBar from "@/src/components/gamification/XPBar";

interface AuthUser { id: number; name: string; role: string; }

const NAV_LINKS = [
  { href: "/persons", label: "People" },
  { href: "/trees", label: "Trees" },
  { href: "/clans", label: "Clans" },
  { href: "/merge-requests", label: "Merges" },
  { href: "/profile", label: "Profile" },
];

export function Navbar() {
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    fetch("/api/users/me")
      .then(r => r.ok ? r.json() : null)
      .then(data => setUser(data?.data?.user || null))
      .catch(() => setUser(null));
  }, [pathname]);

  const logout = async () => {
    await fetch("/api/auth/signout", { method: "POST" });
    setUser(null);
    window.location.href = "/";
  };

  // Hide navbar on auth pages
  if (pathname === "/login" || pathname === "/register") return null;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-stone-900/90 backdrop-blur border-b border-stone-800">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-14">
        {/* Logo */}
        <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-2">
          <span className="text-amber-400 font-bold text-xl tracking-tight">My Ukoo</span>
          <span className="hidden sm:inline text-stone-500 text-xs">Discover · Connect · Preserve</span>
        </Link>

        {/* Desktop nav */}
        {user && (
          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map(link => (
              <Link key={link.href} href={link.href}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${pathname.startsWith(link.href) ? "bg-amber-900/40 text-amber-400" : "text-stone-400 hover:text-white hover:bg-stone-800"}`}>
                {link.label}
              </Link>
            ))}
            {user.role === "admin" && (
              <Link href="/admin"
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${pathname === "/admin" ? "bg-amber-900/40 text-amber-400" : "text-stone-400 hover:text-white hover:bg-stone-800"}`}>
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
              <Link
                href="/profile"
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-stone-800 hover:bg-stone-700 rounded-lg transition"
                title="Your profile"
              >
                <div className="w-5 h-5 rounded-full bg-amber-700 flex items-center justify-center text-xs font-bold text-white">
                  {user.name[0]}
                </div>
                <span className="text-stone-300 text-sm">{user.name.split(" ")[0]}</span>
              </Link>
              <button onClick={() => setMenuOpen(!menuOpen)}
                className="md:hidden p-2 text-stone-400 hover:text-white transition">
                ☰
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login" className="px-3 py-1.5 text-stone-400 hover:text-white text-sm transition">Sign In</Link>
              <Link href="/register" className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium rounded-lg transition">
                Get Started
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && user && (
        <div className="md:hidden bg-stone-900 border-t border-stone-800 px-4 py-3 space-y-1">
          {NAV_LINKS.map(link => (
            <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)}
              className={`block px-3 py-2 rounded-lg text-sm ${pathname.startsWith(link.href) ? "bg-amber-900/40 text-amber-400" : "text-stone-400 hover:text-white"}`}>
              {link.label}
            </Link>
          ))}
          {user.role === "admin" && (
            <Link href="/admin" onClick={() => setMenuOpen(false)} className="block px-3 py-2 rounded-lg text-sm text-stone-400 hover:text-white">Admin</Link>
          )}
          <Link href="/achievements" onClick={() => setMenuOpen(false)} className="block px-3 py-2 rounded-lg text-sm text-stone-400 hover:text-white">🏆 Achievements</Link>
          <Link href="/quests" onClick={() => setMenuOpen(false)} className="block px-3 py-2 rounded-lg text-sm text-stone-400 hover:text-white">🎯 Quests</Link>
          <Link href="/leaderboard" onClick={() => setMenuOpen(false)} className="block px-3 py-2 rounded-lg text-sm text-stone-400 hover:text-white">🏅 Leaderboard</Link>
          <Link href="/dashboard" onClick={() => setMenuOpen(false)} className="block px-3 py-2 rounded-lg text-sm text-stone-400 hover:text-white">Dashboard</Link>
          <button onClick={logout} className="block w-full text-left px-3 py-2 rounded-lg text-sm text-red-400 hover:text-red-300">Sign Out</button>
        </div>
      )}
    </nav>
  );
}

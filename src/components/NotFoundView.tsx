"use client";

import Link from "next/link";

import { Logo } from "@/src/components/icons";
import { FadeIn, StaggerItem, StaggerList } from "@/src/components/motion";
import { Button } from "@/src/components/ui/button";

export type NotFoundLink = {
  href: string;
  label: string;
};

type NotFoundViewProps = {
  code?: string;
  title?: string;
  description?: string;
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  links?: NotFoundLink[];
  showBrand?: boolean;
};

const DEFAULT_LINKS: NotFoundLink[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/trees", label: "Trees" },
  { href: "/persons", label: "People" },
];

export function NotFoundView({
  code = "404",
  title = "This page isn't on the tree",
  description = "The link may be broken, or the page may have moved. Let's get you back to your family.",
  primaryHref = "/dashboard",
  primaryLabel = "Go to Dashboard",
  secondaryHref = "/",
  secondaryLabel = "Home",
  links = DEFAULT_LINKS,
  showBrand = true,
}: NotFoundViewProps) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-4 py-16 text-foreground">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_hsl(var(--primary)/0.14),_transparent_55%),radial-gradient(ellipse_at_bottom_right,_hsl(var(--accent)/0.12),_transparent_50%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 top-1/4 h-72 w-72 rounded-full bg-primary/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 bottom-1/4 h-64 w-64 rounded-full bg-accent/15 blur-3xl"
      />

      <div className="relative z-10 flex w-full max-w-lg flex-col items-center text-center">
        <FadeIn>
          {showBrand && (
            <Link className="mb-10 inline-block" href="/">
              <Logo priority variant="wordmark" />
            </Link>
          )}
        </FadeIn>

        <FadeIn delay={0.06}>
          <p className="mb-3 font-mono text-6xl font-semibold tracking-tight text-primary/80 sm:text-7xl">
            {code}
          </p>
        </FadeIn>

        <FadeIn delay={0.1}>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {title}
          </h1>
          <p className="mt-3 text-base text-muted-foreground sm:text-lg">
            {description}
          </p>
        </FadeIn>

        <FadeIn className="mt-8 flex w-full flex-col gap-3 sm:flex-row sm:justify-center" delay={0.16}>
          <Button asChild className="sm:min-w-[10rem]" size="lg">
            <Link href={primaryHref}>{primaryLabel}</Link>
          </Button>
          {secondaryHref && secondaryLabel && (
            <Button asChild size="lg" variant="outline">
              <Link href={secondaryHref}>{secondaryLabel}</Link>
            </Button>
          )}
        </FadeIn>

        {links.length > 0 && (
          <StaggerList className="mt-10 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm">
            {links.map((link) => (
              <StaggerItem key={link.href}>
                <Link
                  className="text-muted-foreground underline-offset-4 transition-colors hover:text-primary hover:underline"
                  href={link.href}
                >
                  {link.label}
                </Link>
              </StaggerItem>
            ))}
          </StaggerList>
        )}
      </div>
    </div>
  );
}

import Image from "next/image";
import Link from "next/link";

import { Logo } from "@/src/components/icons";
import { Button } from "@/src/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/card";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <section className="relative min-h-screen flex items-center justify-center">
        <div className="absolute inset-0 z-0">
          <Image
            alt="family"
            className="w-full h-full object-cover opacity-25"
            height={2000}
            src="/images/people.png"
            width={2000}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background" />
        </div>

        <div className="relative z-10 flex flex-col items-center text-center max-w-3xl px-4 pt-16">
          <div className="mb-6 drop-shadow-lg">
            <Logo priority variant="wordmark" />
          </div>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-sm font-medium mb-8">
            Built for African families
          </div>

          <h1 className="text-5xl md:text-7xl font-bold mb-4 leading-tight">
            <span className="text-foreground">Discover Your</span>
            <br />
            <span className="text-primary">Ukoo</span>
          </h1>

          <p className="text-muted-foreground text-xl md:text-2xl mb-3 font-light">
            Discover · Connect · Preserve
          </p>
          <p className="text-muted-foreground text-base md:text-lg mb-10 max-w-xl">
            Build your African family tree with support for polygamous unions,
            clans, totems, oral histories, lobola records, and multi-family
            merges.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              asChild
              className="text-lg px-8 py-6 h-auto shadow-lg shadow-primary/20"
              size="lg"
            >
              <Link href="/auth/register">Start Your Family Tree</Link>
            </Button>
            <Button
              asChild
              className="text-lg px-8 py-6 h-auto"
              size="lg"
              variant="outline"
            >
              <Link href="/auth/login">Sign In</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-primary mb-3">
            Everything Your Family Needs
          </h2>
          <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
            Ukoo is designed with African family structures in mind — from
            multi-generational clans to diaspora connections.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              description="Add every family member with detailed profiles: birth/death dates, tribal identity, totem, origin village, and oral history."
              icon="👥"
              title="People Management"
            />
            <FeatureCard
              description="Model marriages, polygamous unions (co-wives), lobola ceremonies, levirate unions, adoptions, step-parents, and guardians."
              icon="💍"
              title="Rich Relationship Types"
            />
            <FeatureCard
              description="Interactive ReactFlow-based tree viewer showing all generations, colour-coded by gender, with couple nodes for each union."
              icon="🌳"
              title="Visual Family Trees"
            />
            <FeatureCard
              description="Register clans with their totems, praise poems (izibongo/oriki), ethnic groups, and shared ancestral histories."
              icon="🦁"
              title="Clans & Totems"
            />
            <FeatureCard
              description="When two families discover they are related, anyone can request a merge. Admins review and approve, automatically re-linking all records."
              icon="🔗"
              title="History Merging"
            />
            <FeatureCard
              description="Record naming ceremonies, initiations, lobola, graduations, migrations, burials, and custom events — with approximate dates for elders."
              icon="🕯️"
              title="Life Events & Ceremonies"
            />
          </div>
        </div>
      </section>

      <section className="py-16 px-4 bg-muted/40">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-primary mb-12">
            How It Works
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                step: "1",
                title: "Register",
                desc: "Create your free account",
              },
              {
                step: "2",
                title: "Add People",
                desc: "Build your family roster with rich profiles",
              },
              {
                step: "3",
                title: "Link Relations",
                desc: "Connect parents, children, spouses, and clans",
              },
              {
                step: "4",
                title: "Merge & Grow",
                desc: "Find and connect with related family trees",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="flex flex-col items-center text-center gap-3"
              >
                <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground font-bold text-lg flex items-center justify-center">
                  {item.step}
                </div>
                <h3 className="font-semibold text-foreground">{item.title}</h3>
                <p className="text-muted-foreground text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-4 text-center">
        <h2 className="text-3xl font-bold text-primary mb-4">
          Your Roots Are Waiting
        </h2>
        <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
          Every story deserves to be remembered. Start preserving your
          family&apos;s history today.
        </p>
        <Button asChild className="text-lg px-10 py-6 h-auto" size="lg">
          <Link href="/auth/register">Begin for Free →</Link>
        </Button>
      </section>

      <footer className="border-t border-border py-8 px-4 text-center text-muted-foreground text-sm">
        <p>
          © {new Date().getFullYear()} My Ukoo — Powered by{" "}
          <a
            className="text-primary hover:underline"
            href="https://odutechspace.com"
          >
            Odutechspace
          </a>
        </p>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <Card className="transition-colors hover:border-primary/35">
      <CardHeader>
        <div className="text-3xl mb-1">{icon}</div>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription className="text-base leading-relaxed">
          {description}
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

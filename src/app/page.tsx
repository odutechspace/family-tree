import Image from "next/image";
import Link from "next/link";

import { Logo } from "@/src/components/icons";

export default function Home() {
  return (
    <div className="min-h-screen bg-stone-950 text-white overflow-x-hidden">
      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center">
        <div className="absolute inset-0 z-0">
          <Image alt="family" className="w-full h-full object-cover opacity-30" height={2000} src="/images/people.png" width={2000} />
          <div className="absolute inset-0 bg-gradient-to-b from-stone-950/60 via-stone-950/50 to-stone-950" />
        </div>

        <div className="relative z-10 flex flex-col items-center text-center max-w-3xl px-4 pt-16">
          <div className="mb-6 drop-shadow-lg">
            <Logo priority variant="wordmark" />
          </div>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-amber-900/30 border border-amber-700/50 rounded-full text-amber-400 text-sm font-medium mb-8">
            🌍 Built for African families
          </div>

          <h1 className="text-5xl md:text-7xl font-bold mb-4 leading-tight">
            <span className="text-white">Discover Your</span>
            <br />
            <span className="text-amber-400">Ukoo</span>
          </h1>

          <p className="text-stone-300 text-xl md:text-2xl mb-3 font-light">
            Discover · Connect · Preserve
          </p>
          <p className="text-stone-400 text-base md:text-lg mb-10 max-w-xl">
            Build your African family tree with support for polygamous unions, clans, totems, oral histories, lobola records, and multi-family merges.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/auth/register"
              className="px-8 py-4 bg-amber-600 hover:bg-amber-500 text-white text-lg font-semibold rounded-xl transition shadow-lg shadow-amber-900/30">
              Start Your Family Tree
            </Link>
            <Link href="/auth/login"
              className="px-8 py-4 bg-stone-800 hover:bg-stone-700 border border-stone-700 text-white text-lg font-medium rounded-xl transition">
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-amber-400 mb-3">Everything Your Family Needs</h2>
          <p className="text-stone-400 text-center mb-12 max-w-2xl mx-auto">Ukoo is designed with African family structures in mind — from multi-generational clans to diaspora connections.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard icon="👥" title="People Management" description="Add every family member with detailed profiles: birth/death dates, tribal identity, totem, origin village, and oral history." />
            <FeatureCard icon="💍" title="Rich Relationship Types" description="Model marriages, polygamous unions (co-wives), lobola ceremonies, levirate unions, adoptions, step-parents, and guardians." />
            <FeatureCard icon="🌳" title="Visual Family Trees" description="Interactive ReactFlow-based tree viewer showing all generations, colour-coded by gender, with couple nodes for each union." />
            <FeatureCard icon="🦁" title="Clans & Totems" description="Register clans with their totems, praise poems (izibongo/oriki), ethnic groups, and shared ancestral histories." />
            <FeatureCard icon="🔗" title="History Merging" description="When two families discover they are related, anyone can request a merge. Admins review and approve, automatically re-linking all records." />
            <FeatureCard icon="🕯️" title="Life Events & Ceremonies" description="Record naming ceremonies, initiations, lobola, graduations, migrations, burials, and custom events — with approximate dates for elders." />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 px-4 bg-stone-900/50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-amber-400 mb-12">How It Works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { step: "1", title: "Register", desc: "Create your free account" },
              { step: "2", title: "Add People", desc: "Build your family roster with rich profiles" },
              { step: "3", title: "Link Relations", desc: "Connect parents, children, spouses, and clans" },
              { step: "4", title: "Merge & Grow", desc: "Find and connect with related family trees" },
            ].map(item => (
              <div key={item.step} className="flex flex-col items-center text-center gap-3">
                <div className="w-12 h-12 rounded-full bg-amber-600 text-white font-bold text-lg flex items-center justify-center">
                  {item.step}
                </div>
                <h3 className="font-semibold text-white">{item.title}</h3>
                <p className="text-stone-400 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 text-center">
        <h2 className="text-3xl font-bold text-amber-400 mb-4">Your Roots Are Waiting</h2>
        <p className="text-stone-400 mb-8 max-w-xl mx-auto">Every story deserves to be remembered. Start preserving your family's history today.</p>
        <Link href="/auth/register" className="px-10 py-4 bg-amber-600 hover:bg-amber-500 text-white text-lg font-semibold rounded-xl transition">
          Begin for Free →
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-stone-800 py-8 px-4 text-center text-stone-500 text-sm">
        <p>© {new Date().getFullYear()} My Ukoo — Powered by <a href="https://odutechspace.com" className="text-amber-600 hover:text-amber-500">Odutechspace</a></p>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="bg-stone-800/60 border border-stone-700 rounded-xl p-6 hover:border-amber-700/50 transition">
      <div className="text-3xl mb-4">{icon}</div>
      <h3 className="text-white font-semibold text-lg mb-2">{title}</h3>
      <p className="text-stone-400 text-sm leading-relaxed">{description}</p>
    </div>
  );
}

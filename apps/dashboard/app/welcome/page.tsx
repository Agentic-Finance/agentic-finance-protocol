'use client';
import React from 'react';
import { HeroSection } from '../components/landing/HeroSection';
import { FeatureCards } from '../components/landing/FeatureCards';
import { StatsBar } from '../components/landing/StatsBar';
import Link from 'next/link';

export default function WelcomePage() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--pp-bg-primary)' }}>
      <HeroSection />
      <StatsBar />
      <FeatureCards />

      {/* Footer */}
      <footer className="border-t border-white/[0.06] py-8 px-4 text-center">
        <p className="text-xs text-slate-600">
          Agentic Finance &middot; Tempo L1 &middot; Chain 42431
        </p>
        <div className="flex items-center justify-center gap-4 mt-3">
          <Link href="/docs" className="text-xs text-slate-500 hover:text-white transition-colors">Docs</Link>
          <Link href="/developers" className="text-xs text-slate-500 hover:text-white transition-colors">Developers</Link>
          <Link href="/community" className="text-xs text-slate-500 hover:text-white transition-colors">Community</Link>
        </div>
      </footer>
    </div>
  );
}

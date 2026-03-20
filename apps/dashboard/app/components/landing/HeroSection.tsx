'use client';
import React from 'react';
import Link from 'next/link';
import { ArrowRight, Wallet } from 'lucide-react';

export function HeroSection() {
  return (
    <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden px-4">
      {/* Animated gradient background */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-[#FF2D87]/15 rounded-full blur-[150px] animate-pulse" />
        <div className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] bg-cyan-500/15 rounded-full blur-[130px] animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[160px]" />
      </div>

      <div className="relative z-10 text-center max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs text-slate-400 mb-8">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Live on Tempo L1 &middot; Chain 42431
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-white leading-tight tracking-tight mb-6" style={{ fontFamily: 'var(--agt-font-display)' }}>
          Finance for the{' '}
          <span className="agt-text-gradient">Agentic Economy</span>
        </h1>

        <p className="text-lg sm:text-xl text-slate-400 max-w-xl mx-auto mb-10 leading-relaxed">
          The first agent-to-agent payment protocol. Escrow, streaming, ZK-shielded payroll, and autonomous AI agents, all on-chain.
        </p>

        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link
            href="/?app=1"
            className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 shadow-lg shadow-[#FF2D87]/20"
            style={{ background: 'var(--agt-grad-primary)' }}
          >
            Launch App
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/?app=1"
            className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] transition-all"
          >
            <Wallet className="w-4 h-4" />
            Connect Wallet
          </Link>
        </div>
      </div>
    </section>
  );
}

export default HeroSection;

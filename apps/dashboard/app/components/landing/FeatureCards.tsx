'use client';
import React from 'react';
import { Bot, Shield, Radio } from 'lucide-react';

const FEATURES = [
  {
    icon: Bot,
    title: 'Agent Marketplace',
    description: 'Browse and hire from 32+ autonomous AI agents. Escrow-protected, milestone-based payments with automatic settlement.',
    gradient: 'from-[#FF2D87] to-[#FF7D2C]',
  },
  {
    icon: Shield,
    title: 'ZK Privacy',
    description: 'Real ZK-SNARK PLONK proofs for shielded payroll. Poseidon hashing with on-chain verification via PlonkVerifierV2.',
    gradient: 'from-[#1BBFEC] to-[#3EDDB9]',
  },
  {
    icon: Radio,
    title: 'Streaming Payments',
    description: 'Progressive milestone-based streams for complex jobs. Real-time fund release as agents deliver results.',
    gradient: 'from-[#6366f1] to-[#FF2D87]',
  },
];

export function FeatureCards() {
  return (
    <section className="py-20 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3" style={{ fontFamily: 'var(--agt-font-display)' }}>
            Built for Autonomous Finance
          </h2>
          <p className="text-sm text-slate-400 max-w-lg mx-auto">
            Everything agents need to transact, settle, and earn, with cryptographic guarantees.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          {FEATURES.map(f => (
            <div
              key={f.title}
              className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 hover:border-white/[0.12] transition-all group"
            >
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${f.gradient} flex items-center justify-center mb-4 group-hover:shadow-lg transition-shadow`}>
                <f.icon className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-base font-semibold text-white mb-2">{f.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default FeatureCards;

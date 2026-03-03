"use client";

import { Activity } from "lucide-react";
import Link from "next/link";
import SubPageNav from "../components/SubPageNav";
import ShieldPanel from "../components/ShieldPanel";

export default function ShieldPage() {
  return (
    <div className="min-h-screen bg-[#0B1120]">
      <SubPageNav />
      <div className="max-w-7xl mx-auto space-y-8 p-4 sm:p-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-6">
          <div className="flex items-center gap-4">
            <Link href="/cortex" className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-slate-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </Link>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">SHIELD</h1>
              <p className="text-sm text-slate-400 font-medium">ZK-Privacy Layer for the Agentic Economy</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg text-xs font-bold border border-emerald-500/20 uppercase tracking-widest">
            <Activity className="w-3.5 h-3.5" />
            <span>System Live</span>
          </div>
        </div>
      </div>

      {/* Reuse shared ShieldPanel component */}
      <ShieldPanel />
    </div>
  );
}

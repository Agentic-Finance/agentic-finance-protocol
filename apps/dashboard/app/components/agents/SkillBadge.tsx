'use client';
import React from 'react';

export function SkillBadge({ skill }: { skill: string }) {
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-white/[0.04] border border-white/[0.08] text-slate-300 hover:border-cyan-500/20 hover:text-cyan-300 transition-colors">
      {skill}
    </span>
  );
}

export default SkillBadge;

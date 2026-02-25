'use client';

import { useState, useEffect } from 'react';

interface ReputationBadgeProps {
  wallet?: string;
  score?: number;          // 0-10000 (if pre-loaded)
  tier?: number;           // 0-4 (if pre-loaded)
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  showBreakdown?: boolean;
}

const TIER_CONFIG = [
  { label: 'Newcomer', color: '#64748b', bgColor: 'rgba(100,116,139,0.15)', emoji: '\u{1F331}' },
  { label: 'Rising',   color: '#3b82f6', bgColor: 'rgba(59,130,246,0.15)',  emoji: '\u{2B50}' },
  { label: 'Trusted',  color: '#10b981', bgColor: 'rgba(16,185,129,0.15)',  emoji: '\u{1F6E1}\uFE0F' },
  { label: 'Elite',    color: '#a855f7', bgColor: 'rgba(168,85,247,0.15)',  emoji: '\u{1F48E}' },
  { label: 'Legend',   color: '#f59e0b', bgColor: 'rgba(245,158,11,0.15)',  emoji: '\u{1F451}' },
] as const;

function getScoreColor(score: number): string {
  if (score >= 9500) return '#f59e0b'; // gold
  if (score >= 8000) return '#a855f7'; // purple
  if (score >= 6000) return '#10b981'; // green
  if (score >= 3000) return '#3b82f6'; // blue
  return '#64748b'; // gray
}

function getCircleSize(size: 'sm' | 'md' | 'lg'): number {
  if (size === 'sm') return 36;
  if (size === 'lg') return 64;
  return 48;
}

export default function ReputationBadge({
  wallet,
  score: preloadedScore,
  tier: preloadedTier,
  size = 'md',
  showLabel = true,
  showBreakdown = false,
}: ReputationBadgeProps) {
  const [score, setScore] = useState(preloadedScore ?? 0);
  const [tier, setTier] = useState(preloadedTier ?? 0);
  const [breakdown, setBreakdown] = useState<any>(null);
  const [loading, setLoading] = useState(!preloadedScore && !!wallet);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    if (preloadedScore !== undefined) {
      setScore(preloadedScore);
      setTier(preloadedTier ?? 0);
      return;
    }
    if (!wallet) return;

    fetch(`/api/reputation?wallet=${wallet}`)
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setScore(data.reputation.compositeScore);
          setTier(data.reputation.tier);
          if (showBreakdown) setBreakdown(data.breakdown);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [wallet, preloadedScore, preloadedTier, showBreakdown]);

  const displayScore = (score / 100).toFixed(1);
  const tierConfig = TIER_CONFIG[tier] ?? TIER_CONFIG[0];
  const circleSize = getCircleSize(size);
  const strokeWidth = size === 'sm' ? 3 : size === 'lg' ? 5 : 4;
  const radius = (circleSize - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 10000) * circumference;
  const color = getScoreColor(score);

  if (loading) {
    return (
      <div style={{
        width: circleSize, height: circleSize,
        borderRadius: '50%', background: 'rgba(255,255,255,0.05)',
        animation: 'pulse 1.5s infinite',
      }} />
    );
  }

  return (
    <div
      style={{ display: 'inline-flex', alignItems: 'center', gap: size === 'sm' ? 6 : 8, position: 'relative' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Circular Score Badge */}
      <div style={{ position: 'relative', width: circleSize, height: circleSize }}>
        <svg width={circleSize} height={circleSize} style={{ transform: 'rotate(-90deg)' }}>
          {/* Background circle */}
          <circle
            cx={circleSize / 2} cy={circleSize / 2} r={radius}
            fill="transparent" stroke="rgba(255,255,255,0.08)"
            strokeWidth={strokeWidth}
          />
          {/* Progress arc */}
          <circle
            cx={circleSize / 2} cy={circleSize / 2} r={radius}
            fill="transparent" stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={circumference - progress}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.8s ease' }}
          />
        </svg>
        {/* Center text */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: size === 'sm' ? '10px' : size === 'lg' ? '16px' : '12px',
          fontWeight: 800, color: '#fff',
          letterSpacing: '-0.02em',
        }}>
          {displayScore}
        </div>
      </div>

      {/* Tier Label */}
      {showLabel && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <span style={{
            fontSize: size === 'sm' ? '10px' : '11px',
            fontWeight: 700, color,
            letterSpacing: '0.03em', textTransform: 'uppercase',
          }}>
            {tierConfig.emoji} {tierConfig.label}
          </span>
          <span style={{ fontSize: '10px', color: '#64748b' }}>
            Reputation Score
          </span>
        </div>
      )}

      {/* Hover Tooltip */}
      {hovered && showBreakdown && breakdown && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, marginTop: 8,
          background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 12, padding: '12px 16px', minWidth: 220,
          zIndex: 50, boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#fff', marginBottom: 8 }}>
            Score Breakdown
          </div>
          {[
            { label: 'On-chain Rating', value: `${breakdown.onChainRating?.nexusAvgRating ?? 0}/5`, weight: '30%' },
            { label: 'User Reviews', value: `${(breakdown.offChainRating?.avgRating ?? 0).toFixed(1)}/5`, weight: '25%' },
            { label: 'Completion Rate', value: `${breakdown.completionRate?.rate ?? 0}%`, weight: '25%' },
            { label: 'Proof Reliability', value: `${breakdown.proofReliability?.reliability ?? 100}%`, weight: '20%' },
          ].map((item) => (
            <div key={item.label} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              fontSize: '11px', padding: '3px 0', borderBottom: '1px solid rgba(255,255,255,0.05)',
            }}>
              <span style={{ color: '#94a3b8' }}>{item.label} <span style={{ color: '#475569' }}>({item.weight})</span></span>
              <span style={{ color: '#fff', fontWeight: 600 }}>{item.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

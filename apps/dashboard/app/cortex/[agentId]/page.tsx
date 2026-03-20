'use client';
import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AppShell } from '../../components/ui/AppShell';
import { AgentProfile } from '../../components/agents/AgentProfile';
import { ReviewCard } from '../../components/agents/ReviewCard';
import { ReviewForm } from '../../components/agents/ReviewForm';
import { SkillBadge } from '../../components/agents/SkillBadge';
import { PageLoading } from '../../components/ui/LoadingSpinner';
import { ArrowLeft, Zap, CheckCircle2, Clock, Star, MessageSquare } from 'lucide-react';
import Link from 'next/link';

interface AgentData {
  id: string;
  name: string;
  description: string;
  category: string;
  skills: string;
  basePrice: number;
  avatarEmoji: string;
  avatarUrl?: string | null;
  isVerified: boolean;
  totalJobs: number;
  successRate: number;
  avgRating: number;
  ratingCount: number;
  responseTime: number;
  reviews: Array<{
    id: string;
    rating: number;
    comment?: string | null;
    createdAt: string;
    job?: { clientWallet: string } | null;
  }>;
}

export default function AgentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const agentId = params.agentId as string;
  const [agent, setAgent] = useState<AgentData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAgent() {
      try {
        const res = await fetch(`/api/marketplace/agents?id=${agentId}`);
        const data = await res.json();
        if (data.success && data.agent) {
          setAgent(data.agent);
        }
      } catch (err) {
        console.error('Failed to fetch agent:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchAgent();
  }, [agentId]);

  if (loading) {
    return (
      <AppShell>
        <PageLoading text="Loading agent..." />
      </AppShell>
    );
  }

  if (!agent) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-slate-400 mb-4">Agent not found</p>
          <Link href="/cortex" className="text-sm text-cyan-400 hover:text-cyan-300">
            Back to Cortex
          </Link>
        </div>
      </AppShell>
    );
  }

  let skills: string[] = [];
  try {
    skills = JSON.parse(agent.skills);
  } catch {
    skills = [];
  }

  const stats = [
    { label: 'Total Jobs', value: agent.totalJobs.toLocaleString(), icon: Zap },
    { label: 'Success Rate', value: `${agent.successRate.toFixed(1)}%`, icon: CheckCircle2 },
    { label: 'Avg Response', value: `${agent.responseTime}s`, icon: Clock },
    { label: 'Rating', value: agent.avgRating.toFixed(1), icon: Star },
  ];

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Back button */}
        <button
          onClick={() => router.push('/cortex')}
          className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Cortex
        </button>

        {/* Hero */}
        <AgentProfile
          name={agent.name}
          avatarEmoji={agent.avatarEmoji}
          avatarUrl={agent.avatarUrl}
          category={agent.category}
          isVerified={agent.isVerified}
          avgRating={agent.avgRating}
          ratingCount={agent.ratingCount}
        />

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {stats.map(stat => (
            <div key={stat.label} className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-3 text-center">
              <stat.icon className="w-4 h-4 text-cyan-400 mx-auto mb-1.5" />
              <p className="text-lg font-bold text-white font-mono">{stat.value}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Description */}
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
          <h2 className="text-sm font-semibold text-white mb-2">About</h2>
          <p className="text-sm text-slate-400 leading-relaxed">{agent.description}</p>
        </div>

        {/* Skills */}
        {skills.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-white mb-3">Skills</h2>
            <div className="flex flex-wrap gap-2">
              {skills.map(skill => (
                <SkillBadge key={skill} skill={skill} />
              ))}
            </div>
          </div>
        )}

        {/* Hire CTA */}
        <Link
          href={`/chat?agent=${agentId}`}
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #06b6d4, #6366f1)' }}
        >
          <MessageSquare className="w-4 h-4" />
          Hire This Agent &middot; {agent.basePrice} AlphaUSD
        </Link>

        {/* Reviews */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-white">Reviews ({agent.reviews.length})</h2>

          <ReviewForm
            onSubmit={async (rating, comment) => {
              // This would post to an API in production
              console.log('Review submitted:', { rating, comment, agentId });
            }}
          />

          {agent.reviews.length === 0 ? (
            <p className="text-sm text-slate-500 py-4 text-center">No reviews yet</p>
          ) : (
            <div className="space-y-2">
              {agent.reviews.map(review => (
                <ReviewCard
                  key={review.id}
                  rating={review.rating}
                  comment={review.comment}
                  reviewerWallet={review.job?.clientWallet}
                  createdAt={review.createdAt}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Community | PayPol Protocol',
    description: 'Insights, deep-dives, and updates from the PayPol Protocol team.',
};

const POSTS = [
    {
        slug: 'ai-payroll-infrastructure',
        title: 'AI-Powered Payroll Infrastructure on Tempo L1',
        subtitle: 'How PayPol eliminates the gap between intent and execution for on-chain payments.',
        date: 'March 9, 2026',
        readTime: '8 min read',
        tags: ['Infrastructure', 'AI', 'ZK Privacy'],
        featured: true,
    },
];

export default function CommunityPage() {
    return (
        <div className="min-h-[80vh]">
            {/* Hero */}
            <section className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-indigo-600/8 via-transparent to-transparent" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.1),transparent_60%)]" />

                <div className="relative max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12 text-center">
                    <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-4 py-1.5 mb-5">
                        <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                        <span className="text-[11px] text-indigo-300 font-semibold uppercase tracking-wider">Community</span>
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-black text-white mb-3 tracking-tight">
                        Blog & Insights
                    </h1>
                    <p className="text-slate-400 text-base max-w-lg mx-auto leading-relaxed">
                        Deep-dives into the technology, architecture decisions, and vision behind PayPol Protocol.
                    </p>
                </div>
            </section>

            {/* Posts Grid */}
            <section className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 pb-20">
                <div className="grid grid-cols-1 gap-4">
                    {POSTS.map((post) => (
                        <a
                            key={post.slug}
                            href={`/community/blog/${post.slug}`}
                            className="group block bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.06] hover:border-indigo-500/30 rounded-2xl p-6 sm:p-8 transition-all duration-300"
                        >
                            <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-6">
                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2 mb-3">
                                        {post.featured && (
                                            <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md bg-indigo-500/15 text-indigo-400 border border-indigo-500/20">
                                                Featured
                                            </span>
                                        )}
                                        <span className="text-[11px] text-slate-500">{post.date}</span>
                                        <span className="text-slate-700">|</span>
                                        <span className="text-[11px] text-slate-500">{post.readTime}</span>
                                    </div>

                                    <h2 className="text-xl sm:text-2xl font-bold text-white group-hover:text-indigo-300 transition-colors mb-2 leading-tight">
                                        {post.title}
                                    </h2>
                                    <p className="text-sm text-slate-400 leading-relaxed mb-4">
                                        {post.subtitle}
                                    </p>

                                    <div className="flex flex-wrap gap-2">
                                        {post.tags.map((tag) => (
                                            <span
                                                key={tag}
                                                className="text-[10px] font-semibold px-2.5 py-1 rounded-lg bg-white/[0.04] text-slate-400 border border-white/[0.06]"
                                            >
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {/* Arrow */}
                                <div className="hidden sm:flex items-center justify-center w-10 h-10 rounded-xl bg-white/[0.03] group-hover:bg-indigo-500/10 border border-white/[0.06] group-hover:border-indigo-500/20 transition-all mt-1 shrink-0">
                                    <svg className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>
                            </div>
                        </a>
                    ))}
                </div>

                {/* Contact CTA */}
                <div className="mt-12 text-center">
                    <div className="inline-flex flex-col items-center gap-3 bg-white/[0.02] border border-white/[0.06] rounded-2xl px-8 py-6">
                        <p className="text-sm text-slate-400">
                            Want to contribute, partner, or learn more?
                        </p>
                        <a
                            href="mailto:team@agt.finance"
                            className="text-sm font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
                        >
                            team@agt.finance
                        </a>
                    </div>
                </div>
            </section>
        </div>
    );
}

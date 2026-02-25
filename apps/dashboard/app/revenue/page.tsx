import RevenueDashboard from '../components/RevenueDashboard';
import Link from 'next/link';

export const metadata = {
  title: 'Revenue Dashboard',
  description: 'Live revenue metrics, TVL, volume, and fee tracking for the PayPol Protocol.',
};

export default function RevenuePage() {
  return (
    <div className="min-h-screen bg-[#0B1120]">
      {/* Header */}
      <div className="border-b border-white/[0.08] pp-glass sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-slate-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
              </Link>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">Revenue Dashboard</h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  Live protocol metrics - TVL, Volume, Fees, Agent Performance
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <RevenueDashboard />
      </div>
    </div>
  );
}

import RevenueDashboard from '../components/RevenueDashboard';

export const metadata = {
  title: 'Revenue Dashboard — PayPol Protocol',
  description: 'Live revenue metrics, TVL, volume, and fee tracking for the PayPol Protocol.',
};

export default function RevenuePage() {
  return (
    <div className="min-h-screen bg-[#060A0E]">
      {/* Header */}
      <div className="border-b border-white/[0.06] bg-[#0B1215]/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">Revenue Dashboard</h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Live protocol metrics — TVL, Volume, Fees, Agent Performance
              </p>
            </div>
            <a
              href="/"
              className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white border border-white/10 rounded-lg hover:bg-white/5 transition-all"
            >
              ← Back to Dashboard
            </a>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <RevenueDashboard />
      </div>
    </div>
  );
}

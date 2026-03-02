'use client';

import dynamic from 'next/dynamic';

const ShowcaseView = dynamic(() => import('../components/warroom/ShowcaseView'), {
    ssr: false,
    loading: () => (
        <div className="fixed inset-0 bg-black flex items-center justify-center">
            <div className="text-center">
                <div className="w-24 h-24 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin mx-auto mb-4" />
                <div className="text-sm text-slate-500 uppercase tracking-widest font-bold">Initializing...</div>
                <div className="text-[10px] text-slate-600 mt-1">PayPol Live Network</div>
            </div>
        </div>
    ),
});

export default function ShowcasePage() {
    return <ShowcaseView />;
}

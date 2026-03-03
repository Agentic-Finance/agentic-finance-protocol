'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import SubPageNav from '../components/SubPageNav';

const WarRoomShell = dynamic(() => import('../components/warroom/WarRoomShell'), {
    ssr: false,
    loading: () => (
        <div className="min-h-[60vh] flex items-center justify-center">
            <div className="text-center">
                <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mx-auto mb-3" />
                <p className="text-slate-400 text-sm">Initializing Sentinel...</p>
            </div>
        </div>
    ),
});

export default function SentinelPage() {
    return (
        <div className="min-h-screen text-white" style={{ background: 'linear-gradient(180deg, #0f1420 0%, #111B2E 50%, #0f1420 100%)' }}>
            <SubPageNav />

            <div className="max-w-[1600px] mx-auto px-4 sm:px-6 pt-5 pb-2">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <div className="relative">
                                <div className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ background: '#06b6d4', boxShadow: '0 0 10px #06b6d4' }} />
                                <div className="absolute inset-0 w-2.5 h-2.5 rounded-full animate-ping" style={{ background: '#06b6d4', opacity: 0.3 }} />
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-400">3D GLOBE</span>
                        </div>
                        <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">Sentinel</h1>
                        <p className="text-[11px] text-slate-500 mt-0.5">Real-time 3D surveillance — agent topology, threat radar & audit feed</p>
                    </div>
                </div>
            </div>

            <WarRoomShell />
        </div>
    );
}

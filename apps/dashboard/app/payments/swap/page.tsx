'use client';
import React from 'react';
import dynamic from 'next/dynamic';

const LiFiWidgetWrapper = dynamic(() => import('./LiFiWidgetWrapper'), { ssr: false });

export default function SwapPage() {
    return (
        <div style={{ color: 'var(--pp-text-primary)' }}>
            <div className="mb-6">
                <h1 className="text-xl font-bold">Swap & Bridge</h1>
                <p className="text-sm mt-1" style={{ color: 'var(--pp-text-muted)' }}>Swap tokens or bridge across 60+ chains — powered by LI.FI</p>
            </div>
            <div className="max-w-lg mx-auto">
                <LiFiWidgetWrapper />
            </div>
        </div>
    );
}

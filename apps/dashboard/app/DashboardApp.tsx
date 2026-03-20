'use client';

/**
 * DashboardApp — Shared dashboard component
 * Used by both / (with landing) and /app (without landing)
 */

import { useEffect } from 'react';

export default function DashboardApp({ skipLanding }: { skipLanding?: boolean }) {
    useEffect(() => {
        // Redirect to main page with skip flag
        if (skipLanding) {
            // Set a sessionStorage flag so page.tsx knows to skip landing
            sessionStorage.setItem('agtfi_skip_landing', 'true');
        }
        // Force reload to main page which has all the dashboard logic
        if (typeof window !== 'undefined' && window.location.pathname === '/app') {
            window.location.replace('/?app=1');
        }
    }, [skipLanding]);

    return (
        <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--pp-bg-primary)' }}>
            <div className="text-center">
                <div className="w-8 h-8 border-2 border-white/20 border-t-white/60 rounded-full animate-spin mx-auto mb-4" />
                <p className="text-sm" style={{ color: 'var(--pp-text-muted)' }}>Loading...</p>
            </div>
        </div>
    );
}

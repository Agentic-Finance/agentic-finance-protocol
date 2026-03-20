'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';

export interface OnboardingState {
    fundVault: boolean;
    addEmployees: boolean;
    firstPayout: boolean;
    enableShield: boolean;
    exploreAgents: boolean;
    dismissed: boolean;
    collapsed: boolean;
}

const STORAGE_KEY = 'agtfi_onboarding_';

const defaultState: OnboardingState = {
    fundVault: false,
    addEmployees: false,
    firstPayout: false,
    enableShield: false,
    exploreAgents: false,
    dismissed: false,
    collapsed: false,
};

export function useOnboarding(walletAddress: string | null, context?: {
    vaultBalance?: number;
    employeeCount?: number;
    historyCount?: number;
    hasShieldedPayout?: boolean;
}) {
    const [state, setState] = useState<OnboardingState>(defaultState);

    const storageKey = walletAddress ? `${STORAGE_KEY}${walletAddress.toLowerCase()}` : null;

    // Load from localStorage
    useEffect(() => {
        if (!storageKey) return;
        try {
            const saved = localStorage.getItem(storageKey);
            if (saved) setState(JSON.parse(saved));
        } catch { /* ignore */ }
    }, [storageKey]);

    // Auto-detect completion from context
    useEffect(() => {
        if (!context || !storageKey) return;

        setState(prev => {
            const updated = { ...prev };
            if (context.vaultBalance && context.vaultBalance > 0) updated.fundVault = true;
            if (context.employeeCount && context.employeeCount > 0) updated.addEmployees = true;
            if (context.historyCount && context.historyCount > 0) updated.firstPayout = true;
            if (context.hasShieldedPayout) updated.enableShield = true;

            // Only save if changed
            if (JSON.stringify(updated) !== JSON.stringify(prev)) {
                localStorage.setItem(storageKey, JSON.stringify(updated));
                return updated;
            }
            return prev;
        });
    }, [context, storageKey]);

    const completeStep = useCallback((step: keyof Omit<OnboardingState, 'dismissed'>) => {
        if (!storageKey) return;
        setState(prev => {
            const updated = { ...prev, [step]: true };
            localStorage.setItem(storageKey, JSON.stringify(updated));
            return updated;
        });
    }, [storageKey]);

    const dismiss = useCallback(() => {
        if (!storageKey) return;
        setState(prev => {
            const updated = { ...prev, dismissed: true };
            localStorage.setItem(storageKey, JSON.stringify(updated));
            return updated;
        });
    }, [storageKey]);

    const toggleCollapse = useCallback(() => {
        if (!storageKey) return;
        setState(prev => {
            const updated = { ...prev, collapsed: !prev.collapsed };
            localStorage.setItem(storageKey, JSON.stringify(updated));
            return updated;
        });
    }, [storageKey]);

    const completedCount = useMemo(() => {
        const steps = [state.fundVault, state.addEmployees, state.firstPayout, state.enableShield, state.exploreAgents];
        return steps.filter(Boolean).length;
    }, [state]);

    const isComplete = completedCount === 5;
    const shouldShow = !!walletAddress && !state.dismissed && !isComplete;

    return { state, completeStep, dismiss, toggleCollapse, completedCount, isComplete, shouldShow };
}

'use client';

import React, { Suspense, lazy } from 'react';
import TopStatsCards from '../TopStatsCards';
import { FeatureErrorBoundary } from '../FeatureErrorBoundary';
import { SectionSkeleton, SidebarSkeleton } from '../Skeletons';

const SettlementReceipt = lazy(() => import('../SettlementReceipt'));
const FiatOffRamp = lazy(() => import('../FiatOffRamp'));
const TimeVault = lazy(() => import('../TimeVault'));
const EscrowTracker = lazy(() => import('../EscrowTracker'));
const AgentEarnings = lazy(() => import('../AgentEarnings'));
const MppDashboard = lazy(() => import('../MppDashboard'));

interface OverviewTabProps {
    // Stats
    totalDisbursed: any;
    workspaceStats: any;
    agentStatus: string;
    activeBotsCount: number;
    isAdmin: boolean;
    // Vault
    activeVaultToken: string;
    setActiveVaultToken: (v: string) => void;
    SUPPORTED_TOKENS: any;
    vaultBalance: string;
    showFundInput: boolean;
    setShowFundInput: (v: boolean) => void;
    fundAmount: string;
    setFundAmount: (v: string) => void;
    executeFund: () => void;
    isFunding: boolean;
    // Agent controls
    toggleAgent: () => void;
    isTogglingAgent: boolean;
    // Data
    walletAddress: string | null;
    history: any[];
    localEscrow: any;
    settlementRef: any;
}

function OverviewTab(props: OverviewTabProps) {
    const {
        totalDisbursed, workspaceStats, agentStatus, activeBotsCount, isAdmin,
        activeVaultToken, setActiveVaultToken, SUPPORTED_TOKENS, vaultBalance,
        showFundInput, setShowFundInput, fundAmount, setFundAmount, executeFund, isFunding,
        toggleAgent, isTogglingAgent,
        walletAddress, history, localEscrow, settlementRef,
    } = props;

    return (
        <div className="space-y-6">
            {/* Stats Cards */}
            <TopStatsCards
                totalDisbursed={totalDisbursed}
                workspaceVolume={workspaceStats?.totalVolume != null ? workspaceStats.totalVolume.toLocaleString() : null}
                agentStatus={agentStatus}
                activeBotsCount={activeBotsCount}
                isAdmin={isAdmin}
                toggleAgent={toggleAgent}
                isTogglingAgent={isTogglingAgent}
                activeVaultToken={activeVaultToken}
                setActiveVaultToken={setActiveVaultToken}
                SUPPORTED_TOKENS={SUPPORTED_TOKENS}
                vaultBalance={vaultBalance}
                showFundInput={showFundInput}
                setShowFundInput={setShowFundInput}
                fundAmount={fundAmount}
                setFundAmount={setFundAmount}
                executeFund={executeFund}
                isFunding={isFunding}
                daemonJobsProcessed={workspaceStats?.daemonJobsProcessed}
                daemonLastSeen={workspaceStats?.lastActivityAt}
            />

            {/* Two column layout: Recent Activity + Sidebar */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8 space-y-6">
                    {/* Recent Settlements */}
                    <FeatureErrorBoundary feature="Settlement Receipt">
                        <Suspense fallback={<SectionSkeleton />}>
                            <SettlementReceipt settlements={history} settlementRef={settlementRef} />
                        </Suspense>
                    </FeatureErrorBoundary>

                    {/* Fiat Off-Ramp */}
                    <div id="section-offramp" className="scroll-mt-20">
                        <FeatureErrorBoundary feature="Fiat Off-Ramp">
                            <Suspense fallback={<SectionSkeleton />}>
                                <FiatOffRamp walletAddress={walletAddress || ''} />
                            </Suspense>
                        </FeatureErrorBoundary>
                    </div>
                </div>

                <div className="lg:col-span-4 space-y-6">
                    <FeatureErrorBoundary feature="Daemon Queue" compact>
                        <Suspense fallback={<SidebarSkeleton />}>
                            <TimeVault localEscrow={localEscrow} />
                        </Suspense>
                    </FeatureErrorBoundary>
                    <FeatureErrorBoundary feature="Escrow Tracker" compact>
                        <Suspense fallback={<SidebarSkeleton />}>
                            <EscrowTracker walletAddress={walletAddress} />
                        </Suspense>
                    </FeatureErrorBoundary>
                    <FeatureErrorBoundary feature="Agent Earnings" compact>
                        <Suspense fallback={<SidebarSkeleton />}>
                            <AgentEarnings walletAddress={walletAddress} />
                        </Suspense>
                    </FeatureErrorBoundary>
                </div>
            </div>
        </div>
    );
}

export default React.memo(OverviewTab);

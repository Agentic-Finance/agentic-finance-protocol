'use client';

import React, { Suspense, lazy } from 'react';
import { FeatureErrorBoundary } from '../FeatureErrorBoundary';
import { ChartSkeleton, SectionSkeleton, SidebarSkeleton } from '../Skeletons';

const DashboardTabs = lazy(() => import('../DashboardTabs'));
const PayrollAnalytics = lazy(() => import('../PayrollAnalytics'));
const JobHistory = lazy(() => import('../JobHistory'));
const ComplianceStatus = lazy(() => import('../ComplianceStatus'));
const AgentReputationPanel = lazy(() => import('../AgentReputationPanel'));

interface AnalyticsTabProps {
    walletAddress: string | null;
    isAdmin: boolean;
    workspaceStats: any;
    agentStatus: string;
    wsRange: string;
    setWsRange: (r: string) => void;
}

function AnalyticsTab(props: AnalyticsTabProps) {
    const { walletAddress, isAdmin, workspaceStats, agentStatus, wsRange, setWsRange } = props;

    return (
        <div className="space-y-6">
            {/* Charts */}
            <div className="agt-card agt-card-accent-pink overflow-hidden">
                <Suspense fallback={<ChartSkeleton />}>
                    <DashboardTabs
                        walletAddress={walletAddress}
                        workspaceStats={workspaceStats}
                        agentStatus={agentStatus}
                        onRangeChange={setWsRange}
                        activeRange={wsRange}
                    />
                </Suspense>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8 space-y-6">
                    {/* Payroll Analytics */}
                    {isAdmin && (
                        <FeatureErrorBoundary feature="Payroll Analytics">
                            <Suspense fallback={<SectionSkeleton />}>
                                <PayrollAnalytics walletAddress={walletAddress} isAdmin={isAdmin} />
                            </Suspense>
                        </FeatureErrorBoundary>
                    )}

                    {/* Job History */}
                    <div id="section-jobs" className="scroll-mt-20">
                        <FeatureErrorBoundary feature="Job History">
                            <Suspense fallback={<SectionSkeleton />}>
                                <JobHistory walletAddress={walletAddress} />
                            </Suspense>
                        </FeatureErrorBoundary>
                    </div>
                </div>

                <div className="lg:col-span-4 space-y-6">
                    {/* ZK Compliance Stats */}
                    <FeatureErrorBoundary feature="ZK Compliance" compact>
                        <Suspense fallback={<SidebarSkeleton />}>
                            <ComplianceStatus />
                        </Suspense>
                    </FeatureErrorBoundary>

                    {/* Agent Reputation */}
                    <FeatureErrorBoundary feature="Agent Reputation" compact>
                        <Suspense fallback={null}>
                            <AgentReputationPanel />
                        </Suspense>
                    </FeatureErrorBoundary>
                </div>
            </div>
        </div>
    );
}

export default React.memo(AnalyticsTab);

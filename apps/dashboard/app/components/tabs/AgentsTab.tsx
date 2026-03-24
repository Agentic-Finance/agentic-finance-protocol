'use client';

import React, { Suspense, lazy } from 'react';
import { FeatureErrorBoundary } from '../FeatureErrorBoundary';
import { TerminalSkeleton, SectionSkeleton, SidebarSkeleton } from '../Skeletons';

const OmniTerminal = lazy(() => import('../OmniTerminal'));
const ActiveAgents = lazy(() => import('../ActiveAgents'));
const MppDashboard = lazy(() => import('../MppDashboard'));
const AgentReputationPanel = lazy(() => import('../AgentReputationPanel'));

interface AgentsTabProps {
    walletAddress: string | null;
    isAdmin: boolean;
    SUPPORTED_TOKENS: any;
    contacts: any[];
    showToast: (type: string, msg: string) => void;
    fetchData: () => void;
    boardroomRef: any;
    autopilotRef: any;
    history: any[];
    // Autopilot
    autopilotRules: any[];
    triggerAutopilotAgent: (id: string) => void;
    toggleAutopilotState: (id: string) => void;
    deleteAutopilotAgent: (id: string) => void;
    // Chat
    onOpenChat: (jobId: string) => void;
    // Force agent mode
    defaultToAgentMode?: boolean;
}

function AgentsTab(props: AgentsTabProps) {
    const {
        walletAddress, isAdmin, SUPPORTED_TOKENS, contacts, showToast, fetchData,
        boardroomRef, autopilotRef, history,
        autopilotRules, triggerAutopilotAgent, toggleAutopilotState, deleteAutopilotAgent,
        onOpenChat,
    } = props;

    return (
        <div className="space-y-6">
            {/* OmniTerminal — Agent Mode (will auto-switch to Agents tab) */}
            <FeatureErrorBoundary feature="OmniTerminal">
                <Suspense fallback={<TerminalSkeleton />}>
                    <OmniTerminal
                        SUPPORTED_TOKENS={SUPPORTED_TOKENS}
                        contacts={contacts}
                        showToast={showToast}
                        fetchData={fetchData}
                        boardroomRef={boardroomRef}
                        autopilotRef={autopilotRef}
                        history={history}
                        walletAddress={walletAddress}
                        onOpenChat={onOpenChat}
                        defaultToAgentMode
                    />
                </Suspense>
            </FeatureErrorBoundary>

            {/* Active Agents / Autopilot Rules */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8">
                    <div id="section-agents" className="scroll-mt-20">
                        <FeatureErrorBoundary feature="Active Agents">
                            <Suspense fallback={<SectionSkeleton />}>
                                <ActiveAgents
                                    autopilotRef={autopilotRef}
                                    autopilotRules={autopilotRules}
                                    isAdmin={isAdmin}
                                    triggerAutopilotAgent={triggerAutopilotAgent}
                                    toggleAutopilotState={toggleAutopilotState}
                                    deleteAutopilotAgent={deleteAutopilotAgent}
                                />
                            </Suspense>
                        </FeatureErrorBoundary>
                    </div>
                </div>
                <div className="lg:col-span-4 space-y-6">
                    <FeatureErrorBoundary feature="MPP Dashboard" compact>
                        <Suspense fallback={<SidebarSkeleton />}>
                            <MppDashboard />
                        </Suspense>
                    </FeatureErrorBoundary>
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

export default React.memo(AgentsTab);

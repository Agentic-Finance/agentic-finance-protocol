'use client';

import React, { Suspense, lazy } from 'react';
import { FeatureErrorBoundary } from '../FeatureErrorBoundary';
import { TerminalSkeleton, BoardroomSkeleton, SectionSkeleton } from '../Skeletons';

const OmniTerminal = lazy(() => import('../OmniTerminal'));
const Boardroom = lazy(() => import('../Boardroom'));
const StreamingPayroll = lazy(() => import('../StreamingPayroll'));
const EmployeeDirectory = lazy(() => import('../EmployeeDirectory'));
const EmployeePortal = lazy(() => import('../EmployeePortal'));

interface PayrollTabProps {
    walletAddress: string | null;
    isAdmin: boolean;
    SUPPORTED_TOKENS: any;
    contacts: any[];
    showToast: (type: string, msg: string) => void;
    fetchData: () => void;
    boardroomRef: any;
    autopilotRef: any;
    history: any[];
    // Boardroom
    awaitingTxs: any[];
    usePhantomShield: boolean;
    setUsePhantomShield: (v: boolean) => void;
    awaitingTotalAmountNum: number;
    protocolFeeNum: number;
    shieldFeeNum: number;
    totalWithFee: number;
    activeVaultToken: string;
    signAndApproveBatch: () => void;
    isEncrypting: boolean;
    removeAwaitingTx: (i: number) => void;
    // Chat
    onOpenChat: (jobId: string) => void;
}

function PayrollTab(props: PayrollTabProps) {
    const {
        walletAddress, isAdmin, SUPPORTED_TOKENS, contacts, showToast, fetchData,
        boardroomRef, autopilotRef, history,
        awaitingTxs, usePhantomShield, setUsePhantomShield,
        awaitingTotalAmountNum, protocolFeeNum, shieldFeeNum, totalWithFee,
        activeVaultToken, signAndApproveBatch, isEncrypting, removeAwaitingTx,
        onOpenChat,
    } = props;

    return (
        <div className="space-y-6">
            {/* OmniTerminal — Payroll Mode */}
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
                    />
                </Suspense>
            </FeatureErrorBoundary>

            {/* Streaming Payroll */}
            {walletAddress && (
                <FeatureErrorBoundary feature="StreamingPayroll">
                    <Suspense fallback={null}>
                        <StreamingPayroll walletAddress={walletAddress} />
                    </Suspense>
                </FeatureErrorBoundary>
            )}

            {/* Boardroom — Payment Approval */}
            {isAdmin && (
                <FeatureErrorBoundary feature="Boardroom">
                    <Suspense fallback={<BoardroomSkeleton />}>
                        <Boardroom
                            boardroomRef={boardroomRef}
                            awaitingTxs={awaitingTxs}
                            isAdmin={isAdmin}
                            usePhantomShield={usePhantomShield}
                            setUsePhantomShield={setUsePhantomShield}
                            awaitingTotalAmountNum={awaitingTotalAmountNum}
                            protocolFeeNum={protocolFeeNum}
                            shieldFeeNum={shieldFeeNum}
                            totalWithFee={totalWithFee}
                            activeVaultToken={activeVaultToken}
                            signAndApproveBatch={signAndApproveBatch}
                            isEncrypting={isEncrypting}
                            removeAwaitingTx={removeAwaitingTx}
                            showToast={showToast}
                        />
                    </Suspense>
                </FeatureErrorBoundary>
            )}

            {/* Employee Directory — Admin */}
            {isAdmin && (
                <div id="section-employees" className="scroll-mt-20">
                    <FeatureErrorBoundary feature="Employee Directory">
                        <Suspense fallback={<SectionSkeleton />}>
                            <EmployeeDirectory
                                walletAddress={walletAddress}
                                isAdmin={isAdmin}
                                showToast={showToast}
                                onPayEmployee={(emps) => {
                                    fetch('/api/employees', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json', 'X-Wallet-Address': walletAddress || '' },
                                        body: JSON.stringify({ intents: emps.map(e => ({ name: e.name, wallet: e.wallet, amount: e.amount, token: e.token, note: e.note })) })
                                    }).then(() => fetchData());
                                }}
                            />
                        </Suspense>
                    </FeatureErrorBoundary>
                </div>
            )}

            {/* Employee Portal — Non-admin view */}
            {walletAddress && !isAdmin && (
                <FeatureErrorBoundary feature="Employee Portal">
                    <Suspense fallback={<SectionSkeleton />}>
                        <EmployeePortal walletAddress={walletAddress} />
                    </Suspense>
                </FeatureErrorBoundary>
            )}
        </div>
    );
}

export default React.memo(PayrollTab);

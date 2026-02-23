import React from 'react';
import Image from 'next/image';

interface GatewayProps {
    walletAddress: string | null;
    currentWorkspace: any;
    gatewayMode: string;
    setGatewayMode: (mode: 'Select' | 'Create' | 'Join') => void;
    setupStep: number;
    setSetupStep: (step: number) => void;
    setupType: string;
    setSetupType: (type: 'Organization' | 'Personal') => void;
    setupName: string;
    setSetupName: (name: string) => void;
    joinAdminWallet: string;
    setJoinAdminWallet: (wallet: string) => void;
    ack1: boolean; setAck1: (val: boolean) => void;
    ack2: boolean; setAck2: (val: boolean) => void;
    ack3: boolean; setAck3: (val: boolean) => void;
    isDeployingWorkspace: boolean;
    deployWorkspace: (e: React.FormEvent) => void;
    joinWorkspace: (e: React.FormEvent) => void;
    connectWallet: () => void;
    disconnectWallet: () => void;
}

export default function GatewayScreen(props: GatewayProps) {
    if (props.currentWorkspace === null && props.walletAddress) {
        return (
            <div className="min-h-screen bg-[#07090E] flex flex-col items-center justify-center relative overflow-hidden font-sans">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-indigo-600/10 blur-[120px] pointer-events-none mix-blend-screen"></div>

                <div className="relative z-10 w-full max-w-2xl px-8">
                    <div className="text-center mb-10">
                        <Image src="/logo.png" alt="PayPol" width={192} height={48} className="h-12 w-auto object-contain mx-auto mb-6 drop-shadow-[0_0_25px_rgba(255,255,255,0.2)]" priority />
                        <h1 className="text-3xl font-bold text-white mb-3">Agentic Finance Gateway</h1>
                        <p className="text-slate-400 text-sm">Welcome to PayPol. Please select your operational protocol.</p>
                    </div>

                    <div className="bg-[#11141D]/80 border border-white/[0.08] rounded-3xl p-8 shadow-2xl backdrop-blur-xl transition-all duration-300">
                        {props.gatewayMode === 'Select' && (
                            <div className="animate-in fade-in zoom-in-95">
                                <div className="grid grid-cols-2 gap-5 mb-6">
                                    <button onClick={() => props.setGatewayMode('Create')} className="p-8 rounded-2xl border bg-indigo-500/10 border-indigo-500/30 hover:border-indigo-500/60 hover:bg-indigo-500/20 text-center transition-all group">
                                        <div className="w-16 h-16 mx-auto bg-indigo-500/20 rounded-full flex items-center justify-center text-3xl mb-4 group-hover:scale-110 transition-transform">🏢</div>
                                        <h3 className="text-lg font-bold text-white mb-2">Create Workspace</h3>
                                    </button>
                                    <button onClick={() => props.setGatewayMode('Join')} className="p-8 rounded-2xl border bg-fuchsia-500/10 border-fuchsia-500/30 hover:border-fuchsia-500/60 hover:bg-fuchsia-500/20 text-center transition-all group">
                                        <div className="w-16 h-16 mx-auto bg-fuchsia-500/20 rounded-full flex items-center justify-center text-3xl mb-4 group-hover:scale-110 transition-transform">🤝</div>
                                        <h3 className="text-lg font-bold text-white mb-2">Join Workspace</h3>
                                    </button>
                                </div>
                                <button onClick={props.disconnectWallet} className="w-full py-4 bg-white/[0.02] hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 text-sm font-bold rounded-xl transition-all border border-white/[0.05] hover:border-rose-500/30">Cancel & Disconnect</button>
                            </div>
                        )}

                        {props.gatewayMode === 'Join' && (
                            <form onSubmit={props.joinWorkspace} className="animate-in fade-in slide-in-from-right-8">
                                <h3 className="text-xl font-bold text-white mb-2">Join Existing Workspace</h3>
                                <div className="mb-8">
                                    <label className="block text-xs font-bold text-slate-400 mb-3 uppercase tracking-wide">Administrator Wallet Address</label>
                                    <input type="text" required autoFocus value={props.joinAdminWallet} onChange={(e) => props.setJoinAdminWallet(e.target.value)} className="w-full bg-black/40 border border-white/[0.1] rounded-xl px-5 py-4 font-mono text-sm text-fuchsia-300 focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 outline-none transition-all placeholder-slate-600 shadow-inner" placeholder="0x..." />
                                </div>
                                <div className="flex gap-4">
                                    <button type="button" onClick={() => props.setGatewayMode('Select')} className="px-6 py-4 bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 text-sm font-bold rounded-xl transition-all border border-white/[0.05]">Back</button>
                                    <button type="submit" className="flex-1 py-4 bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white text-sm font-bold rounded-xl transition-all shadow-[0_0_30px_rgba(217,70,239,0.4)]">Request Access</button>
                                </div>
                            </form>
                        )}

                        {props.gatewayMode === 'Create' && props.setupStep === 1 && (
                            <div className="animate-in fade-in slide-in-from-right-8">
                                <h3 className="text-xl font-bold text-white mb-2">Workspace Configuration</h3>
                                <div className="grid grid-cols-2 gap-4 mb-8">
                                    <button onClick={() => props.setSetupType('Organization')} className={`p-6 rounded-2xl border text-left transition-all ${props.setupType === 'Organization' ? 'bg-indigo-500/10 border-indigo-500/50 shadow-[0_0_30px_rgba(99,102,241,0.15)]' : 'bg-black/30 border-white/[0.05] hover:border-white/[0.1] hover:bg-black/50'}`}>
                                        <span className="text-3xl mb-4 block">🏢</span>
                                        <p className="text-base font-bold text-white mb-1">Organization</p>
                                    </button>
                                    <button onClick={() => props.setSetupType('Personal')} className={`p-6 rounded-2xl border text-left transition-all ${props.setupType === 'Personal' ? 'bg-indigo-500/10 border-indigo-500/50 shadow-[0_0_30px_rgba(99,102,241,0.15)]' : 'bg-black/30 border-white/[0.05] hover:border-white/[0.1] hover:bg-black/50'}`}>
                                        <span className="text-3xl mb-4 block">👤</span>
                                        <p className="text-base font-bold text-white mb-1">Personal Fund</p>
                                    </button>
                                </div>
                                <div className="flex gap-4">
                                    <button type="button" onClick={() => props.setGatewayMode('Select')} className="px-6 py-4 bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 text-sm font-bold rounded-xl transition-all border border-white/[0.05]">Back</button>
                                    <button onClick={() => props.setSetupStep(2)} className="flex-1 py-4 bg-white/[0.05] hover:bg-white/[0.1] text-white text-sm font-bold rounded-xl transition-all border border-white/[0.1]">Continue →</button>
                                </div>
                            </div>
                        )}

                        {props.gatewayMode === 'Create' && props.setupStep === 2 && (
                            <form onSubmit={(e) => { e.preventDefault(); if (props.setupName.trim()) props.setSetupStep(3); }} className="animate-in fade-in slide-in-from-right-8">
                                <h3 className="text-xl font-bold text-white mb-2">Workspace Identity</h3>
                                <div className="mb-8">
                                    <label className="block text-xs font-bold text-slate-400 mb-3 uppercase tracking-wide">
                                        {props.setupType === 'Organization' ? 'Company / DAO Name' : 'Vault Name'}
                                    </label>
                                    <input type="text" required autoFocus value={props.setupName} onChange={(e) => props.setSetupName(e.target.value)} className="w-full bg-black/40 border border-white/[0.1] rounded-xl px-5 py-4 text-lg text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all placeholder-slate-600 shadow-inner" placeholder={props.setupType === 'Organization' ? "e.g., Apple Inc." : "e.g., John's Savings"} />
                                </div>
                                <div className="flex gap-4">
                                    <button type="button" onClick={() => props.setSetupStep(1)} className="px-6 py-4 bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 text-sm font-bold rounded-xl transition-all border border-white/[0.05]">Back</button>
                                    <button type="submit" className="flex-1 py-4 bg-white/[0.05] hover:bg-white/[0.1] text-white text-sm font-bold rounded-xl transition-all border border-white/[0.1]">Continue to Security Setup →</button>
                                </div>
                            </form>
                        )}

                        {props.gatewayMode === 'Create' && props.setupStep === 3 && (
                            <form onSubmit={props.deployWorkspace} className="animate-in fade-in slide-in-from-right-8">
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="w-10 h-10 rounded-full bg-rose-500/20 text-rose-500 flex items-center justify-center text-xl">🚨</span>
                                    <h3 className="text-xl font-bold text-rose-400">Critical Security Notice</h3>
                                </div>
                                <p className="text-sm text-slate-400 mb-6 pl-13 leading-relaxed">
                                    In Web3, there is no "Forgot Password". The wallet currently connected will become the <strong className="text-white">Irreversible Master Administrator</strong>.
                                </p>

                                <div className="space-y-4 mb-8 bg-rose-500/5 border border-rose-500/20 p-5 rounded-2xl">
                                    <label className="flex items-start gap-4 cursor-pointer group">
                                        <div className="relative flex items-center justify-center mt-0.5">
                                            <input type="checkbox" required checked={props.ack1} onChange={(e) => props.setAck1(e.target.checked)} className="peer appearance-none w-5 h-5 border-2 border-rose-500/40 rounded bg-black/50 checked:bg-rose-500 checked:border-rose-500 transition-all cursor-pointer" />
                                            <span className="absolute text-white opacity-0 peer-checked:opacity-100 pointer-events-none text-xs font-bold">✓</span>
                                        </div>
                                        <span className="text-sm text-slate-300 group-hover:text-white transition-colors">I confirm this is a secure cold/hardware wallet, NOT an exchange wallet.</span>
                                    </label>

                                    <label className="flex items-start gap-4 cursor-pointer group">
                                        <div className="relative flex items-center justify-center mt-0.5">
                                            <input type="checkbox" required checked={props.ack2} onChange={(e) => props.setAck2(e.target.checked)} className="peer appearance-none w-5 h-5 border-2 border-rose-500/40 rounded bg-black/50 checked:bg-rose-500 checked:border-rose-500 transition-all cursor-pointer" />
                                            <span className="absolute text-white opacity-0 peer-checked:opacity-100 pointer-events-none text-xs font-bold">✓</span>
                                        </div>
                                        <span className="text-sm text-slate-300 group-hover:text-white transition-colors">I understand that <strong className="text-rose-400">ONLY</strong> this exact wallet address (<code className="bg-black/50 px-1 py-0.5 rounded text-xs">{props.walletAddress?.slice(0, 6)}...{props.walletAddress?.slice(-4)}</code>) can authorize payrolls and extract funds.</span>
                                    </label>

                                    <label className="flex items-start gap-4 cursor-pointer group">
                                        <div className="relative flex items-center justify-center mt-0.5">
                                            <input type="checkbox" required checked={props.ack3} onChange={(e) => props.setAck3(e.target.checked)} className="peer appearance-none w-5 h-5 border-2 border-rose-500/40 rounded bg-black/50 checked:bg-rose-500 checked:border-rose-500 transition-all cursor-pointer" />
                                            <span className="absolute text-white opacity-0 peer-checked:opacity-100 pointer-events-none text-xs font-bold">✓</span>
                                        </div>
                                        <span className="text-sm text-slate-300 group-hover:text-white transition-colors">I have securely backed up my 12/24-word Seed Phrase.</span>
                                    </label>
                                </div>

                                <div className="flex gap-4">
                                    <button type="button" onClick={() => props.setSetupStep(2)} className="px-6 py-4 bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 text-sm font-bold rounded-xl transition-all border border-white/[0.05]">Back</button>
                                    <button type="submit" disabled={!props.ack1 || !props.ack2 || !props.ack3 || props.isDeployingWorkspace} className="flex-1 py-4 bg-gradient-to-r from-rose-600 to-orange-600 hover:from-rose-500 hover:to-orange-500 text-white text-sm font-bold rounded-xl transition-all duration-300 disabled:opacity-30 disabled:grayscale shadow-[0_0_30px_rgba(225,29,72,0.4)]">
                                        {props.isDeployingWorkspace ? 'Deploying...' : 'Sign & Deploy Workspace'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // Connect Screen
    if (props.currentWorkspace === undefined && props.walletAddress === null) {
        return (
            <div className="min-h-screen bg-[#07090E] flex flex-col items-center justify-center relative overflow-hidden font-sans">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-indigo-600/10 blur-[120px] pointer-events-none mix-blend-screen"></div>
                <div className="relative z-10 text-center w-full px-8">
                    <div className="flex justify-center items-center mb-8 animate-in slide-in-from-bottom-4 duration-700">
                        <Image src="/logo.png" alt="PayPol Logo" width={448} height={112} className="h-20 md:h-28 w-auto object-contain drop-shadow-[0_0_50px_rgba(255,255,255,0.4)] mx-auto" priority />
                    </div>
                    <p className="text-indigo-100/90 text-sm md:text-2xl font-bold tracking-[0.15em] uppercase mb-16 animate-in slide-in-from-bottom-6 duration-1000 w-full md:whitespace-nowrap mx-auto leading-normal drop-shadow-lg text-center">
                        The Financial OS for the Agentic Economy.
                    </p>
                    <div className="flex justify-center">
                        <button onClick={props.connectWallet} className="px-12 py-6 bg-white/[0.05] hover:bg-white/[0.1] text-white text-xl font-bold rounded-3xl transition-all duration-300 border border-white/[0.1] shadow-2xl backdrop-blur-md hover:shadow-[0_0_50px_rgba(99,102,241,0.4)] hover:-translate-y-1 animate-in slide-in-from-bottom-8 duration-1000 delay-150">
                            Connect Web3 Wallet →
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return null;
}
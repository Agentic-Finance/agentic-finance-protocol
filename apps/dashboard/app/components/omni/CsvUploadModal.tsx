import React from 'react';
import { createPortal } from 'react-dom';
import { DocumentArrowDownIcon, DocumentTextIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface CsvUploadModalProps {
    showCsvModal: boolean;
    setShowCsvModal: (v: boolean) => void;
    dontShowCsvGuide: boolean;
    setDontShowCsvGuide: (v: boolean) => void;
    handleProceedUpload: () => void;
}

function CsvUploadModal({ showCsvModal, setShowCsvModal, dontShowCsvGuide, setDontShowCsvGuide, handleProceedUpload }: CsvUploadModalProps) {
    if (!showCsvModal) return null;

    // Sample files are pre-generated static files in /public

    return createPortal(
        <div style={{ zIndex: 2147483647, background: 'rgba(15,19,25,0.88)' }} className="fixed inset-0 flex items-center justify-center animate-in fade-in duration-200">
            <div className="bg-[#151B27] border border-emerald-500/20 shadow-[0_0_100px_rgba(16,185,129,0.1)] rounded-3xl p-6 sm:p-8 max-w-sm w-full mx-4 relative">
                <button onClick={() => setShowCsvModal(false)} className="absolute top-6 right-6 text-slate-500 hover:text-rose-400 transition-colors">
                    <XMarkIcon className="w-6 h-6" />
                </button>

                <div className="flex items-center gap-3 mb-4">
                    <DocumentArrowDownIcon className="w-6 h-6 text-emerald-400" />
                    <h3 className="text-xl font-bold text-white tracking-wide">Upload Ledger</h3>
                </div>

                <p className="text-sm text-slate-300 mb-4 leading-relaxed">
                    Supports <span className="text-emerald-400 font-bold">CSV</span>, <span className="text-emerald-400 font-bold">XLS</span>, and <span className="text-emerald-400 font-bold">XLSX</span> files. Use this column structure:
                </p>

                <div className="bg-[#06080C] border border-white/5 rounded-2xl p-4 mb-6 font-mono text-sm space-y-3">
                    <div className="flex gap-2"><span className="text-emerald-400 font-bold w-16">Name</span> <span className="text-slate-500">(&quot;Tony&quot;)</span></div>
                    <div className="flex gap-2"><span className="text-emerald-400 font-bold w-16">Wallet</span> <span className="text-slate-500">(0x...)</span></div>
                    <div className="flex gap-2"><span className="text-emerald-400 font-bold w-16">Amount</span> <span className="text-slate-500">(10)</span></div>
                    <div className="flex gap-2"><span className="text-emerald-400 font-bold w-16">Token</span> <span className="text-slate-500">(AlphaUSD)</span></div>
                    <div className="flex gap-2"><span className="text-emerald-400 font-bold w-16">Note</span> <span className="text-slate-500">(Optional)</span></div>
                </div>

                <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-2">Download Sample File</p>
                <div className="flex gap-3 mb-6">
                    <a
                        href="/agtfi-sample-ledger.xlsx"
                        download="agtfi-sample-ledger.xlsx"
                        className="flex-1 py-3 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all"
                    >
                        <DocumentArrowDownIcon className="w-4 h-4" /> .XLSX
                    </a>
                    <a
                        href="/agtfi-sample-ledger.csv"
                        download="agtfi-sample-ledger.csv"
                        className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all hover:border-white/20"
                    >
                        <DocumentArrowDownIcon className="w-4 h-4" /> .CSV
                    </a>
                </div>

                <div className="flex items-center gap-3 mb-6">
                    <input
                        type="checkbox"
                        id="hideGuide"
                        checked={dontShowCsvGuide}
                        onChange={(e) => setDontShowCsvGuide(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-600 bg-slate-800 checked:bg-emerald-500 focus:ring-emerald-500 focus:ring-offset-slate-900 cursor-pointer"
                    />
                    <label htmlFor="hideGuide" className="text-sm text-slate-400 cursor-pointer select-none">Do not show this guide again</label>
                </div>

                <button
                    type="button"
                    onClick={handleProceedUpload}
                    className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-900 rounded-xl text-base font-black transition-colors"
                >
                    Select File to Upload
                </button>
            </div>
        </div>,
        document.body
    );
}

export default React.memo(CsvUploadModal);

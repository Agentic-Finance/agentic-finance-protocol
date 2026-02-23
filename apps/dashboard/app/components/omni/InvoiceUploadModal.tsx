'use client';

import React, { useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { DocumentTextIcon, XMarkIcon, ArrowUpTrayIcon, SparklesIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';

interface InvoiceUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onParsed: (intents: { name: string; wallet: string; amount: string; token: string; note: string }[]) => void;
    showToast: (type: 'success' | 'error', msg: string) => void;
}

function InvoiceUploadModal({ isOpen, onClose, onParsed, showToast }: InvoiceUploadModalProps) {
    const [invoiceText, setInvoiceText] = useState('');
    const [attachedFile, setAttachedFile] = useState<File | null>(null);
    const [isParsing, setIsParsing] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = useCallback((file: File) => {
        const validTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'text/plain'];
        if (!validTypes.includes(file.type)) {
            showToast('error', 'Unsupported file format. Use PDF, PNG, JPG, or TXT.');
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            showToast('error', 'File too large. Maximum 10MB.');
            return;
        }
        setAttachedFile(file);
        setInvoiceText('');
    }, [showToast]);

    const handleParse = useCallback(async () => {
        if (!invoiceText.trim() && !attachedFile) {
            showToast('error', 'Please upload a file or paste invoice text.');
            return;
        }

        setIsParsing(true);
        try {
            let body: Record<string, unknown> = {};

            if (attachedFile) {
                const base64 = await new Promise<string>((resolve) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result as string);
                    reader.readAsDataURL(attachedFile);
                });
                body = { type: 'file', content: base64, fileName: attachedFile.name, mimeType: attachedFile.type };
            } else {
                body = { type: 'text', content: invoiceText.trim() };
            }

            const response = await fetch('/api/invoice-parse', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            const data = await response.json();

            if (data.error) {
                showToast('error', data.error);
                return;
            }

            if (data.intents && data.intents.length > 0) {
                onParsed(data.intents);
                showToast('success', `Extracted ${data.intents.length} payment${data.intents.length > 1 ? 's' : ''} from invoice.`);
                onClose();
                setInvoiceText('');
                setAttachedFile(null);
            } else {
                showToast('error', 'Could not extract payment data from invoice.');
            }
        } catch (error) {
            console.error('Invoice parse error:', error);
            showToast('error', 'Failed to parse invoice.');
        } finally {
            setIsParsing(false);
        }
    }, [invoiceText, attachedFile, onParsed, onClose, showToast]);

    if (!isOpen) return null;

    return createPortal(
        <div style={{ zIndex: 2147483647 }} className="fixed inset-0 flex items-center justify-center bg-[#07090E]/85 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#0B0F17] border border-cyan-500/20 shadow-[0_0_100px_rgba(6,182,212,0.08)] rounded-3xl p-6 sm:p-8 max-w-lg w-full mx-4 relative">
                {/* Close */}
                <button onClick={onClose} className="absolute top-6 right-6 text-slate-500 hover:text-rose-400 transition-colors">
                    <XMarkIcon className="w-6 h-6" />
                </button>

                {/* Header */}
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                        <DocumentTextIcon className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-white tracking-wide">Invoice-to-Pay</h3>
                        <p className="text-[10px] text-cyan-400/60 font-mono tracking-wider uppercase">AI-Powered Extraction</p>
                    </div>
                </div>

                <p className="text-sm text-slate-500 mb-4 leading-relaxed">
                    Upload an invoice and AI will automatically extract recipients, amounts, and payment details.
                </p>

                {/* Sample Invoice Download */}
                <div className="flex items-center gap-3 mb-6 p-3 rounded-xl bg-cyan-500/[0.04] border border-cyan-500/10">
                    <div className="flex-1 min-w-0">
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                            Not sure about the format? Download our sample to see how invoices are parsed.
                        </p>
                    </div>
                    <a
                        href="/samples/sample-invoice.txt"
                        download="sample-invoice.txt"
                        onClick={(e) => e.stopPropagation()}
                        className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 text-cyan-400 text-[10px] font-bold uppercase tracking-wider transition-all hover:scale-[1.02]"
                    >
                        <ArrowDownTrayIcon className="w-3.5 h-3.5" />
                        Sample
                    </a>
                </div>

                {/* File Upload Zone */}
                <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                    onDragLeave={(e) => { e.preventDefault(); setIsDragOver(false); }}
                    onDrop={(e) => {
                        e.preventDefault();
                        setIsDragOver(false);
                        if (e.dataTransfer.files?.[0]) handleFileSelect(e.dataTransfer.files[0]);
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 mb-5 ${
                        isDragOver
                            ? 'border-cyan-400/60 bg-cyan-500/[0.05]'
                            : attachedFile
                                ? 'border-emerald-500/40 bg-emerald-500/[0.03]'
                                : 'border-white/10 bg-[#06080C] hover:border-cyan-500/30 hover:bg-cyan-500/[0.02]'
                    }`}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg,.txt"
                        className="hidden"
                        onChange={(e) => {
                            if (e.target.files?.[0]) handleFileSelect(e.target.files[0]);
                            e.target.value = '';
                        }}
                    />

                    {attachedFile ? (
                        <div className="flex flex-col items-center gap-2">
                            <div className="w-14 h-14 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                                <DocumentTextIcon className="w-7 h-7 text-emerald-400" />
                            </div>
                            <span className="text-sm font-medium text-white">{attachedFile.name}</span>
                            <span className="text-[10px] text-slate-500 font-mono">{(attachedFile.size / 1024).toFixed(1)} KB</span>
                            <button
                                onClick={(e) => { e.stopPropagation(); setAttachedFile(null); }}
                                className="text-[10px] text-rose-400 hover:text-rose-300 font-bold uppercase tracking-wider mt-1 px-3 py-1 rounded-lg hover:bg-rose-500/10 transition-all"
                            >
                                Remove
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-3">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${isDragOver ? 'bg-cyan-500/10' : 'bg-white/[0.02]'}`}>
                                <ArrowUpTrayIcon className={`w-7 h-7 ${isDragOver ? 'text-cyan-400' : 'text-slate-600'} transition-colors`} />
                            </div>
                            <div>
                                <span className={`text-sm font-medium ${isDragOver ? 'text-cyan-300' : 'text-slate-400'}`}>
                                    Drop your invoice here
                                </span>
                                <p className="text-[10px] text-slate-600 mt-1.5 font-mono">PDF • PNG • JPG • TXT — Max 10MB</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Divider */}
                <div className="flex items-center gap-3 mb-5">
                    <div className="flex-1 h-px bg-white/5"></div>
                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">or paste text</span>
                    <div className="flex-1 h-px bg-white/5"></div>
                </div>

                {/* Text Input */}
                <textarea
                    value={invoiceText}
                    onChange={(e) => { setInvoiceText(e.target.value); setAttachedFile(null); }}
                    placeholder={`Paste invoice content here...\n\ne.g.\nInvoice #INV-2026-042\nFrom: Acme Corp\n\n1. Web Development — $5,000 — 0xA1b2...\n2. Smart Contract Audit — $3,000 — 0xC3d4...\n3. UI/UX Design — $2,500 — 0xE5f6...`}
                    disabled={!!attachedFile}
                    className={`w-full h-36 bg-[#06080C] border border-white/10 rounded-xl p-4 text-sm text-white font-mono resize-none focus:outline-none focus:border-cyan-500/30 placeholder:text-slate-700 transition-all leading-relaxed ${attachedFile ? 'opacity-30 cursor-not-allowed' : ''}`}
                />

                {/* Actions */}
                <div className="flex gap-3 mt-6">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 rounded-xl text-sm font-bold transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleParse}
                        disabled={isParsing || (!invoiceText.trim() && !attachedFile)}
                        className={`flex-[1.5] py-3.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                            isParsing || (!invoiceText.trim() && !attachedFile)
                                ? 'bg-white/5 text-slate-500 cursor-not-allowed border border-white/5'
                                : 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.4)] hover:scale-[1.02]'
                        }`}
                    >
                        {isParsing ? (
                            <>
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                Extracting Data...
                            </>
                        ) : (
                            <>
                                <SparklesIcon className="w-4 h-4" />
                                Parse Invoice
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}

export default React.memo(InvoiceUploadModal);

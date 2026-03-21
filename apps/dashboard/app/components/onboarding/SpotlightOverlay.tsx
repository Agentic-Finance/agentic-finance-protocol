'use client';

import React, { useState, useEffect, useCallback } from 'react';

export interface SpotlightTarget {
    /** CSS selector or element ID (without #) to highlight */
    selector: string;
    /** Title shown in tooltip */
    title: string;
    /** Instruction text */
    description: string;
    /** Which side to show the tooltip */
    position?: 'top' | 'bottom' | 'left' | 'right';
    /** Step number label */
    step: number;
    totalSteps: number;
}

interface SpotlightOverlayProps {
    target: SpotlightTarget | null;
    onClose: () => void;
    onNext?: () => void;
    onPrev?: () => void;
    hasNext?: boolean;
    hasPrev?: boolean;
}

function SpotlightOverlay({ target, onClose, onNext, onPrev, hasNext, hasPrev }: SpotlightOverlayProps) {
    const [rect, setRect] = useState<DOMRect | null>(null);
    const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
    const [arrowClass, setArrowClass] = useState('');

    const updatePosition = useCallback(() => {
        if (!target) return;

        // Try ID first, then selector
        let el = document.getElementById(target.selector) || document.querySelector(target.selector);
        if (!el) return;

        const r = el.getBoundingClientRect();
        setRect(r);

        // Calculate tooltip position
        const pad = 16;
        const tooltipW = 320;
        const tooltipH = 180;
        const pos = target.position || 'bottom';

        let style: React.CSSProperties = { position: 'fixed', width: tooltipW, zIndex: 10002 };

        if (pos === 'bottom') {
            style.top = r.bottom + pad;
            style.left = Math.max(pad, Math.min(r.left + r.width / 2 - tooltipW / 2, window.innerWidth - tooltipW - pad));
            setArrowClass('spotlight-arrow-up');
        } else if (pos === 'top') {
            style.top = r.top - tooltipH - pad;
            style.left = Math.max(pad, Math.min(r.left + r.width / 2 - tooltipW / 2, window.innerWidth - tooltipW - pad));
            setArrowClass('spotlight-arrow-down');
        } else if (pos === 'right') {
            style.top = Math.max(pad, r.top + r.height / 2 - tooltipH / 2);
            style.left = r.right + pad;
            setArrowClass('spotlight-arrow-left');
        } else {
            style.top = Math.max(pad, r.top + r.height / 2 - tooltipH / 2);
            style.left = r.left - tooltipW - pad;
            setArrowClass('spotlight-arrow-right');
        }

        setTooltipStyle(style);
    }, [target]);

    // Scroll into view + update position
    useEffect(() => {
        if (!target) { setRect(null); return; }

        let el = document.getElementById(target.selector) || document.querySelector(target.selector);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // Wait for scroll then measure
            const t = setTimeout(updatePosition, 500);
            return () => clearTimeout(t);
        }
    }, [target, updatePosition]);

    // Listen for scroll/resize
    useEffect(() => {
        if (!target) return;
        const handler = () => updatePosition();
        window.addEventListener('scroll', handler, true);
        window.addEventListener('resize', handler);
        return () => { window.removeEventListener('scroll', handler, true); window.removeEventListener('resize', handler); };
    }, [target, updatePosition]);

    // ESC to close
    useEffect(() => {
        if (!target) return;
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [target, onClose]);

    if (!target || !rect) return null;

    const padding = 8;

    return (
        <>
            {/* Dark overlay with cutout */}
            <div
                className="fixed inset-0 z-[10000] spotlight-overlay-enter"
                style={{
                    background: 'rgba(0,0,0,0.6)',
                    // Clip path to create a cutout around the target element
                    clipPath: `polygon(
                        0% 0%, 0% 100%,
                        ${rect.left - padding}px 100%,
                        ${rect.left - padding}px ${rect.top - padding}px,
                        ${rect.right + padding}px ${rect.top - padding}px,
                        ${rect.right + padding}px ${rect.bottom + padding}px,
                        ${rect.left - padding}px ${rect.bottom + padding}px,
                        ${rect.left - padding}px 100%,
                        100% 100%, 100% 0%
                    )`,
                }}
                onClick={onClose}
            />

            {/* Highlight border around target */}
            <div
                className="fixed z-[10001] pointer-events-none spotlight-ring-pulse"
                style={{
                    top: rect.top - padding,
                    left: rect.left - padding,
                    width: rect.width + padding * 2,
                    height: rect.height + padding * 2,
                    borderRadius: 'var(--pp-radius-lg)',
                    border: '2px solid var(--agt-blue)',
                    boxShadow: '0 0 20px rgba(27, 191, 236, 0.3), inset 0 0 20px rgba(27, 191, 236, 0.05)',
                }}
            />

            {/* Tooltip */}
            <div className={`spotlight-tooltip-enter ${arrowClass}`} style={tooltipStyle}>
                <div
                    className="rounded-xl p-4 shadow-2xl"
                    style={{
                        background: 'var(--pp-bg-card)',
                        border: '1px solid var(--pp-border)',
                        boxShadow: '0 16px 48px rgba(0,0,0,0.4)',
                    }}
                >
                    {/* Step indicator */}
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full"
                                style={{ background: 'var(--pp-surface-2)', color: 'var(--agt-blue)' }}>
                                Step {target.step}/{target.totalSteps}
                            </span>
                        </div>
                        <button onClick={onClose} className="p-1 rounded-lg transition-colors" style={{ color: 'var(--pp-text-muted)' }}>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Content */}
                    <h4 className="text-sm font-bold mb-1" style={{ color: 'var(--pp-text-primary)' }}>{target.title}</h4>
                    <p className="text-xs leading-relaxed mb-4" style={{ color: 'var(--pp-text-muted)' }}>{target.description}</p>

                    {/* Navigation */}
                    <div className="flex items-center justify-between">
                        <button onClick={onClose} className="text-[11px] transition-colors" style={{ color: 'var(--pp-text-muted)' }}>
                            Skip tour
                        </button>
                        <div className="flex items-center gap-2">
                            {hasPrev && (
                                <button onClick={onPrev} className="text-[11px] font-medium px-3 py-1.5 rounded-lg transition-all"
                                    style={{ background: 'var(--pp-surface-2)', color: 'var(--pp-text-secondary)', border: '1px solid var(--pp-border)' }}>
                                    ← Back
                                </button>
                            )}
                            {hasNext ? (
                                <button onClick={onNext} className="text-[11px] font-medium px-3 py-1.5 rounded-lg transition-all text-white"
                                    style={{ background: 'linear-gradient(135deg, var(--agt-pink), var(--agt-blue))' }}>
                                    Next →
                                </button>
                            ) : (
                                <button onClick={onClose} className="text-[11px] font-medium px-3 py-1.5 rounded-lg transition-all text-white"
                                    style={{ background: 'var(--agt-mint)' }}>
                                    Got it!
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Step dots */}
                    <div className="flex items-center justify-center gap-1.5 mt-3">
                        {Array.from({ length: target.totalSteps }, (_, i) => (
                            <div key={i} className="w-1.5 h-1.5 rounded-full transition-all"
                                style={{
                                    background: i + 1 === target.step ? 'var(--agt-blue)' : 'var(--pp-surface-3)',
                                    width: i + 1 === target.step ? 12 : 6,
                                }} />
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
}

export default React.memo(SpotlightOverlay);

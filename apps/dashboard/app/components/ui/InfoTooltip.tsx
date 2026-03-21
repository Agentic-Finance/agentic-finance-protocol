'use client';

import React, { useState } from 'react';

interface InfoTooltipProps {
    text: string;
    /** Optional size — defaults to 14px */
    size?: number;
}

/**
 * Small (?) icon that shows a tooltip on hover/click.
 * Uses CSS variables for theme compatibility.
 */
function InfoTooltip({ text, size = 14 }: InfoTooltipProps) {
    const [show, setShow] = useState(false);

    return (
        <span
            className="relative inline-flex items-center justify-center cursor-help flex-shrink-0"
            style={{ width: size, height: size }}
            onMouseEnter={() => setShow(true)}
            onMouseLeave={() => setShow(false)}
            onClick={(e) => { e.stopPropagation(); setShow(v => !v); }}
        >
            <svg
                width={size}
                height={size}
                viewBox="0 0 16 16"
                fill="none"
                style={{ color: 'var(--pp-text-muted)', opacity: 0.6 }}
                className="hover:opacity-100 transition-opacity"
            >
                <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
                <text x="8" y="11.5" textAnchor="middle" fill="currentColor" fontSize="9" fontWeight="600" fontFamily="system-ui">?</text>
            </svg>

            {show && (
                <div
                    className="absolute z-[100] bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 rounded-lg text-[11px] leading-relaxed w-[220px] pointer-events-none shadow-xl"
                    style={{
                        background: 'var(--pp-bg-elevated)',
                        color: 'var(--pp-text-secondary)',
                        border: '1px solid var(--pp-border)',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                    }}
                >
                    {text}
                    {/* Arrow */}
                    <div
                        className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 -mt-1"
                        style={{ background: 'var(--pp-bg-elevated)', borderRight: '1px solid var(--pp-border)', borderBottom: '1px solid var(--pp-border)' }}
                    />
                </div>
            )}
        </span>
    );
}

export default React.memo(InfoTooltip);

'use client';

import React, { useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownRendererProps {
    content: string;
}

function CopyButton({ text }: { text: string }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = useCallback(() => {
        navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    }, [text]);

    return (
        <button
            onClick={handleCopy}
            className="absolute top-3 right-3 p-1.5 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white transition-all opacity-0 group-hover:opacity-100"
            title="Copy code"
        >
            {copied ? (
                <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
            )}
        </button>
    );
}

function HeadingAnchor({ id, level, children }: { id: string; level: number; children: React.ReactNode }) {
    const sizeClasses: Record<number, string> = {
        1: 'text-3xl md:text-4xl font-black text-white mt-20 mb-6 tracking-tight first:mt-0',
        2: 'text-2xl md:text-3xl font-bold text-white mt-16 mb-5 tracking-tight pb-3 border-b border-white/5',
        3: 'text-xl font-bold text-white mt-10 mb-4',
        4: 'text-lg font-semibold text-slate-200 mt-8 mb-3',
    };

    const className = `${sizeClasses[level] || sizeClasses[4]} scroll-mt-24 group/heading relative`;
    const anchor = (
        <a
            href={`#${id}`}
            className="absolute -left-6 top-1/2 -translate-y-1/2 opacity-0 group-hover/heading:opacity-100 transition-opacity text-slate-600 hover:text-emerald-400"
            aria-label={`Link to ${id}`}
        >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
        </a>
    );

    if (level === 1) return <h1 id={id} className={className}>{anchor}{children}</h1>;
    if (level === 2) return <h2 id={id} className={className}>{anchor}{children}</h2>;
    if (level === 3) return <h3 id={id} className={className}>{anchor}{children}</h3>;
    return <h4 id={id} className={className}>{anchor}{children}</h4>;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
    return (
        <div className="prose-paypol" style={{ overflowWrap: 'break-word', wordBreak: 'break-word' }}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    h1: ({ children }) => {
                        const id = generateId(children);
                        return <HeadingAnchor id={id} level={1}>{children}</HeadingAnchor>;
                    },
                    h2: ({ children }) => {
                        const id = generateId(children);
                        return <HeadingAnchor id={id} level={2}>{children}</HeadingAnchor>;
                    },
                    h3: ({ children }) => {
                        const id = generateId(children);
                        return <HeadingAnchor id={id} level={3}>{children}</HeadingAnchor>;
                    },
                    h4: ({ children }) => {
                        const id = generateId(children);
                        return <HeadingAnchor id={id} level={4}>{children}</HeadingAnchor>;
                    },

                    p: ({ children, ...props }) => (
                        <p className="text-slate-400 leading-[1.85] mb-5 text-[0.95rem]" style={{ overflowWrap: 'break-word', wordBreak: 'break-word' }} {...props}>{children}</p>
                    ),

                    a: ({ href, children, ...props }) => (
                        <a href={href} className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2 decoration-emerald-400/30 hover:decoration-emerald-300/50 transition-colors" target={href?.startsWith('http') ? '_blank' : undefined} rel={href?.startsWith('http') ? 'noreferrer' : undefined} {...props}>{children}</a>
                    ),

                    ul: ({ children, ...props }) => (
                        <ul className="list-disc list-outside ml-6 mb-5 space-y-2 text-slate-400 text-[0.95rem] marker:text-emerald-500/40" {...props}>{children}</ul>
                    ),
                    ol: ({ children, ...props }) => (
                        <ol className="list-decimal list-outside ml-6 mb-5 space-y-2 text-slate-400 text-[0.95rem] marker:text-emerald-500/40" {...props}>{children}</ol>
                    ),
                    li: ({ children, ...props }) => (
                        <li className="leading-[1.75] pl-1" {...props}>{children}</li>
                    ),

                    pre: ({ children }) => {
                        const codeText = extractCodeText(children);
                        return (
                            <div className="relative group mb-6" style={{ maxWidth: '100%', overflow: 'hidden' }}>
                                <pre className="bg-[#0D1119] border border-white/[0.06] rounded-xl p-5 overflow-x-auto text-sm leading-relaxed shadow-lg shadow-black/20" style={{ maxWidth: '100%' }}>
                                    {children}
                                </pre>
                                <CopyButton text={codeText} />
                            </div>
                        );
                    },
                    code: ({ className, children, ...props }) => {
                        const isInline = !className;
                        if (isInline) {
                            return <code className="bg-emerald-500/[0.08] text-emerald-400 px-1.5 py-0.5 rounded text-[0.85em] font-mono border border-emerald-500/10" {...props}>{children}</code>;
                        }
                        return <code className="text-slate-300 font-mono text-[0.85rem]" {...props}>{children}</code>;
                    },

                    blockquote: ({ children, ...props }) => (
                        <blockquote className="border-l-4 border-emerald-500/30 bg-emerald-500/[0.03] pl-5 pr-4 py-4 my-6 rounded-r-xl" {...props}>{children}</blockquote>
                    ),

                    table: ({ children, ...props }) => (
                        <div className="overflow-x-auto mb-6 rounded-xl border border-white/[0.06] shadow-lg shadow-black/10">
                            <table className="w-full text-sm" {...props}>{children}</table>
                        </div>
                    ),
                    thead: ({ children, ...props }) => (
                        <thead className="bg-[#0D1119] border-b border-white/[0.06]" {...props}>{children}</thead>
                    ),
                    tbody: ({ children, ...props }) => (
                        <tbody className="divide-y divide-white/[0.03]" {...props}>{children}</tbody>
                    ),
                    tr: ({ children, ...props }) => (
                        <tr className="hover:bg-white/[0.02] transition-colors" {...props}>{children}</tr>
                    ),
                    th: ({ children, ...props }) => (
                        <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider" {...props}>{children}</th>
                    ),
                    td: ({ children, ...props }) => (
                        <td className="px-4 py-3.5 text-slate-400 text-[0.85rem]" {...props}>{children}</td>
                    ),

                    hr: (props) => (
                        <div className="my-14 flex items-center gap-4" {...props}>
                            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/30"></div>
                            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
                        </div>
                    ),

                    strong: ({ children, ...props }) => (
                        <strong className="text-white font-semibold" {...props}>{children}</strong>
                    ),
                    em: ({ children, ...props }) => (
                        <em className="text-slate-300 italic" {...props}>{children}</em>
                    ),

                    img: ({ src, alt, ...props }) => (
                        <img src={src} alt={alt} className="rounded-xl border border-white/5 my-6 max-w-full" {...props} />
                    ),
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
}

function generateId(children: React.ReactNode): string {
    const text = extractText(children);
    return text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
}

function extractText(node: React.ReactNode): string {
    if (typeof node === 'string') return node;
    if (typeof node === 'number') return String(node);
    if (Array.isArray(node)) return node.map(extractText).join('');
    if (React.isValidElement(node)) {
        const props = node.props as Record<string, unknown>;
        if (props.children) {
            return extractText(props.children as React.ReactNode);
        }
    }
    return '';
}

function extractCodeText(children: React.ReactNode): string {
    if (typeof children === 'string') return children;
    if (Array.isArray(children)) return children.map(extractCodeText).join('');
    if (React.isValidElement(children)) {
        const props = children.props as Record<string, unknown>;
        if (props.children) {
            return extractCodeText(props.children as React.ReactNode);
        }
    }
    return '';
}

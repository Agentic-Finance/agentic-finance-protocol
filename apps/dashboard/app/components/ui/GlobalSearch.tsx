'use client';
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Search, X, ArrowRight, Zap, DollarSign, Wallet, Brain, Radio, Shield, Settings, Code2, LayoutDashboard } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface SearchResult {
  id: string;
  label: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  category: 'Pages' | 'Quick Actions';
}

const allPages: SearchResult[] = [
  { id: 'dashboard', label: 'Dashboard', description: 'Overview and analytics', href: '/cortex', icon: <LayoutDashboard className="w-4 h-4" />, category: 'Pages' },
  { id: 'streams', label: 'Streams', description: 'Payment streams and flows', href: '/stream', icon: <Radio className="w-4 h-4" />, category: 'Pages' },
  { id: 'cortex', label: 'Cortex', description: 'AI intelligence hub', href: '/cortex', icon: <Brain className="w-4 h-4" />, category: 'Pages' },
  { id: 'swarm', label: 'Swarm Hub', description: 'Agent swarm management', href: '/swarm', icon: <Zap className="w-4 h-4" />, category: 'Pages' },
  { id: 'sentinel', label: 'Sentinel', description: 'Security monitoring', href: '/sentinel', icon: <Shield className="w-4 h-4" />, category: 'Pages' },
  { id: 'shield', label: 'Shield', description: 'Vault protection', href: '/shield', icon: <Shield className="w-4 h-4" />, category: 'Pages' },
  { id: 'revenue', label: 'Revenue', description: 'Revenue analytics', href: '/revenue', icon: <DollarSign className="w-4 h-4" />, category: 'Pages' },
  { id: 'wallets', label: 'Wallets', description: 'Wallet management', href: '/wallets', icon: <Wallet className="w-4 h-4" />, category: 'Pages' },
  { id: 'admin', label: 'Admin', description: 'System administration', href: '/admin', icon: <Settings className="w-4 h-4" />, category: 'Pages' },
  { id: 'developers', label: 'Developers', description: 'API & developer tools', href: '/developers', icon: <Code2 className="w-4 h-4" />, category: 'Pages' },
];

const quickActions: SearchResult[] = [
  { id: 'new-stream', label: 'Create New Stream', description: 'Set up a payment stream', href: '/stream', icon: <ArrowRight className="w-4 h-4" />, category: 'Quick Actions' },
  { id: 'view-agents', label: 'View Active Agents', description: 'Monitor running agents', href: '/swarm', icon: <Zap className="w-4 h-4" />, category: 'Quick Actions' },
];

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Cmd/Ctrl+K listener
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      // Small delay for DOM to mount
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, [open]);

  // Filter results
  const results = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return [...allPages.slice(0, 6), ...quickActions];

    const matchedPages = allPages.filter(
      (p) =>
        p.label.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
    );
    const matchedActions = quickActions.filter(
      (a) =>
        a.label.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q)
    );
    return [...matchedPages, ...matchedActions];
  }, [query]);

  // Group results by category
  const grouped = useMemo(() => {
    const map = new Map<string, SearchResult[]>();
    for (const r of results) {
      const list = map.get(r.category) || [];
      list.push(r);
      map.set(r.category, list);
    }
    return map;
  }, [results]);

  const navigate = useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router]
  );

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((prev) => Math.min(prev + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && results[activeIndex]) {
        navigate(results[activeIndex].href);
      }
    },
    [results, activeIndex, navigate]
  );

  // Scroll active result into view
  useEffect(() => {
    if (resultsRef.current) {
      const activeEl = resultsRef.current.querySelector(`[data-index="${activeIndex}"]`);
      activeEl?.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex]);

  if (!open) return null;

  let flatIndex = 0;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh]"
      onClick={() => setOpen(false)}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="
          relative w-full max-w-[560px] mx-4
          bg-[rgba(17,17,24,0.95)] backdrop-blur-xl
          rounded-2xl border border-white/[0.08]
          shadow-2xl overflow-hidden
        "
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06]">
          <Search className="w-5 h-5 text-slate-500 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            placeholder="Search pages, actions..."
            className="flex-1 bg-transparent text-lg text-white placeholder:text-slate-600 outline-none"
          />
          {query && (
            <button
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              className="text-slate-500 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/[0.08] text-[10px] text-slate-500 font-mono">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={resultsRef} className="max-h-[320px] overflow-y-auto py-2">
          {results.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-slate-500">
              No results found for &ldquo;{query}&rdquo;
            </div>
          ) : (
            Array.from(grouped.entries()).map(([category, items]) => (
              <div key={category}>
                <div className="px-4 py-1.5 text-[9px] uppercase tracking-widest text-slate-600 font-semibold">
                  {category}
                </div>
                {items.map((item) => {
                  const currentIndex = flatIndex++;
                  const isActive = currentIndex === activeIndex;
                  return (
                    <button
                      key={item.id}
                      data-index={currentIndex}
                      onClick={() => navigate(item.href)}
                      onMouseEnter={() => setActiveIndex(currentIndex)}
                      className={`
                        w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors
                        ${isActive ? 'bg-white/[0.04]' : ''}
                      `}
                    >
                      <span className={`flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`}>
                        {item.icon}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-medium truncate ${isActive ? 'text-white' : 'text-slate-300'}`}>
                          {item.label}
                        </div>
                        <div className="text-[11px] text-slate-600 truncate">
                          {item.description}
                        </div>
                      </div>
                      {isActive && (
                        <ArrowRight className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer hints */}
        <div className="flex items-center gap-4 px-4 py-2 border-t border-white/[0.06] text-[10px] text-slate-600">
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] font-mono">&#8593;&#8595;</kbd>
            Navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] font-mono">&#8629;</kbd>
            Open
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] font-mono">esc</kbd>
            Close
          </span>
        </div>
      </div>
    </div>
  );
}

// Trigger button for use in header bars
export function GlobalSearchTrigger() {
  const handleClick = () => {
    // Dispatch Cmd+K to open search
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true })
    );
  };

  return (
    <button
      onClick={handleClick}
      className="
        group relative w-full max-w-[480px] flex items-center gap-3 px-4 py-2.5 rounded-xl
        bg-white/[0.03] border border-white/[0.06]
        hover:bg-white/[0.06] hover:border-cyan-500/20
        transition-all duration-300 text-slate-500 hover:text-slate-300
        hover:shadow-[0_0_20px_rgba(6,182,212,0.08)]
      "
    >
      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/10 to-indigo-500/10 border border-white/[0.06] group-hover:border-cyan-500/20 transition-all">
        <Search className="w-4 h-4 text-cyan-400/70 group-hover:text-cyan-400 transition-colors" />
      </div>
      <span className="flex-1 text-left text-sm text-slate-500 group-hover:text-slate-400 transition-colors hidden sm:inline">
        Search agents, pages, actions...
      </span>
      <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06] text-[10px] font-mono text-slate-500 group-hover:border-cyan-500/15 transition-all">
        &#8984;K
      </kbd>
    </button>
  );
}

export default GlobalSearch;

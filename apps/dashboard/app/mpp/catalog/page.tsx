'use client';

import React, { useState, useEffect } from 'react';

interface CatalogProvider {
  id: string;
  name: string;
  category: string;
  description: string;
  endpoints: number;
  pricing: string;
  paymentMethods: ('stablecoin' | 'card')[];
  status: 'live' | 'coming_soon';
  icon: string;
  tags: string[];
}

interface CatalogMeta {
  totalProviders: number;
  totalEndpoints: number;
  categories: string[];
  paymentMethods: string[];
}

export default function CatalogPage() {
  const [providers, setProviders] = useState<CatalogProvider[]>([]);
  const [meta, setMeta] = useState<CatalogMeta | null>(null);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedPayment, setSelectedPayment] = useState<'all' | 'stablecoin' | 'card'>('all');

  useEffect(() => {
    fetch('/api/mpp/catalog')
      .then(r => r.json())
      .then(d => {
        setProviders(d.providers || []);
        setMeta(d.meta || null);
      })
      .catch(() => {});
  }, []);

  const categories = meta?.categories || [];

  const filtered = providers.filter(p => {
    if (selectedCategory !== 'All' && p.category !== selectedCategory) return false;
    if (selectedPayment !== 'all' && !p.paymentMethods.includes(selectedPayment)) return false;
    if (search) {
      const q = search.toLowerCase();
      return p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.tags.some(t => t.includes(q)) ||
        p.category.toLowerCase().includes(q);
    }
    return true;
  });

  const categoryGroups = filtered.reduce<Record<string, CatalogProvider[]>>((acc, p) => {
    (acc[p.category] = acc[p.category] || []).push(p);
    return acc;
  }, {});

  return (
    <div className="min-h-screen p-6 lg:p-8" style={{ background: 'var(--pp-bg-primary)' }}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3" style={{ color: 'var(--pp-text-primary)', fontFamily: 'var(--agt-font-display)' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, var(--agt-pink), var(--agt-orange))' }}>
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
              </div>
              API Catalog
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--pp-text-muted)' }}>
              {meta?.totalEndpoints || 0} endpoints from {meta?.totalProviders || 0} providers — no API keys needed
            </p>
          </div>
          <div className="flex items-center gap-2">
            <a href="https://mpp.dev" target="_blank" rel="noopener noreferrer"
              className="text-xs font-medium px-4 py-2 rounded-lg border transition-colors hover:bg-white/[0.04]"
              style={{ color: 'var(--pp-text-secondary)', borderColor: 'var(--pp-border)' }}>
              mpp.dev ↗
            </a>
            <a href="https://docs.paywithlocus.com" target="_blank" rel="noopener noreferrer"
              className="text-xs font-medium px-4 py-2 rounded-lg transition-colors"
              style={{ background: 'var(--agt-blue)', color: 'white' }}>
              Locus Docs ↗
            </a>
          </div>
        </div>

        {/* Hero Banner */}
        <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--pp-border)', background: 'linear-gradient(135deg, rgba(27, 191, 236, 0.08), rgba(62, 221, 185, 0.08), rgba(255, 45, 135, 0.04))' }}>
          <div className="p-6 md:p-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <p className="text-3xl font-bold font-mono" style={{ color: 'var(--agt-blue)' }}>{meta?.totalEndpoints || 183}</p>
                <p className="text-xs font-medium mt-1" style={{ color: 'var(--pp-text-muted)' }}>API Endpoints</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold font-mono" style={{ color: 'var(--agt-mint)' }}>{meta?.totalProviders || 25}</p>
                <p className="text-xs font-medium mt-1" style={{ color: 'var(--pp-text-muted)' }}>Providers</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold font-mono" style={{ color: 'var(--agt-pink)' }}>2</p>
                <p className="text-xs font-medium mt-1" style={{ color: 'var(--pp-text-muted)' }}>Payment Rails (USDC + Card)</p>
              </div>
            </div>
            <p className="text-center text-xs mt-4" style={{ color: 'var(--pp-text-muted)' }}>
              One wallet, one credential. Your agent pays per request — no signups, no API keys, no checkout flows.
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--pp-text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3" strokeLinecap="round" strokeWidth={2}/></svg>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search providers, APIs, tags..."
              className="mpp-input pl-10"
              style={{ width: '100%' }}
            />
          </div>

          {/* Category Filter */}
          <div className="flex gap-1 flex-wrap">
            {['All', ...categories].map(cat => (
              <button key={cat} onClick={() => setSelectedCategory(cat)}
                className="text-[11px] font-medium px-3 py-1.5 rounded-lg transition-all whitespace-nowrap"
                style={{
                  background: selectedCategory === cat ? 'var(--agt-blue)' : 'var(--pp-bg-card)',
                  color: selectedCategory === cat ? 'white' : 'var(--pp-text-muted)',
                  border: `1px solid ${selectedCategory === cat ? 'var(--agt-blue)' : 'var(--pp-border)'}`,
                }}
              >{cat}</button>
            ))}
          </div>

          {/* Payment Filter */}
          <div className="flex gap-1 p-0.5 rounded-lg flex-shrink-0" style={{ background: 'var(--pp-bg-card)', border: '1px solid var(--pp-border)' }}>
            {[
              { key: 'all' as const, label: 'All' },
              { key: 'stablecoin' as const, label: '💎 USDC' },
              { key: 'card' as const, label: '💳 Card' },
            ].map(m => (
              <button key={m.key} onClick={() => setSelectedPayment(m.key)}
                className="text-[11px] font-medium px-3 py-1.5 rounded-md transition-all"
                style={{
                  background: selectedPayment === m.key ? 'var(--pp-bg-elevated)' : 'transparent',
                  color: selectedPayment === m.key ? 'var(--pp-text-primary)' : 'var(--pp-text-muted)',
                }}
              >{m.label}</button>
            ))}
          </div>
        </div>

        {/* Provider Grid */}
        {Object.keys(categoryGroups).length === 0 ? (
          <div className="rounded-xl border py-16 text-center" style={{ background: 'var(--pp-bg-card)', borderColor: 'var(--pp-border)' }}>
            <div className="text-4xl mb-3">🔍</div>
            <p className="text-sm" style={{ color: 'var(--pp-text-muted)' }}>No providers match your search</p>
          </div>
        ) : (
          Object.entries(categoryGroups).map(([category, items]) => (
            <div key={category}>
              <h2 className="text-sm font-bold uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: 'var(--pp-text-muted)' }}>
                {category}
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: 'var(--pp-bg-elevated)' }}>{items.length}</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {items.map(provider => (
                  <div key={provider.id}
                    className="rounded-xl border p-4 transition-all hover:shadow-lg group cursor-default"
                    style={{ background: 'var(--pp-bg-card)', borderColor: 'var(--pp-border)' }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="text-2xl">{provider.icon}</div>
                        <div>
                          <h3 className="text-sm font-bold" style={{ color: 'var(--pp-text-primary)' }}>{provider.name}</h3>
                          <p className="text-[10px] font-mono" style={{ color: 'var(--pp-text-muted)' }}>{provider.endpoints} endpoints</p>
                        </div>
                      </div>
                      <div className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        provider.status === 'live'
                          ? 'text-emerald-400 bg-emerald-400/10'
                          : 'text-amber-400 bg-amber-400/10'
                      }`}>
                        {provider.status === 'live' ? 'Live' : 'Soon'}
                      </div>
                    </div>

                    <p className="text-xs mb-3" style={{ color: 'var(--pp-text-secondary)' }}>{provider.description}</p>

                    <div className="flex items-center justify-between">
                      <div className="flex gap-1">
                        {provider.paymentMethods.map(m => (
                          <span key={m} className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ background: 'var(--pp-bg-elevated)', color: 'var(--pp-text-muted)' }}>
                            {m === 'stablecoin' ? '💎 USDC' : '💳 Card'}
                          </span>
                        ))}
                      </div>
                      <span className="text-[10px] font-mono font-semibold" style={{ color: 'var(--agt-mint)' }}>{provider.pricing}</span>
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {provider.tags.slice(0, 4).map(tag => (
                        <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: 'var(--pp-bg-elevated)', color: 'var(--pp-text-muted)' }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}

        {/* Bottom CTA */}
        <div className="rounded-xl border p-6 text-center" style={{ background: 'var(--pp-bg-card)', borderColor: 'var(--pp-border)' }}>
          <h3 className="text-sm font-bold mb-2" style={{ color: 'var(--pp-text-primary)' }}>Want to list your API on MPP?</h3>
          <p className="text-xs mb-4" style={{ color: 'var(--pp-text-muted)' }}>
            Add your API endpoints to the MPP registry and get paid per request — stablecoins or cards.
          </p>
          <div className="flex items-center justify-center gap-3">
            <a href="https://mpp.dev" target="_blank" rel="noopener noreferrer"
              className="text-xs font-medium px-5 py-2.5 rounded-lg transition-colors"
              style={{ background: 'var(--agt-blue)', color: 'white' }}>
              Learn More at mpp.dev
            </a>
            <a href="https://app.paywithlocus.com" target="_blank" rel="noopener noreferrer"
              className="text-xs font-medium px-5 py-2.5 rounded-lg border transition-colors hover:bg-white/[0.04]"
              style={{ color: 'var(--pp-text-secondary)', borderColor: 'var(--pp-border)' }}>
              Locus Dashboard
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

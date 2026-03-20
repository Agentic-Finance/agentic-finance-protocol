'use client';
import React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';

const routeLabels: Record<string, string> = {
  cortex: 'Cortex',
  stream: 'Streams',
  swarm: 'Swarm Hub',
  sentinel: 'Sentinel',
  shield: 'Shield',
  revenue: 'Revenue',
  wallets: 'Wallets',
  admin: 'Admin',
  developers: 'Developers',
  warroom: 'War Room',
  audit: 'Audit',
};

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);

  if (segments.length === 0) {
    return null;
  }

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[11px]">
      <Link
        href="/?app=1"
        className="text-slate-500 hover:text-white transition-colors flex-shrink-0"
        aria-label="Home"
      >
        <Home className="w-3.5 h-3.5" />
      </Link>

      {segments.map((segment, index) => {
        const href = '/' + segments.slice(0, index + 1).join('/');
        const label = routeLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
        const isLast = index === segments.length - 1;

        return (
          <React.Fragment key={href}>
            <ChevronRight className="w-3 h-3 text-slate-600 flex-shrink-0" />
            {isLast ? (
              <span className="text-slate-300 font-medium truncate">{label}</span>
            ) : (
              <Link
                href={href}
                className="text-slate-500 hover:text-white transition-colors truncate"
              >
                {label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}

export default Breadcrumbs;

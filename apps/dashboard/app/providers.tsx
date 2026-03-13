'use client';

/**
 * Root Providers
 * Wraps the app with Wagmi + React Query for wallet connection & on-chain reads
 */
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { wagmiConfig } from './lib/tempo/wagmi-config';
import { type ReactNode, useState } from 'react';

export function Providers({ children }: { children: ReactNode }) {
  // Create QueryClient per-instance to avoid SSR state leak
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Stale time: 30s — avoid refetching on every render
            staleTime: 30_000,
            // Don't refetch on window focus (dashboard stays open)
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}

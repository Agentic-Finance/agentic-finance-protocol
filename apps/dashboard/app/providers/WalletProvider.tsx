'use client';
import React from 'react';
import { WagmiProvider, http } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider, darkTheme, getDefaultConfig } from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';

const tempoChain = {
  id: 42431,
  name: 'Tempo Moderato',
  nativeCurrency: { name: 'TEMPO', symbol: 'TEMPO', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.moderato.tempo.xyz'] } },
  blockExplorers: { default: { name: 'Explorer', url: 'https://explore.moderato.tempo.xyz' } },
} as const;

let config: ReturnType<typeof getDefaultConfig>;
try {
  config = getDefaultConfig({
    appName: 'Agentic Finance',
    projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'agentic-finance-dev',
    chains: [tempoChain],
    transports: { [tempoChain.id]: http('https://rpc.moderato.tempo.xyz') },
    ssr: true,
  });
} catch (e) {
  console.warn('[WalletProvider] Failed to init config, using minimal fallback:', e);
  config = getDefaultConfig({
    appName: 'Agentic Finance',
    projectId: 'agentic-finance-dev',
    chains: [tempoChain],
    transports: { [tempoChain.id]: http('https://rpc.moderato.tempo.xyz') },
    ssr: true,
    wallets: [],
  });
}

const queryClient = new QueryClient();

export function WalletProvider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={darkTheme({ accentColor: '#06b6d4', borderRadius: 'medium' })}>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

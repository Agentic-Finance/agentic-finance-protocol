'use client';

import React from 'react';
import { PrivyProvider as PrivySDKProvider } from '@privy-io/react-auth';
import { tempoModerato } from '../lib/tempo/chain';

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID || 'cmmwz85ft01kp0cl20nckvno7';

const tempoChain = {
    id: tempoModerato.id,
    name: tempoModerato.name,
    network: 'tempo-moderato',
    nativeCurrency: tempoModerato.nativeCurrency,
    rpcUrls: tempoModerato.rpcUrls,
    blockExplorers: tempoModerato.blockExplorers,
} as any;

export default function PrivyProvider({ children }: { children: React.ReactNode }) {
    return (
        <PrivySDKProvider
            appId={PRIVY_APP_ID}
            config={{
                appearance: {
                    theme: 'dark',
                    accentColor: '#10b981',
                    logo: 'https://agt.finance/logo-v2.png',
                },
                loginMethods: ['google', 'discord', 'twitter', 'email', 'wallet'],
                embeddedWallets: {
                    ethereum: {
                        createOnLogin: 'users-without-wallets',
                    },
                },
                defaultChain: tempoChain,
                supportedChains: [tempoChain],
            }}
        >
            {children}
        </PrivySDKProvider>
    );
}

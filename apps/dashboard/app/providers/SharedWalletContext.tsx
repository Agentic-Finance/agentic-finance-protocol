'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';

interface SharedWalletState {
    /** Connected wallet address (from Privy or MetaMask) */
    walletAddress: string | null;
    /** Whether wallet is connected */
    isConnected: boolean;
    /** Whether the provider is still loading */
    isLoading: boolean;
    /** Connect wallet (triggers Privy login or MetaMask) */
    connect: () => Promise<void>;
    /** Disconnect wallet */
    disconnect: () => void;
    /** User display name (from Privy) */
    displayName: string | null;
    /** Auth method used (google, discord, wallet, etc.) */
    authMethod: string | null;
}

const SharedWalletContext = createContext<SharedWalletState>({
    walletAddress: null,
    isConnected: false,
    isLoading: true,
    connect: async () => {},
    disconnect: () => {},
    displayName: null,
    authMethod: null,
});

export function useSharedWallet() {
    return useContext(SharedWalletContext);
}

export function SharedWalletProvider({ children }: { children: React.ReactNode }) {
    const { ready, authenticated, user, login, logout } = usePrivy();
    const { wallets } = useWallets();
    const [walletAddress, setWalletAddress] = useState<string | null>(null);

    // Derive wallet from Privy user or connected wallets
    useEffect(() => {
        if (!ready) return;

        if (authenticated && user) {
            // Try Privy embedded wallet first
            const privyWallet = (user.wallet as any)?.address
                || (user.linkedAccounts?.find((a: any) => a.type === 'wallet') as any)?.address;

            if (privyWallet) {
                setWalletAddress(privyWallet);
                return;
            }

            // Try connected wallets from useWallets
            if (wallets.length > 0) {
                setWalletAddress(wallets[0].address);
                return;
            }
        }

        // Try MetaMask/external wallet as fallback
        if (typeof window !== 'undefined' && (window as any).ethereum) {
            (window as any).ethereum.request({ method: 'eth_accounts' })
                .then((accounts: string[]) => {
                    if (accounts.length > 0) setWalletAddress(accounts[0]);
                    else if (!authenticated) setWalletAddress(null);
                })
                .catch(() => {});
        } else if (!authenticated) {
            setWalletAddress(null);
        }
    }, [ready, authenticated, user, wallets]);

    // Listen for MetaMask account changes
    useEffect(() => {
        if (typeof window === 'undefined' || !(window as any).ethereum) return;
        const handler = (accounts: string[]) => {
            if (accounts.length > 0) setWalletAddress(accounts[0]);
        };
        (window as any).ethereum.on('accountsChanged', handler);
        return () => { (window as any).ethereum.removeListener('accountsChanged', handler); };
    }, []);

    const connect = useCallback(async () => {
        // Try Privy login (supports Google, Discord, email, wallet)
        try {
            login();
        } catch {
            // Fallback to MetaMask
            if (typeof window !== 'undefined' && (window as any).ethereum) {
                const accounts = await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
                if (accounts?.[0]) setWalletAddress(accounts[0]);
            }
        }
    }, [login]);

    const disconnect = useCallback(() => {
        logout();
        setWalletAddress(null);
    }, [logout]);

    const displayName = useMemo(() => {
        if (!user) return null;
        if (user.google?.name) return user.google.name;
        if (user.discord?.username) return user.discord.username;
        if (user.twitter?.username) return `@${user.twitter.username}`;
        if (user.email?.address) return user.email.address;
        if (walletAddress) return `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
        return null;
    }, [user, walletAddress]);

    const authMethod = useMemo(() => {
        if (!user) return null;
        if (user.google) return 'google';
        if (user.discord) return 'discord';
        if (user.twitter) return 'twitter';
        if (user.email) return 'email';
        if (user.wallet) return 'wallet';
        return null;
    }, [user]);

    const value = useMemo<SharedWalletState>(() => ({
        walletAddress,
        isConnected: !!walletAddress,
        isLoading: !ready,
        connect,
        disconnect,
        displayName,
        authMethod,
    }), [walletAddress, ready, connect, disconnect, displayName, authMethod]);

    return (
        <SharedWalletContext.Provider value={value}>
            {children}
        </SharedWalletContext.Provider>
    );
}

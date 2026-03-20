'use client';

/**
 * useWallet Hook
 * Unified wallet connection interface wrapping wagmi hooks
 *
 * Usage:
 *   const { address, isConnected, connect, disconnect, balance, shortAddress } = useWallet();
 */
import { useAccount, useConnect, useDisconnect, useBalance } from 'wagmi';
import { useCallback } from 'react';

export function useWallet() {
  const { address, isConnected, chain } = useAccount();
  const { connectAsync, connectors, isPending: isConnecting } = useConnect();
  const { disconnectAsync } = useDisconnect();
  const { data: balanceData } = useBalance({ address });

  const connect = useCallback(async () => {
    try {
      // Use the first available connector (injected/MetaMask)
      const connector = connectors[0];
      if (connector) {
        await connectAsync({ connector });
      }
    } catch (err) {
      console.error('[useWallet] Connect failed:', err);
    }
  }, [connectAsync, connectors]);

  const disconnect = useCallback(async () => {
    try {
      await disconnectAsync();
    } catch (err) {
      console.error('[useWallet] Disconnect failed:', err);
    }
  }, [disconnectAsync]);

  // Truncated address for display: 0x33F7...0793
  const displayAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : null;

  return {
    address: address ?? null,
    displayAddress,
    shortAddress: displayAddress || '',
    isConnected,
    isConnecting,
    chain: chain ?? null,
    chainId: chain?.id,
    balance: balanceData ? Number(balanceData.value) / Math.pow(10, balanceData.decimals) : 0,
    connect,
    disconnect,
  };
}

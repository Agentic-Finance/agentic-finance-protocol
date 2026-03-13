/**
 * Wagmi Configuration for Tempo Moderato
 * Client-side wallet connection (MetaMask, injected wallets)
 *
 * Note: We import injected() directly from @wagmi/core to avoid
 * pulling in optional peer deps (walletconnect, safe, porto).
 */
import { http, createConfig, type Config } from 'wagmi';
import { tempoModerato } from './chain';

export const wagmiConfig: Config = createConfig({
  chains: [tempoModerato],
  transports: {
    [tempoModerato.id]: http(),
  },
  // SSR: disable auto-connect on server-side
  ssr: true,
});

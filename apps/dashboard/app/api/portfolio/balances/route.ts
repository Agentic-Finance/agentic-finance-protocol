import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';

const TEMPO_RPC = 'https://rpc.moderato.tempo.xyz';
const TEMPO_TOKENS = [
    { address: '0x20c0000000000000000000000000000000000001', symbol: 'AlphaUSD', name: 'Alpha Stablecoin', decimals: 6, logo: 'https://assets.coingecko.com/coins/images/6319/small/usdc.png' },
    { address: '0x20c0000000000000000000000000000000000000', symbol: 'pathUSD', name: 'Path Dollar', decimals: 6, logo: 'https://assets.coingecko.com/coins/images/325/small/Tether.png' },
    { address: '0x20c0000000000000000000000000000000000002', symbol: 'BetaUSD', name: 'Beta Dollar', decimals: 6, logo: 'https://assets.coingecko.com/coins/images/9956/small/Badge_Dai.png' },
    { address: '0x20c0000000000000000000000000000000000003', symbol: 'ThetaUSD', name: 'Theta Dollar', decimals: 6, logo: 'https://assets.coingecko.com/coins/images/6319/small/usdc.png' },
];

const ERC20_ABI = ['function balanceOf(address) view returns (uint256)'];

const CHAINS = [
    { id: 1, name: 'Ethereum', color: '#627EEA', logo: 'https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/chains/ethereum.svg' },
    { id: 137, name: 'Polygon', color: '#8247E5', logo: 'https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/chains/polygon.svg' },
    { id: 8453, name: 'Base', color: '#0052FF', logo: 'https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/chains/base.svg' },
    { id: 42161, name: 'Arbitrum', color: '#12AAFF', logo: 'https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/chains/arbitrum.svg' },
    { id: 10, name: 'Optimism', color: '#FF0420', logo: 'https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/chains/optimism.svg' },
    { id: 42431, name: 'Tempo', color: '#3EDDB9', logo: 'https://agt.finance/logo-v2.png' },
];

export async function GET(req: NextRequest) {
    const wallet = req.nextUrl.searchParams.get('wallet');
    if (!wallet) return NextResponse.json({ error: 'wallet required' }, { status: 400 });

    const allTokens: any[] = [];

    // Fetch Tempo balances (real on-chain via RPC)
    try {
        const provider = new ethers.JsonRpcProvider(TEMPO_RPC);
        for (const token of TEMPO_TOKENS) {
            try {
                const contract = new ethers.Contract(token.address, ERC20_ABI, provider);
                const raw = await contract.balanceOf(wallet);
                const balance = parseFloat(ethers.formatUnits(raw, token.decimals));
                allTokens.push({
                    symbol: token.symbol, name: token.name,
                    balance: balance.toFixed(2), valueUSD: balance,
                    chain: 'Tempo', chainId: 42431,
                    chainLogo: CHAINS[5].logo, chainColor: CHAINS[5].color,
                    logo: token.logo, address: token.address, change24h: 0,
                });
            } catch {}
        }
    } catch {}

    // Fetch multi-chain balances via LI.FI token balances API
    for (const chain of CHAINS.filter(c => c.id !== 42431)) {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000);
            const res = await fetch(
                `https://li.quest/v1/token/balances?walletAddress=${wallet}&chainId=${chain.id}`,
                { headers: { 'Accept': 'application/json' }, signal: controller.signal }
            );
            clearTimeout(timeout);
            if (res.ok) {
                const data = await res.json();
                if (data.tokens) {
                    for (const t of data.tokens) {
                        const bal = parseFloat(t.amount || '0') / Math.pow(10, t.decimals || 18);
                        if (bal > 0.0001) {
                            allTokens.push({
                                symbol: t.symbol || '???', name: t.name || t.symbol || 'Unknown',
                                balance: bal > 1000 ? bal.toFixed(2) : bal.toFixed(6),
                                valueUSD: parseFloat(t.priceUSD || '0') * bal,
                                chain: chain.name, chainId: chain.id,
                                chainLogo: chain.logo, chainColor: chain.color,
                                logo: t.logoURI || `https://assets.coingecko.com/coins/images/279/small/ethereum.png`,
                                address: t.address || 'native', change24h: 0,
                            });
                        }
                    }
                }
            }
        } catch {}
    }

    const totalValue = allTokens.reduce((sum, t) => sum + (t.valueUSD || 0), 0);
    const chainBreakdown = CHAINS.map(c => ({
        ...c,
        value: allTokens.filter(t => t.chainId === c.id).reduce((s, t) => s + (t.valueUSD || 0), 0),
        tokenCount: allTokens.filter(t => t.chainId === c.id).length,
    }));

    return NextResponse.json({
        tokens: allTokens.sort((a, b) => (b.valueUSD || 0) - (a.valueUSD || 0)),
        totalValue,
        chainBreakdown,
        chains: chainBreakdown.filter(c => c.tokenCount > 0).length,
    });
}

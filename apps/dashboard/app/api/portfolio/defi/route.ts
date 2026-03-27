import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';

const RPC = 'https://rpc.moderato.tempo.xyz';
const NEXUS_V2 = '0x6A467Cd4156093bB528e448C04366586a1052Fab';
const SHIELD_V2 = '0x3B4b47971B61cB502DD97eAD9cAF0552ffae0055';
const STREAM_V1 = '0x4fE37c46E3D442129c2319de3D24c21A6cbfa36C';
const TOKEN = '0x20c0000000000000000000000000000000000001';

const ERC20_ABI = ['function balanceOf(address) view returns (uint256)'];
const NEXUS_ABI = ['function jobCounter() view returns (uint256)'];
const SHIELD_ABI = ['function totalDeposits() view returns (uint256)'];

export async function GET(req: NextRequest) {
    const wallet = req.nextUrl.searchParams.get('wallet');
    if (!wallet) return NextResponse.json({ error: 'wallet required' }, { status: 400 });

    const provider = new ethers.JsonRpcProvider(RPC);
    const positions: any[] = [];

    // Shield Vault balance
    try {
        const token = new ethers.Contract(TOKEN, ERC20_ABI, provider);
        const shieldBal = await token.balanceOf(SHIELD_V2);
        const val = parseFloat(ethers.formatUnits(shieldBal, 6));
        positions.push({
            protocol: 'Shield Vault', type: 'Privacy Pool', icon: '🛡️',
            chain: 'Tempo', value: val, valueFormatted: `$${val.toFixed(2)}`,
            description: 'ZK-SNARK PLONK private payment pool',
            address: SHIELD_V2,
        });
    } catch {}

    // Escrow (NexusV2) balance
    try {
        const token = new ethers.Contract(TOKEN, ERC20_ABI, provider);
        const escrowBal = await token.balanceOf(NEXUS_V2);
        const val = parseFloat(ethers.formatUnits(escrowBal, 6));
        positions.push({
            protocol: 'Escrow (NexusV2)', type: 'Active Escrows', icon: '🔐',
            chain: 'Tempo', value: val, valueFormatted: `$${val.toFixed(2)}`,
            description: 'Trustless escrow with dispute resolution',
            address: NEXUS_V2,
        });
    } catch {}

    // Stream (StreamV1) balance
    try {
        const token = new ethers.Contract(TOKEN, ERC20_ABI, provider);
        const streamBal = await token.balanceOf(STREAM_V1);
        const val = parseFloat(ethers.formatUnits(streamBal, 6));
        positions.push({
            protocol: 'Payment Streams', type: 'Streaming', icon: '📡',
            chain: 'Tempo', value: val, valueFormatted: `$${val.toFixed(2)}`,
            description: 'Per-second salary streaming',
            address: STREAM_V1,
        });
    } catch {}

    const totalValue = positions.reduce((s, p) => s + p.value, 0);

    return NextResponse.json({ positions, totalValue });
}

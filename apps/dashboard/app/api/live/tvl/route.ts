import { NextResponse } from 'next/server';

// TVL endpoint for live dashboard
// Returns current Total Value Locked across protocol modules

export async function GET() {
  // Try to fetch real TVL from on-chain data
  try {
    const { ethers } = await import('ethers');
    const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc.moderato.tempo.xyz';
    const SHIELD_ADDRESS = process.env.NEXT_PUBLIC_SHIELD_ADDRESS || '0x3B4b47971B61cB502DD97eAD9cAF0552ffae0055';
    const NEXUS_V2_ADDRESS = process.env.NEXT_PUBLIC_NEXUS_V2_ADDRESS || '0x6A467Cd4156093bB528e448C04366586a1052Fab';
    const MULTISEND_ADDRESS = process.env.NEXT_PUBLIC_MULTISEND_ADDRESS || '0x25f4d3f12C579002681a52821F3a6251c46D4575';
    const TOKEN_ADDRESS = '0x20c0000000000000000000000000000000000001';

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const token = new ethers.Contract(TOKEN_ADDRESS, [
      'function balanceOf(address) view returns (uint256)'
    ], provider);

    const [escrowBal, shieldBal, multisendBal] = await Promise.all([
      token.balanceOf(NEXUS_V2_ADDRESS).catch(() => BigInt(0)),
      token.balanceOf(SHIELD_ADDRESS).catch(() => BigInt(0)),
      token.balanceOf(MULTISEND_ADDRESS).catch(() => BigInt(0)),
    ]);

    const escrow = Number(ethers.formatUnits(escrowBal, 6));
    const shield = Number(ethers.formatUnits(shieldBal, 6));
    const multisend = Number(ethers.formatUnits(multisendBal, 6));

    return NextResponse.json({
      escrow: Math.round(escrow * 100) / 100,
      shield: Math.round(shield * 100) / 100,
      multisend: Math.round(multisend * 100) / 100,
      total: Math.round((escrow + shield + multisend) * 100) / 100,
    });
  } catch (error) {
    // Fallback to reasonable defaults if RPC fails
    return NextResponse.json({
      escrow: 0,
      shield: 0,
      multisend: 0,
      total: 0,
    });
  }
}

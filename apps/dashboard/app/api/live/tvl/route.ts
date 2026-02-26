import { NextResponse } from 'next/server';

// TVL endpoint for live dashboard
// Returns current Total Value Locked across protocol modules

export async function GET() {
  // Try to fetch real TVL from on-chain data
  try {
    const { ethers } = await import('ethers');
    const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc.testnet.monad.xyz';
    const SHIELD_ADDRESS = process.env.NEXT_PUBLIC_SHIELD_ADDRESS || '0x06507B3E94f0d3F46fb7487B6e0e5f57eE7b4924';
    const NEXUS_V2_ADDRESS = process.env.NEXT_PUBLIC_NEXUS_V2_ADDRESS || '0x63e8DFBd48F7a119c21B83e9CbA0F3f8C2e20377';
    const MULTISEND_ADDRESS = process.env.NEXT_PUBLIC_MULTISEND_ADDRESS || '0x63e8DFBd48F7a119c21B83e9CbA0F3f8C2e20377';
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

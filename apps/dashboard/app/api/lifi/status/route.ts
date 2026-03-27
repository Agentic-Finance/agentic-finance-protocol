import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const txHash = searchParams.get('txHash') || '';
    const bridge = searchParams.get('bridge') || '';
    const fromChain = searchParams.get('fromChain') || '';
    const toChain = searchParams.get('toChain') || '';
    try {
        const url = new URL('https://li.quest/v1/status');
        if (txHash) url.searchParams.set('txHash', txHash);
        if (bridge) url.searchParams.set('bridge', bridge);
        if (fromChain) url.searchParams.set('fromChain', fromChain);
        if (toChain) url.searchParams.set('toChain', toChain);
        const res = await fetch(url.toString(), { headers: { 'Accept': 'application/json' } });
        const data = await res.json();
        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

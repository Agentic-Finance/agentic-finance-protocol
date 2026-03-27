import { NextRequest, NextResponse } from 'next/server';

const LIFI_API = 'https://li.quest/v1';
const INTEGRATOR = 'agt.finance';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const fromChain = searchParams.get('fromChain') || 'POL';
    const toChain = searchParams.get('toChain') || 'ETH';
    const fromToken = searchParams.get('fromToken') || 'USDC';
    const toToken = searchParams.get('toToken') || 'ETH';
    const fromAddress = searchParams.get('fromAddress') || '';
    const fromAmount = searchParams.get('fromAmount') || '1000000';

    try {
        const url = new URL(`${LIFI_API}/quote`);
        url.searchParams.set('fromChain', fromChain);
        url.searchParams.set('toChain', toChain);
        url.searchParams.set('fromToken', fromToken);
        url.searchParams.set('toToken', toToken);
        url.searchParams.set('fromAddress', fromAddress);
        url.searchParams.set('fromAmount', fromAmount);
        url.searchParams.set('integrator', INTEGRATOR);

        const res = await fetch(url.toString(), { headers: { 'Accept': 'application/json' }, next: { revalidate: 30 } });
        const data = await res.json();
        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

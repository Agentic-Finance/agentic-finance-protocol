import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const chains = searchParams.get('chains') || '1,137,42161,8453';
    try {
        const res = await fetch(`https://li.quest/v1/tokens?chains=${chains}`, { headers: { 'Accept': 'application/json' }, next: { revalidate: 3600 } });
        const data = await res.json();
        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

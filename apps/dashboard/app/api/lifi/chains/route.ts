import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const res = await fetch('https://li.quest/v1/chains', { headers: { 'Accept': 'application/json' }, next: { revalidate: 3600 } });
        const data = await res.json();
        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

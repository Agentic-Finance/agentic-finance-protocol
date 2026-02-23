// app/api/hash/route.ts
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const { secret, amount, recipient } = await req.json();
        
        // Import circomlibjs dynamically in Node.js environment
        const circomlibjs = require("circomlibjs");
        const poseidon = await circomlibjs.buildPoseidon();
        
        // Poseidon hash expects BigInt inputs
        // hasher.inputs[0] <== adminSecret; [1] <== amount; [2] <== recipient;
        const hash = poseidon([
            BigInt(secret), 
            BigInt(amount), 
            BigInt(recipient)
        ]);
        
        // Convert the resulting Uint8Array to string representation of the finite field
        const commitmentStr = poseidon.F.toString(hash);
        
        return NextResponse.json({ commitment: commitmentStr });
    } catch (error: any) {
        console.error("Backend Poseidon Hashing Error:", error);
        return NextResponse.json({ error: error.message || "Failed to compute Poseidon hash" }, { status: 500 });
    }
}
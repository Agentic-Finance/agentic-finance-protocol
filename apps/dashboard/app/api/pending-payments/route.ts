import { NextResponse } from 'next/server';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';

// Force Next.js to NEVER cache this API response
export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const dbPath = path.resolve(process.cwd(), '../../../payroll.db');
        const db = await open({
            filename: dbPath,
            driver: sqlite3.Database
        });

        // Fetch raw data from database
        const employees = await db.all('SELECT * FROM employees WHERE status = "Pending"');
        await db.close();

        // MAPPING FIX: Map database column 'wallet_address' to 'address' for the frontend
        const formattedEmployees = employees.map(emp => ({
            id: emp.id,
            name: emp.name,
            address: emp.wallet_address, // <- This connects the DB to the UI
            amount: emp.amount,
            token: emp.token || 'AlphaUSD',
            status: emp.status
        }));

        return NextResponse.json(formattedEmployees);
    } catch (error) {
        console.error("Database Error:", error);
        return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
    }
}
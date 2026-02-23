import { NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";

export async function GET() {
    try {
        // ==========================================
        // 1. GENERATE STANDARD 7-DAY TIME-FRAME (ZERO-FILL)
        // Always return the last 7 days so the Recharts component has 
        // sufficient coordinates to render continuous lines.
        // ==========================================
        const last7Days = Array.from({ length: 7 }).map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (6 - i)); // Sort from past (6 days ago) to present (0)
            return {
                name: d.toLocaleDateString('en-US', { weekday: 'short' }), // Display: Mon, Tue...
                fullDate: d.toLocaleDateString('en-US'), // Internal key for database matching
                volume: 0 // Initialize with zero
            };
        });

        // ==========================================
        // 2. FETCH DATA FROM PRISMA (FILTER LAST 7 DAYS)
        // ==========================================
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const records = await prisma.payoutRecord.findMany({
            where: {
                createdAt: {
                    gte: sevenDaysAgo // Greater than or equal to 7 days ago
                }
            }
        });

        // ==========================================
        // 3. INJECT PRODUCTION DATA INTO TIME-FRAME
        // Aggregate total amount for transactions occurring on the same day
        // ==========================================
        records.forEach(record => {
            const recordDate = new Date(record.createdAt).toLocaleDateString('en-US');
            
            // Match record date with the corresponding day in our 7-day frame
            const dayIndex = last7Days.findIndex(day => day.fullDate === recordDate);
            if (dayIndex !== -1) {
                last7Days[dayIndex].volume += record.amount;
            }
        });

        // ==========================================
        // 4. FORMAT OUTPUT
        // Strip fullDate to optimize payload size for the frontend
        // ==========================================
        const finalData = last7Days.map(day => ({
            name: day.name,
            volume: parseFloat(day.volume.toFixed(3))
        }));

        return NextResponse.json(
            { success: true, data: finalData },
            {
                headers: {
                    "Cache-Control": "s-maxage=30, stale-while-revalidate=60",
                },
            }
        );

    } catch (error) {
        console.error("[Chart-API] Failed to generate time-series data:", error);
        return NextResponse.json({ success: false, error: "Failed to fetch chart data" }, { status: 500 });
    }
}

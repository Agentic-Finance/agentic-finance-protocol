import { NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";

export async function GET() {
  try {
    // 1. Use Prisma aggregate queries instead of fetching all records
    const [aggregates, last24hCount] = await Promise.all([
      prisma.payoutRecord.aggregate({
        _sum: { amount: true },
        _count: { id: true },
      }),
      prisma.payoutRecord.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    const totalVolume = aggregates._sum.amount ?? 0;
    const transactionCount = aggregates._count.id;
    const avgPayout = transactionCount > 0 ? totalVolume / transactionCount : 0;

    return NextResponse.json(
      {
        success: true,
        stats: {
          totalShieldedVolume: totalVolume.toLocaleString(),
          totalExecutions: transactionCount,
          averageAgentPayout: avgPayout.toFixed(2),
          active24h: last24hCount,
          networkIntegrity: "99.9%", // Simulated ZK-Proof success rate
        },
      },
      {
        headers: {
          "Cache-Control": "s-maxage=10, stale-while-revalidate=30",
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}

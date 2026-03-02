import { apiSuccess, apiError } from "@/app/lib/api-response";
import prisma from "@/app/lib/prisma";

export async function GET() {
  try {
    // Query both payoutRecord (payroll) and timeVaultPayload (shield) for combined stats
    const [payrollAgg, shieldAgg, payroll24h, shield24h, shieldTotal, shieldCompleted] = await Promise.all([
      // Payroll stats
      prisma.payoutRecord.aggregate({
        _sum: { amount: true },
        _count: { id: true },
      }),
      // Shield stats (all shielded entries)
      prisma.timeVaultPayload.aggregate({
        where: { isShielded: true },
        _sum: { amount: true },
        _count: { id: true },
      }),
      // Payroll last 24h
      prisma.payoutRecord.count({
        where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      }),
      // Shield last 24h
      prisma.timeVaultPayload.count({
        where: {
          isShielded: true,
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      }),
      // Total shield entries (all statuses)
      prisma.timeVaultPayload.count({
        where: { isShielded: true },
      }),
      // Successfully completed shield entries
      prisma.timeVaultPayload.count({
        where: { isShielded: true, status: "COMPLETED" },
      }),
    ]);

    const payrollVolume = payrollAgg._sum.amount ?? 0;
    const shieldVolume = shieldAgg._sum.amount ?? 0;
    const totalVolume = payrollVolume + shieldVolume;
    const totalExecutions = (payrollAgg._count.id) + (shieldAgg._count.id);
    const active24h = payroll24h + shield24h;

    // Network integrity = completed / total shielded (or 100% if no shield transactions)
    const integrity = shieldTotal > 0
      ? ((shieldCompleted / shieldTotal) * 100).toFixed(1) + "%"
      : "100%";

    const response = apiSuccess({
      stats: {
        totalShieldedVolume: totalVolume.toLocaleString(),
        totalExecutions,
        averageAgentPayout: totalExecutions > 0 ? (totalVolume / totalExecutions).toFixed(2) : "0.00",
        active24h,
        networkIntegrity: integrity,
      },
    });
    response.headers.set("Cache-Control", "s-maxage=10, stale-while-revalidate=30");
    return response;
  } catch (error) {
    return apiError("Failed to fetch stats", 500);
  }
}

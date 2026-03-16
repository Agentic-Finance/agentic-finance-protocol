/**
 * /api/intel/market — Browse Intelligence Marketplace
 *
 * GET: List intel submissions with filters
 */

import prisma from '../../../lib/prisma';
import { apiSuccess, logAndReturn } from '@/app/lib/api-response';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const status = searchParams.get('status');
    const minPrice = parseFloat(searchParams.get('minPrice') || '0');
    const maxPrice = parseFloat(searchParams.get('maxPrice') || '999999');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50') || 50, 200);
    const offset = parseInt(searchParams.get('offset') || '0');
    const sort = searchParams.get('sort') || 'newest'; // newest, price_asc, price_desc, quality

    const where: any = {};
    if (category) where.category = category;
    if (status) where.status = status;
    where.price = { gte: minPrice, lte: maxPrice };

    // Determine sort order
    let orderBy: any = { createdAt: 'desc' };
    if (sort === 'price_asc') orderBy = { price: 'asc' };
    else if (sort === 'price_desc') orderBy = { price: 'desc' };
    else if (sort === 'quality') orderBy = { qualityScore: 'desc' };

    const [submissions, total, categoryStats] = await Promise.all([
      prisma.intelSubmission.findMany({
        where,
        orderBy,
        take: limit,
        skip: offset,
      }),
      prisma.intelSubmission.count({ where }),
      // Category breakdown
      prisma.intelSubmission.groupBy({
        by: ['category'],
        _count: true,
        _avg: { price: true, qualityScore: true },
      }),
    ]);

    return apiSuccess({
      submissions,
      total,
      categories: categoryStats.map((c) => ({
        name: c.category,
        count: c._count,
        avgPrice: Math.round((c._avg.price || 0) * 100) / 100,
        avgQuality: Math.round((c._avg.qualityScore || 0) * 10) / 10,
      })),
    });
  } catch (error: any) {
    return logAndReturn('INTEL_MARKET', error, 'Failed to list intel market');
  }
}

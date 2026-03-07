/**
 * API Authentication Middleware
 *
 * Validates API key from X-API-Key header.
 * Updates usage stats (lastUsedAt, requestCount).
 *
 * Usage in API routes:
 *   import { validateApiKey } from '@/app/lib/api-auth';
 *
 *   export async function POST(req: Request) {
 *     const auth = await validateApiKey(req);
 *     if (!auth.valid) return auth.response;
 *     // auth.wallet, auth.permissions available
 *   }
 */

import { NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';
import { apiLimiter, writeLimiter } from '@/app/lib/rate-limit';

export interface AuthResult {
  valid: boolean;
  response?: NextResponse;
  wallet?: string;
  permissions?: string[];
  keyId?: string;
}

/**
 * Validate an API key from the request headers.
 *
 * @param req - The incoming request
 * @param requiredPermission - Optional permission to check (e.g., 'execute', 'register')
 * @returns AuthResult with wallet info if valid, or error response if invalid
 */
export async function validateApiKey(
  req: Request,
  requiredPermission?: string,
): Promise<AuthResult> {
  const apiKey = req.headers.get('x-api-key') || req.headers.get('X-API-Key');

  // If no API key provided, allow public access for GET endpoints
  // but require key for write operations
  if (!apiKey) {
    if (requiredPermission) {
      return {
        valid: false,
        response: NextResponse.json(
          {
            error: 'API key required',
            message: 'Include X-API-Key header. Generate keys at /developers',
          },
          { status: 401 },
        ),
      };
    }
    // Public access — apply general rate limit by IP
    return { valid: true, permissions: ['read'] };
  }

  // Validate key format
  if (!apiKey.startsWith('pp_')) {
    return {
      valid: false,
      response: NextResponse.json(
        { error: 'Invalid API key format' },
        { status: 401 },
      ),
    };
  }

  try {
    const key = await prisma.apiKey.findUnique({
      where: { key: apiKey },
    });

    if (!key) {
      return {
        valid: false,
        response: NextResponse.json(
          { error: 'Invalid API key' },
          { status: 401 },
        ),
      };
    }

    if (!key.isActive) {
      return {
        valid: false,
        response: NextResponse.json(
          { error: 'API key has been revoked' },
          { status: 401 },
        ),
      };
    }

    if (key.expiresAt && key.expiresAt < new Date()) {
      return {
        valid: false,
        response: NextResponse.json(
          { error: 'API key has expired' },
          { status: 401 },
        ),
      };
    }

    // Check permission
    const permissions = key.permissions.split(',').map(p => p.trim());
    if (requiredPermission && !permissions.includes(requiredPermission) && !permissions.includes('admin')) {
      return {
        valid: false,
        response: NextResponse.json(
          { error: `Insufficient permissions. Required: ${requiredPermission}` },
          { status: 403 },
        ),
      };
    }

    // Rate limit by API key
    const isWrite = requiredPermission && ['execute', 'register'].includes(requiredPermission);
    const limiter = isWrite ? writeLimiter : apiLimiter;
    const limit = limiter.check(key.id);

    if (!limit.success) {
      return {
        valid: false,
        response: NextResponse.json(
          {
            error: 'Rate limit exceeded',
            retryAfter: Math.ceil((limit.resetAt - Date.now()) / 1000),
          },
          {
            status: 429,
            headers: {
              'Retry-After': Math.ceil((limit.resetAt - Date.now()) / 1000).toString(),
              'X-RateLimit-Remaining': '0',
            },
          },
        ),
      };
    }

    // Update usage stats (non-blocking)
    prisma.apiKey.update({
      where: { id: key.id },
      data: {
        lastUsedAt: new Date(),
        requestCount: { increment: 1 },
      },
    }).catch(() => {}); // Fire and forget

    return {
      valid: true,
      wallet: key.ownerWallet,
      permissions,
      keyId: key.id,
    };
  } catch (error) {
    console.error('[api-auth] Error validating key:', error);
    // On DB error, allow request but log warning
    return { valid: true, permissions: ['read'] };
  }
}

/**
 * Extract client identifier for rate limiting (IP or API key).
 */
export function getClientId(req: Request): string {
  const apiKey = req.headers.get('x-api-key');
  if (apiKey) return `key:${apiKey.slice(-8)}`;

  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || 'unknown';
  return `ip:${ip}`;
}

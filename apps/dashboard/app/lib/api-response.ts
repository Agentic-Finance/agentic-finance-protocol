/**
 * Unified API Response Utilities
 *
 * All API routes MUST use these helpers for consistent response format:
 *   Success: { success: true, ...data }
 *   Error:   { success: false, error: "user-friendly message" }
 *
 * NEVER leak internal error messages (error.message) to clients.
 */

import { NextResponse } from 'next/server';

/**
 * Return a successful API response.
 * @example apiSuccess({ employees: [...] })        → { success: true, employees: [...] }
 * @example apiSuccess({ count: 5 }, 201)           → { success: true, count: 5 } with 201
 */
export function apiSuccess<T extends Record<string, unknown>>(data: T, status = 200) {
    // Handle BigInt values from ethers.js / on-chain reads
    const serialized = JSON.parse(JSON.stringify({ success: true, ...data }, (_key, value) =>
        typeof value === 'bigint' ? Number(value) : value
    ));
    return NextResponse.json(serialized, { status });
}

/**
 * Return an error API response. Never exposes internal error details.
 * @example apiError('Missing required fields', 400)
 * @example apiError('Employee not found', 404)
 */
export function apiError(message: string, status = 500) {
    return NextResponse.json({ success: false, error: message }, { status });
}

/**
 * Safely parse a float value. Returns fallback if NaN or Infinity.
 * @example safeParseFloat("12.5")    → 12.5
 * @example safeParseFloat("abc")     → 0
 * @example safeParseFloat(undefined) → 0
 */
export function safeParseFloat(value: unknown, fallback = 0): number {
    const parsed = parseFloat(String(value));
    return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * Validate required fields exist in a request body.
 * @returns Error message string if validation fails, null if all fields present.
 * @example
 *   const err = requireFields(body, ['amount', 'recipient']);
 *   if (err) return apiError(err, 400);
 */
export function requireFields<T extends Record<string, unknown>>(
    body: T,
    fields: (keyof T)[]
): string | null {
    for (const field of fields) {
        if (body[field] === undefined || body[field] === null || body[field] === '') {
            return `Missing required field: ${String(field)}`;
        }
    }
    return null;
}

/**
 * Validate an Ethereum address format (0x + 40 hex chars).
 * @returns true if valid, false otherwise
 */
export function isValidAddress(addr: unknown): boolean {
    return typeof addr === 'string' && /^0x[a-fA-F0-9]{40}$/.test(addr);
}

/**
 * Safely log errors server-side without leaking to client.
 * @param label - Context label for the error (e.g., "SHIELD_API", "EMPLOYEES")
 * @param error - The caught error object
 * @param userMessage - User-friendly message to return
 */
export function logAndReturn(label: string, error: unknown, userMessage = 'Internal server error') {
    console.error(`[${label}]`, error);
    return apiError(userMessage, 500);
}

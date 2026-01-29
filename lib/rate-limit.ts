/**
 * In-memory rate limiting for AI-powered endpoints
 * 
 * Uses a sliding window algorithm to limit requests per user/IP.
 * For production deployments with multiple instances, replace with Redis-based solution.
 * 
 * Usage:
 *   import { rateLimit, RateLimitConfig } from '@/lib/rate-limit'
 *   
 *   const limiter = rateLimit({ limit: 10, windowMs: 60000 })
 *   const { success, remaining, reset } = await limiter.check(identifier)
 */

import { NextRequest, NextResponse } from 'next/server'

export interface RateLimitConfig {
  /** Maximum number of requests allowed in the window */
  limit: number
  /** Time window in milliseconds */
  windowMs: number
  /** Optional custom identifier extractor */
  getIdentifier?: (request: NextRequest) => string | null
}

interface RateLimitEntry {
  tokens: number
  lastRefill: number
}

interface RateLimitResult {
  success: boolean
  remaining: number
  reset: number
  limit: number
}

// In-memory store for rate limiting
// Key: identifier (userId or IP), Value: rate limit entry
const rateLimitStore = new Map<string, RateLimitEntry>()

// Cleanup old entries periodically (every 5 minutes)
const CLEANUP_INTERVAL = 5 * 60 * 1000
let lastCleanup = Date.now()

function cleanupExpiredEntries(windowMs: number) {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return
  
  lastCleanup = now
  const expireTime = now - windowMs * 2 // Keep entries for 2x the window
  
  Array.from(rateLimitStore.entries()).forEach(([key, entry]) => {
    if (entry.lastRefill < expireTime) {
      rateLimitStore.delete(key)
    }
  })
}

/**
 * Create a rate limiter with the given configuration
 */
export function createRateLimiter(config: RateLimitConfig) {
  const { limit, windowMs, getIdentifier } = config
  
  return {
    /**
     * Check if a request should be allowed
     */
    check(identifier: string): RateLimitResult {
      const now = Date.now()
      cleanupExpiredEntries(windowMs)
      
      let entry = rateLimitStore.get(identifier)
      
      if (!entry) {
        // First request from this identifier
        entry = { tokens: limit - 1, lastRefill: now }
        rateLimitStore.set(identifier, entry)
        return {
          success: true,
          remaining: limit - 1,
          reset: now + windowMs,
          limit,
        }
      }
      
      // Token bucket algorithm with refill
      const elapsed = now - entry.lastRefill
      const refillAmount = (elapsed / windowMs) * limit
      entry.tokens = Math.min(limit, entry.tokens + refillAmount)
      entry.lastRefill = now
      
      if (entry.tokens >= 1) {
        entry.tokens -= 1
        return {
          success: true,
          remaining: Math.floor(entry.tokens),
          reset: now + windowMs,
          limit,
        }
      }
      
      // Rate limited
      const resetTime = entry.lastRefill + (windowMs * (1 - entry.tokens) / limit)
      return {
        success: false,
        remaining: 0,
        reset: Math.ceil(resetTime),
        limit,
      }
    },
    
    /**
     * Extract identifier from request (userId > IP fallback)
     */
    getRequestIdentifier(request: NextRequest): string {
      if (getIdentifier) {
        const custom = getIdentifier(request)
        if (custom) return custom
      }
      
      // Try to get user ID from auth header or cookie
      const authHeader = request.headers.get('authorization')
      if (authHeader?.startsWith('Bearer ')) {
        // Use a hash of the token as identifier (don't store full token)
        const token = authHeader.slice(7)
        return `token:${hashString(token)}`
      }
      
      // Fallback to IP address
      const forwarded = request.headers.get('x-forwarded-for')
      const ip = forwarded?.split(',')[0]?.trim() || 
                 request.headers.get('x-real-ip') ||
                 'unknown'
      return `ip:${ip}`
    }
  }
}

/**
 * Simple string hash for creating identifiers
 */
function hashString(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36)
}

// ============================================
// PRE-CONFIGURED RATE LIMITERS FOR AI ENDPOINTS
// ============================================

/**
 * Rate limiter for expensive AI operations (tailoring, parsing)
 * Default: 10 requests per minute per user
 */
export const aiRateLimiter = createRateLimiter({
  limit: 10,
  windowMs: 60 * 1000, // 1 minute
})

/**
 * Rate limiter for streaming AI operations (more lenient)
 * Default: 5 requests per minute per user (these are long-running)
 */
export const streamingRateLimiter = createRateLimiter({
  limit: 5,
  windowMs: 60 * 1000, // 1 minute
})

/**
 * Rate limiter for job fetching (uses external scraping)
 * Default: 20 requests per minute per user
 */
export const fetchRateLimiter = createRateLimiter({
  limit: 20,
  windowMs: 60 * 1000, // 1 minute
})

// ============================================
// MIDDLEWARE HELPER
// ============================================

/**
 * Apply rate limiting and return error response if limited
 * Returns null if request is allowed, or NextResponse if rate limited
 */
export function applyRateLimit(
  request: NextRequest,
  limiter: ReturnType<typeof createRateLimiter> = aiRateLimiter
): NextResponse | null {
  const identifier = limiter.getRequestIdentifier(request)
  const result = limiter.check(identifier)
  
  if (!result.success) {
    const retryAfter = Math.ceil((result.reset - Date.now()) / 1000)
    
    return NextResponse.json(
      {
        error: 'Too many requests. Please try again later.',
        retryAfter,
      },
      {
        status: 429,
        headers: {
          'Retry-After': retryAfter.toString(),
          'X-RateLimit-Limit': result.limit.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': result.reset.toString(),
        },
      }
    )
  }
  
  return null
}

/**
 * Add rate limit headers to a successful response
 */
export function addRateLimitHeaders(
  response: NextResponse,
  identifier: string,
  limiter: ReturnType<typeof createRateLimiter> = aiRateLimiter
): NextResponse {
  const result = limiter.check(identifier)
  // We already consumed a token above, so add one back for the header check
  
  response.headers.set('X-RateLimit-Limit', result.limit.toString())
  response.headers.set('X-RateLimit-Remaining', Math.max(0, result.remaining).toString())
  response.headers.set('X-RateLimit-Reset', result.reset.toString())
  
  return response
}

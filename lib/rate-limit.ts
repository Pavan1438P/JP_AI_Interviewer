// Simple in-memory rate limiter for API routes
// In production, use Redis or similar for distributed rate limiting

interface RateLimitEntry {
  count: number
  resetTime: number
}

const rateLimitMap = new Map<string, RateLimitEntry>()

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitMap.entries()) {
    if (now > entry.resetTime) {
      rateLimitMap.delete(key)
    }
  }
}, 60000) // Clean up every minute

interface RateLimitOptions {
  maxRequests: number // Max requests per window
  windowMs: number // Time window in milliseconds
}

export async function checkRateLimit(
  identifier: string,
  options: RateLimitOptions = { maxRequests: 20, windowMs: 60000 }
): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
  const now = Date.now()
  const key = identifier

  const entry = rateLimitMap.get(key)

  if (!entry || now > entry.resetTime) {
    // New window or expired window
    const resetTime = now + options.windowMs
    rateLimitMap.set(key, {
      count: 1,
      resetTime,
    })
    return {
      allowed: true,
      remaining: options.maxRequests - 1,
      resetTime,
    }
  }

  // Check if within limits
  if (entry.count >= options.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
    }
  }

  // Increment count
  entry.count++
  return {
    allowed: true,
    remaining: options.maxRequests - entry.count,
    resetTime: entry.resetTime,
  }
}

export function getRateLimitHeaders(
  allowed: boolean,
  remaining: number,
  resetTime: number,
  maxRequests: number
): Record<string, string> {
  return {
    'X-RateLimit-Limit': maxRequests.toString(),
    'X-RateLimit-Remaining': remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(resetTime / 1000).toString(),
    ...(allowed ? {} : { 'Retry-After': Math.ceil((resetTime - Date.now()) / 1000).toString() }),
  }
}

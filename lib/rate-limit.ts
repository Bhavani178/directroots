// lib/rate-limit.ts
// In-memory sliding-window rate limiter for serverless / Next.js API routes

interface RateLimitRecord {
  count: number
  resetTime: number
}

const rateLimitStore = new Map<string, RateLimitRecord>()

// Clean up expired entries every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now()
    for (const [key, record] of rateLimitStore.entries()) {
      if (now > record.resetTime) {
        rateLimitStore.delete(key)
      }
    }
  }, 5 * 60 * 1000)
}

export function checkRateLimit(
  req: Request,
  prefix: string,
  limit: number = 30,
  windowSeconds: number = 60
): { allowed: boolean; remaining: number; retryAfter?: number } {
  // Extract client IP from proxy headers or fallback
  const forwarded = req.headers.get("x-forwarded-for")
  const realIp = req.headers.get("x-real-ip")
  const ip = (forwarded ? forwarded.split(",")[0].trim() : realIp) || "127.0.0.1"

  const key = `${prefix}:${ip}`
  const now = Date.now()
  const windowMs = windowSeconds * 1000

  const record = rateLimitStore.get(key)

  if (!record || now > record.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs })
    return { allowed: true, remaining: limit - 1 }
  }

  if (record.count >= limit) {
    const retryAfter = Math.ceil((record.resetTime - now) / 1000)
    return { allowed: false, remaining: 0, retryAfter }
  }

  record.count += 1
  return { allowed: true, remaining: limit - record.count }
}

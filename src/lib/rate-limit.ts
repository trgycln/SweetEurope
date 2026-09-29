// src/lib/rate-limit.ts
const rateLimitMap = new Map<string, { count: number; lastReset: number }>();

export function checkRateLimit(ip: string, limit = 5, windowMs = 60000): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  
  if (!record) {
    rateLimitMap.set(ip, { count: 1, lastReset: now });
    return true; // Allowed
  }

  if (now - record.lastReset > windowMs) {
    rateLimitMap.set(ip, { count: 1, lastReset: now });
    return true; // Allowed
  }

  if (record.count >= limit) {
    return false; // Rate limited
  }

  record.count++;
  return true; // Allowed
}

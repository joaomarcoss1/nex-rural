type RateLimitEntry = {
  count: number;
  resetAt: number;
  blockedUntil: number;
};

type RateLimitOptions = {
  windowMs: number;
  max: number;
  blockMs: number;
};

const globalStore = globalThis as typeof globalThis & {
  __nexRuralRateLimit?: Map<string, RateLimitEntry>;
};

function store() {
  if (!globalStore.__nexRuralRateLimit) globalStore.__nexRuralRateLimit = new Map();
  return globalStore.__nexRuralRateLimit;
}

export function checkRateLimit(key: string, options: RateLimitOptions) {
  const now = Date.now();
  const buckets = store();
  const current = buckets.get(key);

  if (current && current.blockedUntil > now) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: current.resetAt,
      blockedUntil: current.blockedUntil
    };
  }

  const entry =
    current && current.resetAt > now
      ? current
      : {
          count: 0,
          resetAt: now + options.windowMs,
          blockedUntil: 0
        };

  entry.count += 1;
  if (entry.count > options.max) {
    entry.blockedUntil = now + options.blockMs;
  }

  buckets.set(key, entry);

  return {
    allowed: entry.blockedUntil <= now,
    remaining: Math.max(options.max - entry.count, 0),
    resetAt: entry.resetAt,
    blockedUntil: entry.blockedUntil
  };
}

export function getClientIp(headers: Headers) {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    headers.get("cf-connecting-ip") ||
    "local"
  );
}

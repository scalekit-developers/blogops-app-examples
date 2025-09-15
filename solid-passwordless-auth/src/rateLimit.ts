 // Very small in-memory rate limiter (demo only). Reset on server restart.
// Key: ip+route -> timestamps array
const hits = new Map<string, number[]>();

export function allow(ip: string, route: string, limit = 5, windowMs = 60_000) {
  const key = ip + '|' + route;
  const now = Date.now();
  const windowStart = now - windowMs;
  const arr = (hits.get(key) || []).filter(t => t > windowStart);
  if (arr.length >= limit) return false;
  arr.push(now);
  hits.set(key, arr);
  return true;
}

export function getClientIp(request: Request) {
  const xf = request.headers.get('x-forwarded-for');
  if (xf) return xf.split(',')[0].trim();
  return 'local';
}

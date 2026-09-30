export function createRateLimiter({ limit, windowMs, now = Date.now }) {
  const hits = new Map();
  return {
    allow(key) {
      const time = now();
      const recent = (hits.get(key) ?? []).filter((at) => time - at < windowMs);
      if (recent.length >= limit) {
        hits.set(key, recent);
        return false;
      }
      recent.push(time);
      hits.set(key, recent);
      return true;
    },
    blocked(key) {
      const time = now();
      return (hits.get(key) ?? []).filter((at) => time - at < windowMs).length >= limit;
    },
    sweep() {
      const time = now();
      for (const [key, list] of hits) {
        const recent = list.filter((at) => time - at < windowMs);
        if (recent.length === 0) hits.delete(key);
        else hits.set(key, recent);
      }
    },
  };
}

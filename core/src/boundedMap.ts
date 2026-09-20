// "A Map that grows one entry per distinct key for the life of the
// process is a leak" - the one eviction shape every process-lifetime
// bucket map in this package (rateLimiter.ts, secretThrottle.ts) needs:
// cap the size, and when it's full, sweep out whatever the caller can
// prove is stale before adding a new entry.
export function evictStaleIfFull<K, V>(map: Map<K, V>, maxSize: number, isStale: (value: V) => boolean): void {
  if (map.size < maxSize) return;
  for (const [key, value] of map) if (isStale(value)) map.delete(key);
}

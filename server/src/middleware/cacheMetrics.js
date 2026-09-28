// Lightweight in-process tally of how cacheable GET responses are served.
//
// Exposed via /health so the 200 (fresh body) vs 304 (revalidated) ratio for the
// catalog can be watched in production, which is what tells us whether the
// max-age / stale-while-revalidate windows in cache.js are well chosen. Counts
// are process-local and reset on restart; this is diagnostics, not billing.
const stats = {
  served: 0, // 200 with a public/private Cache-Control: a full body was sent
  revalidated: 0, // 304: the browser revalidated and we sent no body
};

export function cacheMetrics(req, res, next) {
  if (req.method !== 'GET') return next();

  res.on('finish', () => {
    const control = res.getHeader('Cache-Control');
    // Only count responses we actually declared cacheable; no-store surfaces
    // are deliberately excluded.
    if (!control || !/public|private/.test(String(control))) return;

    if (res.statusCode === 304) stats.revalidated += 1;
    else if (res.statusCode === 200) stats.served += 1;
  });

  next();
}

export function cacheStats() {
  const total = stats.served + stats.revalidated;
  return {
    served: stats.served,
    revalidated: stats.revalidated,
    revalidationRate: total ? Number((stats.revalidated / total).toFixed(3)) : 0,
  };
}

// Test hook.
export function resetCacheStats() {
  stats.served = 0;
  stats.revalidated = 0;
}

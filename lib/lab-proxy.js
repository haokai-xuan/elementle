module.exports = (app, { apiBaseUrl, apiKey }) => {
  for (const endpoint of ['status', 'checkout', 'portal']) {
    const method = endpoint === 'status' ? 'get' : 'post';
    app[method]('/api/billing/' + endpoint, async (req, res) => {
      res.set('Cache-Control', 'no-store');
      if (!req.headers.authorization) return res.status(401).json({ error: 'Sign in to use Elementle Lab.' });
      const started = performance.now();
      try {
        const response = await fetch(`${apiBaseUrl}/billing/${endpoint}${endpoint === 'status' && req.query.refresh === '1' ? '?refresh=1' : ''}`, {
          method: method.toUpperCase(),
          headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey.trim(), Authorization: req.headers.authorization },
          ...(method === 'post' ? { body: JSON.stringify(req.body) } : {}),
          signal: AbortSignal.timeout(endpoint === 'status' && req.query.refresh !== '1' ? 12000 : 60000)
        });
        const data = await response.json();
        const elapsed = performance.now() - started;
        const upstreamTiming = response.headers.get('server-timing') || '';
        res.set('Server-Timing', [upstreamTiming, `proxy;dur=${elapsed.toFixed(1)}`].filter(Boolean).join(', '));
        console.info('[billing proxy] endpoint=%s status=%d total_ms=%d upstream=%s', endpoint, response.status, Math.round(elapsed), upstreamTiming || 'unavailable');
        res.status(response.status).json(data);
      } catch { res.status(502).json({ error: 'Unable to reach billing. Please retry.' }); }
    });
  }
};

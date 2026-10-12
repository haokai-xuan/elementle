module.exports = (app, { apiBaseUrl, apiKey }) => {
  for (const endpoint of ['status', 'checkout', 'portal']) {
    const method = endpoint === 'status' ? 'get' : 'post';
    app[method]('/api/billing/' + endpoint, async (req, res) => {
      res.set('Cache-Control', 'no-store');
      if (!req.headers.authorization) return res.status(401).json({ error: 'Sign in to use Elementle Lab.' });
      try {
        const response = await fetch(`${apiBaseUrl}/billing/${endpoint}${endpoint === 'status' && req.query.refresh === '1' ? '?refresh=1' : ''}`, {
          method: method.toUpperCase(),
          headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey.trim(), Authorization: req.headers.authorization },
          ...(method === 'post' ? { body: JSON.stringify(req.body) } : {}),
          signal: AbortSignal.timeout(60000)
        });
        res.status(response.status).json(await response.json());
      } catch { res.status(502).json({ error: 'Unable to reach billing. Please retry.' }); }
    });
  }
};

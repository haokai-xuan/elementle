module.exports = (app, { apiBaseUrl, apiKey }) => {
  app.all('/api/admin/*', async (req, res) => {
    res.set('Cache-Control', 'no-store');
    const route = req.path.slice('/api'.length);
    const read = req.method === 'GET' && /^\/admin\/(?:me|users|users\/\d+\/history)$/.test(route);
    const write = req.method === 'POST' && /^\/admin\/users\/\d+\/access$/.test(route);
    if (!read && !write) return res.status(404).json({ error: 'Unknown admin action.' });
    if (!req.headers.authorization) return res.status(401).json({ error: 'Sign in with your administrator account.' });
    const query = new URLSearchParams();
    if (route === '/admin/users') for (const key of ['q', 'filter', 'offset']) if (typeof req.query[key] === 'string') query.set(key, req.query[key]);
    try {
      const response = await fetch(apiBaseUrl + route + (query.size ? '?' + query : ''), {
        method: req.method,
        headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey.trim(), Authorization: req.headers.authorization },
        ...(write ? { body: JSON.stringify(req.body) } : {}), signal: AbortSignal.timeout(20000)
      });
      res.status(response.status).json(await response.json());
    } catch { res.status(502).json({ error: 'Unable to reach account management. Please retry.' }); }
  });
};

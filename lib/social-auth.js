const crypto = require('node:crypto');

// The public callback terminates here; provider secrets and exchanges live in Flask.
module.exports = function registerSocialAuth(app, { apiBaseUrl, apiKey }) {
  const providers = new Set(['google']);
  const secure = (process.env.FRONTEND_BASE_URL || 'https://elementlegame.com').startsWith('https://');
  const bindingCookie = 'elementle_oauth_binding';
  const resultCookie = 'elementle_oauth_result';
  const options = { httpOnly: true, secure, sameSite: 'lax', path: '/api/auth/social', maxAge: 600000 };
  function cookie(req, name) {
    const value = (req.headers.cookie || '').split(';').map(s => s.trim()).find(s => s.startsWith(name + '='));
    try { return value ? decodeURIComponent(value.slice(name.length + 1)) : ''; } catch { return ''; }
  }
  async function api(provider, action, body) {
    const response = await fetch(`${apiBaseUrl}/auth/social/${provider}/${action}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
      body: JSON.stringify(body), signal: AbortSignal.timeout(45000)
    });
    const data = await response.json();
    return { status: response.status, data };
  }
  app.use('/api/auth/social', (req, res, next) => {
    res.set({ 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' });
    next();
  });
  app.get('/api/auth/social/result', (req, res) => {
    const result = cookie(req, resultCookie);
    res.clearCookie(resultCookie, { ...options, sameSite: 'lax' });
    try { res.json(JSON.parse(result)); } catch { res.status(400).json({ error: 'Sign-in expired. Please try again.' }); }
  });
  app.get('/api/auth/social/:provider/start', async (req, res) => {
    const { provider } = req.params;
    if (!providers.has(provider)) return res.sendStatus(404);
    const binding = crypto.randomBytes(32).toString('hex');
    try {
      const { data, status } = await api(provider, 'start', { binding });
      if (status !== 200) {
        res.cookie(resultCookie, JSON.stringify(data), { ...options, sameSite: 'lax' });
        return res.redirect(303, '/account?social=1');
      }
      res.cookie(bindingCookie, binding, options);
      res.redirect(303, data.url);
    } catch {
      res.redirect(303, '/account?social_error=1');
    }
  });
  app.all('/api/auth/social/:provider/callback', async (req, res) => {
    if (req.method !== 'GET') return res.sendStatus(405);
    const { provider } = req.params;
    if (!providers.has(provider)) return res.sendStatus(404);
    const input = req.query;
    try {
      const { data } = await api(provider, 'callback', {
        code: input.code, state: input.state, error: input.error, binding: cookie(req, bindingCookie)
      });
      res.cookie(resultCookie, JSON.stringify(data), { ...options, sameSite: 'lax' });
      res.redirect(303, '/account?social=1');
    } catch {
      res.redirect(303, '/account?social_error=1');
    }
  });
  app.post('/api/auth/social/:provider/complete', async (req, res) => {
    if (!providers.has(req.params.provider)) return res.sendStatus(404);
    try {
      const { data, status } = await api(req.params.provider, 'complete', {
        ticket: req.body.ticket, email: req.body.email, username: req.body.username,
        binding: cookie(req, bindingCookie)
      });
      res.status(status).json(data);
    } catch { res.status(502).json({ error: 'Could not reach sign-in service. Please try again.' }); }
  });
};

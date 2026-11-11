const { readPage } = require('./page-template');

module.exports = (app, { rootDir, apiBaseUrl, apiKey }) => {
  // Navigation cannot send the localStorage bearer token. This empty document
  // authenticates before requesting any admin markup or loading its UI scripts.
  const entry = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><script defer src="/scripts/admin-entry.js"></script></head><body></body></html>';
  app.get(['/admin', '/admin.html'], (req, res) => {
    res.set('Cache-Control', 'private, no-store').type('html').send(entry);
  });
  app.get('/api/admin/page', async (req, res) => {
    res.set('Cache-Control', 'private, no-store');
    res.vary('Authorization');
    if (!/^Bearer \S+$/.test(req.headers.authorization || '')) return res.status(404).end();
    try {
      const response = await fetch(apiBaseUrl + '/admin/me', {
        headers: { 'X-API-Key': apiKey.trim(), Authorization: req.headers.authorization },
        signal: AbortSignal.timeout(12000), cache: 'no-store'
      });
      if (!response.ok || (await response.json()).isAdmin !== true) return res.status(404).end();
      res.type('html').send(readPage(rootDir, 'admin'));
    } catch { res.status(404).end(); }
  });
};

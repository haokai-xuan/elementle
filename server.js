require('dotenv').config();

const express = require('express');
const path = require('path');
const { readPage } = require('./lib/page-template');

const app = express();
const port = process.env.PORT || 3000;

const API_BASE_URL = (process.env.API_BASE_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
const API_KEY = process.env.API_KEY || '';

app.use(express.json());
require('./lib/social-auth')(app, { apiBaseUrl: API_BASE_URL, apiKey: API_KEY });
require('./lib/lab-proxy')(app, { apiBaseUrl: API_BASE_URL, apiKey: API_KEY });

function sendHtmlPage(name) {
  const html = readPage(__dirname, name);
  return (req, res) => res.type('html').send(html);
}

function redirectDropHtml(to) {
  return (req, res) => {
    const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
    res.redirect(301, to + query);
  };
}

for (const name of ['lab', 'how-to-play', 'stats', 'account', 'about', 'disclaimer', 'terms_of_service_and_privacy']) {
  app.get(`/${name}.html`, redirectDropHtml(`/${name}`));
  app.get(`/${name}`, sendHtmlPage(name));
}
app.get(['/', '/index.html'], sendHtmlPage('index'));
const analysisPage = require('./lib/analysis-page')(__dirname);
app.get('/analysis', (req, res) => res.type('html').send(analysisPage));
const gameHistoryPage = require('./lib/game-history-page')(__dirname);
app.get('/game-history', (req, res) => res.type('html').send(gameHistoryPage));

app.use(express.static(path.join(__dirname)));

const elementPages = require('./lib/element-pages').createElementPages(__dirname);
app.get('/elements', (req, res) => res.type('html').send(elementPages.overview));
app.get('/elements/:atomicNumber', (req, res) => {
  const page = elementPages.details.get(req.params.atomicNumber);
  if (!page) return res.status(404).type('html').send('<!doctype html><html lang="en"><meta charset="utf-8"><title>Element not found</title><h1>Element not found</h1><p>Choose an atomic number from 1 to 118.</p><a href="/elements">Back to the periodic table</a></html>');
  res.type('html').send(page);
});


function upstreamHeaders(extra = {}) {
  const headers = { ...extra };
  const key = API_KEY && API_KEY.trim();
  if (key) {
    headers['X-API-Key'] = key;
    headers['Authorization'] = `Bearer ${key}`;
  }
  return headers;
}

app.post('/api/game/guest-result', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  if (req.headers.authorization) return res.status(400).json({error:'Use the registered main game endpoint'});
  try {
    const upstream = await fetch(`${API_BASE_URL}/game/guest-result`, {
      method:'POST',
      headers:{...authProxyHeaders(), 'X-Guest-ID':req.headers['x-guest-id'] || ''},
      body:JSON.stringify(req.body), signal:AbortSignal.timeout(20000)
    });
    res.status(upstream.status).json(await upstream.json());
  } catch { res.status(502).json({error:'Unable to save guest result. Please retry.'}); }
});

app.post('/api/game/analysis', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const upstream = await fetch(`${API_BASE_URL}/game/analysis`, {
      method: 'POST',
      headers: { ...authProxyHeaders(), ...(req.headers.authorization ? { Authorization: req.headers.authorization } : {}) },
      body: JSON.stringify(req.body), signal: AbortSignal.timeout(20000)
    });
    const data = await upstream.json().catch(() => ({ error: 'Analysis service is unavailable. Please retry.' }));
    res.status(upstream.status).json(data);
  } catch { res.status(502).json({ error: 'Unable to reach elBot. Please retry.' }); }
});

app.get('/api/vault', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const upstream = await fetch(`${API_BASE_URL}/vault`, {
      headers: { ...authProxyHeaders(), 'X-Guest-ID': req.headers['x-guest-id'] || '', ...(req.headers.authorization ? { Authorization: req.headers.authorization } : {}) },
      signal: AbortSignal.timeout(12000)
    });
    const data = await upstream.json().catch(() => ({ error: 'Vault service is not available yet.' }));
    res.status(upstream.status).json(data);
  } catch { res.status(502).json({ error: 'Unable to reach the vault. Please retry.' }); }
});

const vaultPages = require('./lib/vault-pages').createVaultPages(__dirname);
app.get('/vault', (req, res) => res.type('html').send(vaultPages.overview));
app.get('/vault/:atomicNumber', (req, res) => {
  const page = vaultPages.details.get(req.params.atomicNumber);
  if (!page) return res.status(404).send('Element not found. Choose an atomic number from 1 to 118.');
  res.type('html').send(page);
});

const mysteryElementCache = new Map();

app.get('/api/mystery_element/:date', async (req, res) => {
  const { date } = req.params;
  const cached = mysteryElementCache.get(date);
  if (cached) {
    res.set('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
    return res.status(200).json(cached);
  }

  const url = `${API_BASE_URL}/mystery_element/${date}`;
  try {
    const upstream = await fetch(url, {
      method: 'GET',
      headers: upstreamHeaders()
    });
    const data = await upstream.json().catch(() => ({}));
    if (upstream.ok) {
      mysteryElementCache.set(date, data);
      res.set('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
    }
    res.status(upstream.status).json(data);
    if (!upstream.ok) {
      console.warn(`[proxy] ${upstream.status} from ${url}`, data);
    }
  } catch (err) {
    console.error(`[proxy] Failed to reach ${url}:`, err.message);
    res.status(502).json({ error: 'Upstream error', detail: err.message });
  }
});

// Read aggregate results without recording a guess.
app.get('/api/guess_distribution', async (req, res) => {
  try {
    const upstream = await fetch(`${API_BASE_URL}/guess_distribution`, {
      headers: upstreamHeaders()
    });
    const data = await upstream.json();
    res.status(upstream.status).json(data);
  } catch (err) {
    console.error('Error reading guess distribution:', err.message);
    res.status(502).json({ error: 'Upstream error' });
  }
});

app.post('/api/guess_distribution', async (req, res) => {
  try {
    const upstream = await fetch(`${API_BASE_URL}/guess_distribution`, {
      method: 'POST',
      headers: upstreamHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(req.body)
    });
    const data = await upstream.json();
    res.status(upstream.status).json(data);
  } catch (err) {
    console.error('Error in /api/guess_distribution proxy:', err);
    res.status(502).json({ error: 'Upstream error' });
  }
});

/**
 * Flask `require_api_key` expects X-API-Key to match API_KEY (no Bearer on /auth/*).
 * Login body is JSON with either { email, password } or { username, password }, not both.
 */
function authProxyHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  const key = API_KEY && API_KEY.trim();
  if (key) headers['X-API-Key'] = key;
  return headers;
}

async function proxyAuthPost(path, req, res) {
  try {
    const upstream = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: authProxyHeaders(),
      body: JSON.stringify(req.body)
    });
    const data = await upstream.json().catch(() => ({}));
    res.status(upstream.status).json(data);
  } catch (err) {
    console.error(`[proxy] ${path}:`, err.message);
    res.status(502).json({ error: 'Upstream error' });
  }
}

app.post('/api/auth/signup', (req, res) => proxyAuthPost('/auth/signup', req, res));
app.post('/api/auth/login', (req, res) => proxyAuthPost('/auth/login', req, res));
app.post('/api/auth/request-password-reset', (req, res) =>
  proxyAuthPost('/auth/request-password-reset', req, res)
);
app.post('/api/auth/reset-password', (req, res) =>
  proxyAuthPost('/auth/reset-password', req, res)
);
app.post('/api/auth/verify-email', (req, res) =>
  proxyAuthPost('/auth/verify-email', req, res)
);
app.post('/api/auth/resend-verification', (req, res) =>
  proxyAuthPost('/auth/resend-verification', req, res)
);

function gameHeaders(req, extra = {}) {
  const headers = { ...upstreamHeaders(), ...extra };
  const auth = req.headers.authorization;
  if (auth) headers['Authorization'] = auth;
  return headers;
}

for (const endpoint of ['archives', 'start', 'guess', 'hint']) {
  const method = endpoint === 'archives' ? 'get' : 'post';
  app[method]('/api/practice/' + endpoint, async (req, res) => {
    try {
      const upstream = await fetch(`${API_BASE_URL}/practice/${endpoint}${endpoint === 'archives' ? '?localDate=' + encodeURIComponent(req.query.localDate || '') : ''}`, {
        method: method.toUpperCase(),
        headers: { ...authProxyHeaders(), 'X-Guest-ID': req.headers['x-guest-id'] || '', ...(req.headers.authorization ? { Authorization: req.headers.authorization } : {}) },
        ...(method === 'post' ? { body: JSON.stringify(req.body) } : {})
      });
      res.set('Cache-Control', 'no-store');
      const contentType = upstream.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        console.error(`[practice proxy] ${endpoint}: upstream returned ${upstream.status} (${contentType})`);
        const error = upstream.status === 404
          ? 'The practice API has not been deployed yet. Deploy the updated Daily-Element-API service.'
          : 'The lab service returned an unexpected response. Please try again.';
        return res.status(upstream.status === 404 ? 503 : 502).json({ error });
      }
      res.status(upstream.status).json(await upstream.json());
    } catch (error) { res.status(502).json({ error: 'Unable to reach the lab. Please try again.' }); }
  });
}

app.get('/api/user/stats', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const localDate = req.query.localDate || '';
  const url = `${API_BASE_URL}/user/stats?localDate=${encodeURIComponent(localDate)}`;
  try {
    const upstream = await fetch(url, {
      method: 'GET',
      headers: gameHeaders(req)
    });
    const data = await upstream.json().catch(() => ({}));
    res.status(upstream.status).json(data);
  } catch (err) {
    console.error('[proxy] /api/user/stats:', err.message);
    res.status(502).json({ error: 'Upstream error', detail: err.message });
  }
});

app.get('/api/game/history', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const localDate = req.query.localDate;
  if (!/^\d{8}$/.test(String(localDate || ''))) return res.status(400).json({error:'localDate must be YYYYMMDD'});
  try {
    const upstream = await fetch(`${API_BASE_URL}/game/history?localDate=${encodeURIComponent(localDate)}`, {headers:gameHeaders(req)});
    const data = await upstream.json().catch(() => null);
    if (!data) return res.status(502).json({error:'Saved games are temporarily unavailable. Please try again.'});
    res.status(upstream.status).json(data);
  } catch (err) {
    console.error('[proxy] /api/game/history:', err.message);
    res.status(502).json({error:'Unable to load this saved game. Please retry.'});
  }
});

app.get('/api/game/state', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const localDate = req.query.localDate;
  if (!localDate) {
    return res.status(400).json({ error: 'localDate required (query param YYYYMMDD)' });
  }
  const url = `${API_BASE_URL}/game/state?localDate=${encodeURIComponent(localDate)}`;
  try {
    const upstream = await fetch(url, {
      method: 'GET',
      headers: gameHeaders(req)
    });
    const data = await upstream.json().catch(() => ({}));
    res.status(upstream.status).json(data);
  } catch (err) {
    console.error('[proxy] /api/game/state:', err.message);
    res.status(502).json({ error: 'Upstream error', detail: err.message });
  }
});

app.get('/api/game/bootstrap', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const localDate = req.query.localDate;
  if (!localDate) {
    return res.status(400).json({ error: 'localDate required (query param YYYYMMDD)' });
  }
  const url = `${API_BASE_URL}/game/bootstrap?localDate=${encodeURIComponent(localDate)}`;
  try {
    const upstream = await fetch(url, {
      method: 'GET',
      headers: gameHeaders(req)
    });
    const data = await upstream.json().catch(() => ({}));
    res.status(upstream.status).json(data);
  } catch (err) {
    console.error('[proxy] /api/game/bootstrap:', err.message);
    res.status(502).json({ error: 'Upstream error', detail: err.message });
  }
});

app.post('/api/game/guess', async (req, res) => {
  const url = `${API_BASE_URL}/game/guess`;
  try {
    const upstream = await fetch(url, {
      method: 'POST',
      headers: gameHeaders(req, { 'Content-Type': 'application/json' }),
      body: JSON.stringify(req.body)
    });
    const data = await upstream.json().catch(() => ({}));
    res.status(upstream.status).json(data);
  } catch (err) {
    console.error('[proxy] /api/game/guess:', err.message);
    res.status(502).json({ error: 'Upstream error', detail: err.message });
  }
});

app.post('/api/game/hint', async (req, res) => {
  const url = `${API_BASE_URL}/game/hint`;
  try {
    const upstream = await fetch(url, {
      method: 'POST',
      headers: gameHeaders(req, { 'Content-Type': 'application/json' }),
      body: JSON.stringify(req.body)
    });
    const data = await upstream.json().catch(() => ({}));
    res.status(upstream.status).json(data);
  } catch (err) {
    console.error('[proxy] /api/game/hint:', err.message);
    res.status(502).json({ error: 'Upstream error', detail: err.message });
  }
});

app.get('/api/leaderboard/elelo', async (req, res) => {
  res.set('Cache-Control', 'no-store');
  try {
    const upstream = await fetch(`${API_BASE_URL}/leaderboard/elelo`, {
      headers: authProxyHeaders(), signal: AbortSignal.timeout(12000)
    });
    res.status(upstream.status).json(await upstream.json());
  } catch { res.status(502).json({ error: 'Unable to load elELO leaders' }); }
});

app.get('/api/leaderboard/current_streaks', async (req, res) => {
  const url = `${API_BASE_URL}/leaderboard/current_streaks`;
  try {
    const upstream = await fetch(url, {
      method: 'GET',
      headers: upstreamHeaders()
    });
    const data = await upstream.json().catch(() => ({}));
    res.status(upstream.status).json(data);
    if (!upstream.ok) {
      console.warn(`[proxy] ${upstream.status} from ${url}`, data);
    }
  } catch (err) {
    console.error(`[proxy] Failed to reach ${url}:`, err.message);
    res.status(502).json({ error: 'Upstream error', detail: err.message });
  }
});

app.listen(port, () => {
  console.log(`Elementle server listening on http://localhost:${port}`);
  console.log(`Proxying API to: ${API_BASE_URL}`);
});

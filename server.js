require('dotenv').config();

const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

const API_BASE_URL = (process.env.API_BASE_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
const API_KEY = process.env.API_KEY || '';

app.use(express.json());

function sendHtmlPage(name) {
  return (req, res) => res.sendFile(path.join(__dirname, `${name}.html`));
}

function redirectDropHtml(to) {
  return (req, res) => {
    const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
    res.redirect(301, to + query);
  };
}

app.get('/how-to-play.html', redirectDropHtml('/how-to-play'));
app.get('/stats.html', redirectDropHtml('/stats'));
app.get('/account.html', redirectDropHtml('/account'));
app.get('/how-to-play', sendHtmlPage('how-to-play'));
app.get('/stats', sendHtmlPage('stats'));
app.get('/account', sendHtmlPage('account'));

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

app.get('/api/user/stats', async (req, res) => {
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

app.get('/api/game/state', async (req, res) => {
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

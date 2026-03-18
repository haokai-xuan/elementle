require('dotenv').config();

const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

const API_BASE_URL = (process.env.API_BASE_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
const API_KEY = process.env.API_KEY || '';

app.use(express.json());

app.use(express.static(path.join(__dirname)));

function upstreamHeaders(extra = {}) {
  const headers = { ...extra };
  const key = API_KEY && API_KEY.trim();
  if (key) {
    headers['X-API-Key'] = key;
    headers['Authorization'] = `Bearer ${key}`;
  }
  return headers;
}

app.get('/api/mystery_element/:date', async (req, res) => {
  const { date } = req.params;
  const url = `${API_BASE_URL}/mystery_element/${date}`;
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

async function proxyAuthPost(path, req, res) {
  try {
    const upstream = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: upstreamHeaders({ 'Content-Type': 'application/json' }),
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

app.listen(port, () => {
  console.log(`Elementle server listening on http://localhost:${port}`);
  console.log(`Proxying API to: ${API_BASE_URL}`);
});


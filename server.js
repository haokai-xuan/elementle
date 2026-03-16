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

app.listen(port, () => {
  console.log(`Elementle server listening on http://localhost:${port}`);
  console.log(`Proxying API to: ${API_BASE_URL}`);
});


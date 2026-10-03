const test = require('node:test');
const assert = require('node:assert/strict');
const register = require('../lib/social-auth');
const routes = new Map();
const app = Object.fromEntries(['get', 'post', 'all', 'use'].map(method => [method, (path, fn) => routes.set(method + ' ' + path, fn)]));
register(app, { apiBaseUrl: 'https://api.example.test', apiKey: 'server-secret' });
function response() {
  return { cookies: {}, statusCode: 200, cookie(k, v, opts) { this.cookies[k] = { value: v, opts }; return this; },
    clearCookie(k) { this.cleared = k; return this; }, status(n) { this.statusCode = n; return this; },
    sendStatus(n) { this.statusCode = n; return this; }, json(data) { this.data = data; return this; },
    redirect(status, url) { this.statusCode = status; this.url = url; return this; } };
}
test('start keeps binding in a secure HttpOnly cookie', async () => {
  const original = global.fetch;
  try {
    global.fetch = async (url, opts) => {
      assert.equal(opts.headers['X-API-Key'], 'server-secret');
      assert.equal(JSON.parse(opts.body).binding.length, 64);
      return { status: 200, json: async () => ({ url: 'https://accounts.google.com/oauth' }) };
    };
    const res = response();
    await routes.get('get /api/auth/social/:provider/start')({ params: { provider: 'google' } }, res);
    assert.equal(res.url, 'https://accounts.google.com/oauth');
    assert.equal(res.cookies.elementle_oauth_binding.opts.httpOnly, true);
    assert.equal(res.cookies.elementle_oauth_binding.opts.secure, true);
    assert.equal(res.cookies.elementle_oauth_binding.opts.sameSite, 'lax');
  } finally { global.fetch = original; }
});
test('Google GET callback forwards browser binding, keeps login token out of URL', async () => {
  const original = global.fetch;
  try {
    global.fetch = async (url, opts) => {
      const body = JSON.parse(opts.body);
      assert.equal(body.binding, 'cookie-binding');
      assert.equal(body.code, 'google-code');
      return { status: 200, json: async () => ({ token: 'login-token' }) };
    };
    const res = response();
    await routes.get('all /api/auth/social/:provider/callback')({ method: 'GET', params: { provider: 'google' },
      headers: { cookie: 'elementle_oauth_binding=cookie-binding' }, query: { state: 'state', code: 'google-code', binding: 'forged' } }, res);
    assert.equal(res.url, '/account?social=1');
    assert.equal(JSON.parse(res.cookies.elementle_oauth_result.value).token, 'login-token');
    assert.equal(res.cookies.elementle_oauth_result.opts.httpOnly, true);
  } finally { global.fetch = original; }
});
test('result cookie is cleared after delivery', () => {
  const res = response();
  routes.get('get /api/auth/social/result')({ headers: { cookie: 'elementle_oauth_result=' + encodeURIComponent(JSON.stringify({ ticket: 'signup-ticket' })) } }, res);
  assert.deepEqual(res.data, { ticket: 'signup-ticket' });
  assert.equal(res.cleared, 'elementle_oauth_result');
});
test('unknown provider cannot reach an arbitrary endpoint', async () => {
  const res = response();
  await routes.get('get /api/auth/social/:provider/start')({ params: { provider: 'evil' } }, res);
  assert.equal(res.statusCode, 404);
});

test('disabled providers are rejected on start, callback and completion', async () => {
  const original = global.fetch;
  try {
    global.fetch = async () => { throw new Error('Disabled providers must never reach the API'); };
    for (const provider of ['apple', 'x', 'microsoft', 'github']) {
      for (const route of ['get /api/auth/social/:provider/start', 'all /api/auth/social/:provider/callback', 'post /api/auth/social/:provider/complete']) {
        const res = response();
        await routes.get(route)({ method: 'GET', params: { provider } }, res);
        assert.equal(res.statusCode, 404);
      }
    }
  } finally { global.fetch = original; }
});

test('signup completion sends only username, ticket, and browser binding', async () => {
  const original = global.fetch;
  try {
    global.fetch = async (url, options) => {
      assert.deepEqual(JSON.parse(options.body), { ticket: 'ticket', username: 'test', binding: 'browser-binding' });
      return { status: 200, json: async () => ({ message: 'Check your email' }) };
    };
    const res = response();
    await routes.get('post /api/auth/social/:provider/complete')({
      params: { provider: 'google' }, headers: { cookie: 'elementle_oauth_binding=browser-binding' },
      body: { ticket: 'ticket', username: 'test', email: 'override@example.com' }
    }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.data.message, 'Check your email');
  } finally { global.fetch = original; }
});

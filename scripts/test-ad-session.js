const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const express = require('express');
const { parseHTML } = require('linkedom');
const { readPage } = require('../lib/page-template');
const register = require('../lib/ad-session');
const originalFetch = global.fetch;
const statuses = new Map([['paid', { isLab: true }], ['free', { isLab: false }], ['trial', { isLab: true, status: 'trialing' }], ['grace', { isLab: true, status: 'past_due' }]]);
let server, base, lookups = 0, clock = Date.now();
const id = token => crypto.createHash('sha256').update(token).digest('hex');

before(async () => {
  global.fetch = async (url, options) => {
    if (String(url) !== 'https://billing.example/billing/status') return originalFetch(url, options);
    lookups++;
    assert.equal(options.headers['X-API-Key'], 'test-key');
    const token = options.headers.Authorization.slice(7);
    if (token === 'offline') throw new Error('Unavailable');
    if (token === 'invalid-shape') return new Response('{}');
    return new Response(JSON.stringify(statuses.get(token) || {}), { status: statuses.has(token) ? 200 : 401 });
  };
  const app = express();
  register(app, { apiBaseUrl: 'https://billing.example', apiKey: 'test-key', now: () => clock });
  const html = readPage(require('node:path').resolve(__dirname, '..'), 'index');
  for (const route of ['/', '/account', '/elements/26', '/reset.html']) app.get(route, (req, res) => res.type('html').send(html));
  await new Promise(resolve => { server = app.listen(0, '127.0.0.1', resolve); });
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => { global.fetch = originalFetch; await new Promise(resolve => server?.close(resolve)); });
async function session(token) {
  const response = await fetch(base + '/api/ad-session', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
  return { response, cookie: response.headers.get('set-cookie')?.split(';')[0], data: await response.json() };
}
async function page(cookie, route = '/') {
  const previous = lookups;
  const response = await fetch(base + route, { headers: cookie ? { Cookie: cookie } : {}, signal: AbortSignal.timeout(2000) });
  assert.equal(response.status, 200);
  assert.equal(lookups, previous, 'HTML must never wait on membership I/O');
  assert.match(response.headers.get('cache-control'), /private, no-store/);
  assert.match(response.headers.get('vary'), /Cookie/);
  const text = await response.text();
  const { document } = parseHTML(text);
  const wrapper = document.querySelector('#mediavine-script');
  assert.equal(wrapper.parentElement, document.head);
  assert.ok(!wrapper.type || wrapper.type === 'text/javascript');
  assert.ok(wrapper.hasAttribute('async'));
  assert.equal(document.querySelectorAll('#mediavine-script').length, 1);
  assert.ok(document.querySelector('#elementle-ad-guard').textContent.includes('data-blocklist-all'));
  return { document, text, state: document.querySelector('meta[name="elementle-ad-state"]') };
}

test('guest HTML has a static wrapper and no membership lookup', async () => {
  const result = await page();
  assert.equal(result.state.content, 'guest');
  assert.equal(result.document.querySelector('#mediavine-settings'), null);
});
test('cached subscriber, trial, and grace pages block all ads before the static wrapper without I/O', async () => {
  for (const token of ['paid', 'trial', 'grace']) {
    const { cookie } = await session(token);
    for (const route of ['/', '/account', '/elements/26', '/reset.html']) {
      const { document, text, state } = await page(cookie, route);
      const settings = document.querySelector('#mediavine-settings');
      assert.equal(settings.getAttribute('data-blocklist-all'), '1');
      assert.equal(settings.hasAttribute('data-expires-at'), false);
      assert.ok(text.indexOf('id="mediavine-settings"') < text.indexOf('id="mediavine-script"'));
      assert.equal(state.dataset.sessionId, id(token));
      assert.equal(state.dataset.sessionVerified, '1');
    }
  }
});
test('free status is cached for 60 seconds; expiry blocks ads until background verification', async () => {
  const { cookie } = await session('free');
  assert.equal((await page(cookie)).state.content, 'free');
  statuses.set('free', { isLab: true });
  assert.equal((await page(cookie)).state.content, 'free', 'status is intentionally briefly cached');
  clock += 60001;
  const expired = await page(cookie);
  assert.equal(expired.state.content, 'blocked');
  assert.equal(expired.state.dataset.sessionVerified, '0');
  const refreshed = await session('free');
  assert.equal((await page(refreshed.cookie)).state.content, 'blocked');
  statuses.set('free', { isLab: false });
});
test('cookie is signed, contains no bearer token, and tampering or legacy cookies fail closed', async () => {
  const { response, cookie, data } = await session('free');
  const raw = response.headers.get('set-cookie');
  assert.match(raw, /HttpOnly/); assert.match(raw, /Secure/); assert.match(raw, /SameSite=Lax/);
  assert.equal(data.sessionId, id('free'));
  assert.equal(data.isLab, false);
  assert.equal(data.expiresAt, clock + 60000);
  const value = decodeURIComponent(cookie.slice(cookie.indexOf('=') + 1));
  const [payload, signature] = value.split('.');
  const claims = JSON.parse(Buffer.from(payload, 'base64url').toString());
  assert.deepEqual(Object.keys(claims).sort(), ['expires', 'id', 'isLab', 'v']);
  const modified = Buffer.from(JSON.stringify({ ...claims, isLab: false, expires: clock + 999999 })).toString('base64url');
  for (const candidate of [`elementle_ad_session=${modified}.${signature}`, 'elementle_ad_session=legacy-jwt', 'elementle_ad_session=%ZZ', 'elementle_ad_session=']) {
    assert.equal((await page(candidate)).state.content, 'blocked');
  }
});
test('backend failures affect only the background endpoint and replace a free cache with blocked status', async () => {
  for (const token of ['offline', 'invalid-shape', 'expired']) {
    const { response, cookie } = await session(token);
    assert.equal(response.status, 503);
    assert.equal((await page(cookie)).state.content, 'blocked');
  }
});
test('verified token expiration caps the cache lifetime', async () => {
  const token = 'header.' + Buffer.from(JSON.stringify({ exp: Math.floor(clock / 1000) + 10 })).toString('base64url') + '.signature';
  statuses.set(token, { isLab: false });
  const { data } = await session(token);
  assert.ok(data.expiresAt <= clock + 10000);
});
test('cross-site mutations are rejected and logout clears the session', async () => {
  for (const method of ['POST', 'DELETE']) {
    const response = await fetch(base + '/api/ad-session', { method, headers: { Authorization: 'Bearer paid', Origin: 'https://attacker.example' } });
    assert.equal(response.status, 403);
    assert.equal(response.headers.get('set-cookie'), null);
  }
  const missing = await fetch(base + '/api/ad-session', { method: 'POST' });
  assert.equal(missing.status, 401);
  const cleared = await fetch(base + '/api/ad-session', { method: 'DELETE' });
  assert.equal(cleared.status, 204);
  assert.match(cleared.headers.get('set-cookie'), /^elementle_ad_session=;/);
});

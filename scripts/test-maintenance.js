const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const app = require('../server');
let server, base;
before(async () => {
  server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));

test('every website route serves only the branded maintenance page', async () => {
  for (const route of ['/', '/account', '/account.html', '/verify.html?token=secret', '/reset.html', '/lab', '/analysis', '/elements/1', '/vault/1', '/anything']) {
    const res = await fetch(base + route);
    assert.equal(res.status, 503, route);
    assert.match(res.headers.get('content-type'), /text\/html/);
    assert.match(await res.text(), /The lab is under maintenance/);
    assert.match(res.headers.get('cache-control'), /no-store/);
    assert.equal(res.headers.get('retry-after'), '60');
    assert.equal(res.headers.get('x-robots-tag'), 'noindex, nofollow');
  }
});
test('all API methods reject actions, including login, billing and callbacks', async () => {
  for (const method of ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']) {
    for (const route of ['/api', '/api/game/guess', '/api/auth/login', '/api/auth/social/google/callback?code=unused', '/api/lab/checkout']) {
      const res = await fetch(base + route, { method, ...(method === 'GET' ? {} : { headers: { 'Content-Type': 'application/json' }, body: '{malformed' }) });
      assert.equal(res.status, 503);
      assert.equal((await res.json()).code, 'MAINTENANCE');
    }
  }
});
test('static game assets and source files cannot bypass maintenance', async () => {
  for (const route of ['/index.html', '/scripts/elementle.js', '/styles/elementle.css', '/data/elements.js', '/server.js']) {
    const res = await fetch(base + route);
    assert.equal(res.status, 503);
    assert.match(await res.text(), /The lab is under maintenance/);
  }
});
test('health checks succeed without an API or database connection', async () => {
  const res = await fetch(base + '/healthz');
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { status: 'maintenance' });
  assert.equal((await fetch(base + '/healthz', { method: 'HEAD' })).status, 200);
  assert.equal((await fetch(base + '/healthz', { method: 'POST' })).status, 503);
});
test('maintenance page loads no scripts, forms, links or external assets', async () => {
  const res = await fetch(base);
  const html = await res.text();
  assert.doesNotMatch(html, /<(script|form|button|input|a|link|img|iframe)\b/i);
  assert.match(res.headers.get('content-security-policy'), /default-src 'none'/);
  assert.match(html, /name="viewport"/);
});

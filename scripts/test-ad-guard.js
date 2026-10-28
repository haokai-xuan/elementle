const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { parseHTML } = require('linkedom');
const source = fs.readFileSync(__dirname + '/ad-guard.js', 'utf8');
const KEY = 'elementle_ad_session_v1', identity = 'a'.repeat(64);
const tick = () => new Promise(resolve => setImmediate(resolve));
function run({ token = null, saved, state = 'guest', serverId = '', verified = false, fail = false, storageFailure = false, deferred = false, migrationStorage = new Map(), isLab = false, ready = true } = {}) {
  let clock = 1000000;
  const { document } = parseHTML(`<!doctype html><html><head><meta name="elementle-ad-state" content="${state}" data-session-id="${serverId}" data-session-verified="${verified ? 1 : 0}" data-session-expires="${verified ? clock + 60000 : 0}">${state === 'blocked' ? '<meta id="mediavine-settings" data-blocklist-all="1">' : ''}</head><body></body></html>`);
  Object.defineProperty(document, 'readyState', { value: 'loading', writable: true });
  const storage = new Map([['elementle_token', token], [KEY, saved ? JSON.stringify(saved) : null]]);
  const events = {}, requests = [], releases = [], timers = new Map();
  let reloads = 0, timerId = 0;
  const window = {
    addEventListener: (name, fn) => { events[name] = fn; },
    setTimeout(fn, delay) { timers.set(++timerId, { fn, delay }); return timerId; },
    clearTimeout(id) { timers.delete(id); }
  };
  vm.runInNewContext(source, {
    window, document, location: { reload() { reloads++; } },
    Date: class extends Date { static now() { return clock; } },
    sessionStorage: { getItem: key => migrationStorage.get(key) ?? null, setItem: (key, value) => migrationStorage.set(key, value), removeItem: key => migrationStorage.delete(key) },
    localStorage: {
      getItem(key) { if (storageFailure) throw new Error('Blocked storage'); return storage.get(key) ?? null; },
      setItem(key, value) { storage.set(key, value); }, removeItem(key) { storage.delete(key); }
    },
    fetch: async (url, options) => {
      requests.push({ url, ...options });
      if (deferred) await new Promise(resolve => releases.push(resolve));
      return { ok: !fail, json: async () => ({ sessionId: identity, isLab, expiresAt: clock + 60000 }) };
    }
  });
  function domReady() { document.readyState = 'complete'; document.dispatchEvent(new document.defaultView.Event('DOMContentLoaded')); }
  if (ready) domReady();
  return { document, window, storage, events, requests, releases, timers, domReady, advance: ms => { clock += ms; }, get reloads() { return reloads; } };
}

test('guests and fresh cached free sessions permit the static wrapper without a request', async () => {
  for (const options of [{}, { token: 'free', saved: { token: 'free', id: identity, isLab: false }, state: 'free', serverId: identity, verified: true }]) {
    const app = run(options);
    assert.equal(app.window.ElementleAds.enabled, true);
    assert.equal(app.document.querySelector('#mediavine-settings'), null);
    await tick(); assert.equal(app.requests.length, 0);
  }
});
test('unknown membership blocks synchronously; verification starts only after DOM readiness', async () => {
  const app = run({ token: 'paid', isLab: true, ready: false });
  assert.equal(app.document.querySelector('#mediavine-settings').getAttribute('data-blocklist-all'), '1');
  await tick(); assert.equal(app.requests.length, 0);
  app.domReady(); await tick();
  assert.equal(app.requests.length, 1);
  assert.equal(app.reloads, 0, 'confirming a subscriber must not reload the page');
  assert.equal(JSON.parse(app.storage.get(KEY)).isLab, true);
});
test('cached subscribers remain blocked with no immediate check; expired status refreshes in the background', async () => {
  const app = run({ token: 'paid', saved: { token: 'paid', id: identity, isLab: true }, state: 'blocked', serverId: identity, verified: true, isLab: true });
  await tick(); assert.equal(app.requests.length, 0);
  assert.equal(app.window.ElementleAds.enabled, false);
  app.advance(60001); app.events.focus(); await tick();
  assert.equal(app.requests.length, 1);
  assert.equal(app.reloads, 0);
});
test('unknown free status gets one reload to enable ads; failed checks stay blocked without reloading', async () => {
  const app = run({ token: 'free' });
  assert.equal(app.window.ElementleAds.enabled, false);
  await tick();
  assert.equal(app.requests[0].method, 'POST');
  assert.equal(app.reloads, 1);
  const failed = run({ token: 'paid', fail: true });
  await tick(); assert.equal(failed.reloads, 0);
  assert.equal(failed.storage.has(KEY), false);
  assert.equal(failed.document.querySelector('#mediavine-settings').getAttribute('data-blocklist-all'), '1');
});
test('routine successful background refreshes keep free users on the current page', async () => {
  const app = run({ token: 'free', saved: { token: 'free', id: identity, isLab: false }, state: 'free', serverId: identity, verified: true });
  app.advance(60001); app.events.focus(); await tick();
  assert.equal(app.requests.length, 1);
  assert.equal(app.reloads, 0);
});
test('a verified upgrade replaces cached free status before one reload; failures also fail closed', async () => {
  for (const fail of [false, true]) {
    const app = run({ token: 'free', saved: { token: 'free', id: identity, isLab: false }, state: 'free', serverId: identity, verified: true, isLab: true, fail });
    app.events['elementle:lab-change']({ detail: { isLab: true } });
    assert.equal(app.document.querySelector('#mediavine-settings').getAttribute('data-blocklist-all'), '1');
    await tick();
    assert.equal(app.requests.length, 1);
    assert.equal(app.reloads, 1);
    if (!fail) assert.equal(JSON.parse(app.storage.get(KEY)).isLab, true);
    else {
      assert.equal(app.storage.has(KEY), false);
      const afterFailure = run({token:'free', state:'free', serverId:identity, verified:true, fail:true});
      assert.equal(afterFailure.window.ElementleAds.enabled,false);
      await tick(); assert.equal(afterFailure.reloads,0);
    }
  }
});
test('account mismatch and unavailable storage cannot enable ads', async () => {
  for (const options of [
    { token: 'paid', saved: { token: 'someone-else', id: identity }, state: 'free', serverId: identity, verified: true, isLab: true },
    { storageFailure: true }
  ]) {
    const app = run(options);
    assert.equal(app.document.querySelector('#mediavine-settings').getAttribute('data-blocklist-all'), '1');
    assert.equal(app.window.ElementleAds.enabled, false);
    await tick(); assert.equal(app.reloads, 0);
  }
});
test('logout and login are serialized so stale account checks cannot overwrite the new local marker', async () => {
  const app = run({ deferred: true });
  app.storage.set('elementle_token', 'paid');
  const login = app.window.ElementleAds.sync(); await tick();
  app.storage.delete('elementle_token');
  const logout = app.window.ElementleAds.sync();
  assert.equal(app.requests.length, 1);
  app.releases.shift()(); await login; await tick();
  assert.equal(app.requests[1].method, 'DELETE');
  assert.equal(app.storage.get(KEY), null);
  app.releases.shift()(); await logout;
  assert.equal(app.storage.has(KEY), false);
  app.events.pageshow({ persisted: true }); assert.equal(app.reloads, 1);
});
test('blocked cookies cannot trigger repeated free-user reloads', async () => {
  const migrationStorage = new Map();
  const first = run({ token: 'free', migrationStorage }); await tick();
  assert.equal(first.reloads, 1);
  const second = run({ token: 'free', saved: JSON.parse(first.storage.get(KEY)), migrationStorage }); await tick();
  assert.equal(second.reloads, 0);
  assert.equal(second.window.ElementleAds.enabled, false);
});

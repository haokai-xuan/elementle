const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
function auth(search = '', saved = new Map()) {
  const source = fs.readFileSync(__dirname + '/auth.js', 'utf8');
  const functions = source.slice(source.indexOf('  function getToken()'), source.indexOf('  function decodeJwtPayload'));
  const local = new Map(), redirects = [], events = [];
  const window = { ElementleAds: { sync: async () => {} }, dispatchEvent(event) { events.push({ type: event.type, navigating: window.ElementleAuthNavigating }); } };
  const api = vm.runInNewContext(functions + ';({safeReturnTo,setToken})', {
    TOKEN_KEY: 'elementle_token', URLSearchParams, Event: class { constructor(type) { this.type = type; } }, window,
    localStorage: { getItem: key => local.get(key), setItem: (key, value) => local.set(key, value), removeItem: key => local.delete(key) },
    sessionStorage: { getItem: key => saved.get(key), setItem: (key, value) => saved.set(key, value), removeItem: key => saved.delete(key) },
    location: { search, assign: value => redirects.push(value) }
  });
  return { ...api, redirects, events, saved };
}
test('login returns to the selected feature, preserving query parameters and anchors', async () => {
  for (const target of ['/?mode=archive&date=20261001', '/?mode=freeplay', '/vault/26', '/analysis?date=20261001', '/game-history?date=20261001', '/stats#lab-archives', '/analysis/']) {
    const client = auth('?returnTo=' + encodeURIComponent(target));
    await client.setToken('jwt');
    assert.equal(client.redirects[0], target);
    assert.equal(client.events[0].navigating, true, 'the account page must not reload over the return navigation');
  }
});
test('Google sign-in preserves the pending destination across the provider round trip', async () => {
  const saved = new Map([['elementle_auth_return', '/vault/26']]);
  const client = auth('?social=1', saved);
  await client.setToken('google-jwt');
  assert.equal(client.redirects[0], '/vault/26');
  assert.equal(saved.has('elementle_auth_return'), false);
});
test('return destinations cannot redirect to external sites or API endpoints', async () => {
  for (const target of ['https://attacker.example', '//attacker.example', '/\\attacker.example', '/api/auth/social/google/start', '/%2f%2fattacker.example', '/lab\n', '/account']) {
    const client = auth('?returnTo=' + encodeURIComponent(target));
    assert.equal(client.safeReturnTo(target), null);
    await client.setToken('jwt');
    assert.equal(client.redirects.length, 0);
    assert.equal(client.events[0].navigating, false);
  }
});
test('existing Lab checkout returns still work and logout does not follow a pending destination', async () => {
  const client = auth('', new Map([['elementle_lab_return', '1']]));
  await client.setToken('jwt'); assert.equal(client.redirects[0], '/lab');
  const logout = auth('?returnTo=%2Fvault');
  await logout.setToken(null); assert.equal(logout.redirects.length, 0);
});
test('guest checkout offers login first without starting a billing request', async () => {
  const nodes = {}, events = {}, prompts = [];
  const node = id => nodes[id] ||= { hidden: false, textContent: '', dataset: {}, classList: { toggle() {} }, setAttribute() {}, addEventListener(name, fn) { this[name] = fn; } };
  const button = node('monthly'); button.dataset.plan = 'monthly';
  const guest = { isLab: false, status: 'none', trialEligible: true, canManage: false };
  await vm.runInNewContext(fs.readFileSync(__dirname + '/subscription.js', 'utf8'), {
    window: { ElementleLab: { ready: Promise.resolve(guest), requireLogin: path => { prompts.push(path); return true; } }, addEventListener: (name, fn) => { events[name] = fn; } },
    document: { getElementById: node, querySelectorAll: selector => selector === '[data-plan]' ? [button] : [] },
    localStorage: { getItem: () => null }, sessionStorage: { setItem() {} }, URL, URLSearchParams, Date,
    location: { pathname: '/lab', search: '?feature=vault' }, fetch: () => assert.fail('Guests must log in before checkout')
  });
  assert.equal(button.textContent, 'Log in');
  await button.click(); assert.equal(prompts[0], '/lab?feature=vault');
});

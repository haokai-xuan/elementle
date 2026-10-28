const assert = require('node:assert/strict');
const { parseHTML } = require('linkedom');
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';
const wrapper = 'https://scripts.mediavine.com/tags/80c3c057-e005-4c3f-a5a4-5b6e721e5808.js';

(async () => {
  const routes = ['/', '/index.html', '/lab', '/how-to-play', '/stats', '/account', '/about', '/disclaimer', '/terms_of_service_and_privacy', '/analysis', '/game-history', '/reset.html', '/verify.html', '/elements', '/vault'];
  for (let number = 1; number <= 118; number++) routes.push(`/elements/${number}`, `/vault/${number}`);
  for (const route of routes) {
    const response = await fetch(base + route);
    assert.equal(response.status, 200, route);
    const { document } = parseHTML(await response.text());
    const tags = document.querySelectorAll(`script[src="${wrapper}"]`);
    assert.equal(tags.length, 1, `${route}: exactly one source-visible wrapper`);
    const tag = tags[0];
    assert.equal(tag.parentElement, document.head, `${route}: wrapper belongs in head`);
    assert.equal(tag.id, 'mediavine-script', route);
    assert.ok(!tag.type || tag.type === 'text/javascript', `${route}: executable static wrapper`);
    assert.ok(tag.hasAttribute('async'), route);
    const scripts = [...document.head.querySelectorAll('script')];
    assert.ok(scripts.findIndex(node => node.id === 'elementle-ad-guard') < scripts.indexOf(tag), `${route}: subscriber guard precedes wrapper`);
    assert.equal(document.querySelector('meta[name="elementle-ad-state"]').content, 'guest', route);
    assert.match(response.headers.get('cache-control'), /private, no-store/, route);
    assert.ok(document.head.querySelector('script[src="/scripts/lab-access.js"]'), `${route}: membership controls installed`);
    assert.equal(document.querySelector('#mediavine-settings[data-blocklist-all="1"]'), null, route);
  }
  console.log(`Mediavine source, head placement, and membership controls verified on ${routes.length} routes.`);
})().catch(error => { console.error(error); process.exitCode = 1; });

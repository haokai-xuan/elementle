const assert = require('node:assert/strict');
const http = require('node:http');
const https = require('node:https');
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';

function wireResponse(route, headers) {
  const url = new URL(route, base);
  return new Promise((resolve, reject) => {
    const request = (url.protocol === 'https:' ? https : http).get(url, {headers}, res => {
      let bytes = 0;
      res.on('data', chunk => { bytes += chunk.length; });
      res.on('end', () => resolve({bytes, status:res.statusCode}));
      res.on('error', reject);
    });
    request.on('error', reject);
  });
}

(async () => {
  for (const route of ['/', '/lab', '/analysis', '/game-history', '/elements', '/elements/118', '/vault', '/vault/118', '/reset.html', '/verify.html', '/robots.txt', '/sitemap.xml']) {
    const res = await fetch(base + route);
    assert.equal(res.status, 200, route);
    await res.arrayBuffer();
  }
  for (const route of ['/', '/scripts/elementle.js', '/styles/elementle.css', '/data/i18n-fr.json']) {
    const res = await fetch(base + route, {headers:{'Accept-Encoding':'gzip'}});
    assert.equal(res.headers.get('content-encoding'), 'gzip', route);
    assert.match(res.headers.get('vary'), /Accept-Encoding/i);
    await res.arrayBuffer();
  }
  for (const route of ['/images/lab_icon-216.webp', '/images/elbot_frames/thinking_01.webp']) {
    const res = await fetch(base + route);
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type'), /image\/webp/);
    assert.match(res.headers.get('cache-control'), /max-age=86400/);
    await res.arrayBuffer();
    const cached = await wireResponse(route, {'If-None-Match':res.headers.get('etag')});
    assert.equal(cached.status, 304);
  }
  for (const route of ['/scripts/elementle.js', '/styles/elementle.css', '/data/i18n-fr.json']) {
    const res = await fetch(base + route);
    assert.match(res.headers.get('cache-control'), /max-age=0/);
    await res.arrayBuffer();
  }
  for (const route of ['/package-lock.json', '/server.js', '/node_modules/express/package.json', '/artifacts/email-previews/index.html']) {
    const res = await fetch(base + route);
    assert.equal(res.status, 404, route);
    await res.arrayBuffer();
  }
  const {bytes:plain} = await wireResponse('/', {'Accept-Encoding':'identity'});
  const {bytes:gzip} = await wireResponse('/', {'Accept-Encoding':'gzip'});
  assert.ok(gzip < plain / 2);
  console.log(`Delivery checks passed. Homepage: ${plain} bytes → ${gzip} bytes with gzip (${(100 * (1 - gzip / plain)).toFixed(1)}% smaller).`);
})().catch(error => { console.error(error); process.exitCode = 1; });

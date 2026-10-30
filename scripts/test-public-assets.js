const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const express = require('express');
const http = require('node:http');
const {parseHTML} = require('linkedom');
const {createPublicAssets} = require('../lib/public-assets');
const {readPage} = require('../lib/page-template');
const root = path.resolve(__dirname, '..');

(async () => {
  const assets = createPublicAssets(root), app = express();
  assets.register(app);
  require('../lib/ad-session')(app, {apiBaseUrl:'https://unused.example', apiKey:'test-key'});
  app.get('/', (req, res) => res.type('html').send(readPage(root, 'index')));
  app.get('/api/personal', (req, res) => res.set('Cache-Control','private, no-store').json({user:'test'}));
  let server;
  try {
    await new Promise(resolve => {server = app.listen(0, '127.0.0.1', resolve);});
    const base = 'http://127.0.0.1:' + server.address().port;
    const page = await fetch(base), html = await page.text();
    assert.match(page.headers.get('cache-control'), /private, no-store/);
    assert.match(page.headers.get('vary'), /Cookie/);
    const {document} = parseHTML(html);
    const styles = [...document.querySelectorAll('link[rel="stylesheet"]')];
    assert.equal(styles.length, 1, 'one blocking game stylesheet');
    assert.ok(styles[0].classList.contains('js-bundled-lab-styles'));
    assert.doesNotMatch(html, /cdnjs.cloudflare.com|fonts.googleapis.com|fonts.gstatic.com/);
    const resources = [...document.querySelectorAll('script[src],link[href],img[src]')]
      .map(node=>node.getAttribute('src') || node.getAttribute('href')).filter(url=>url.startsWith('/assets/'));
    assert.ok(resources.length > 10);
    for (const url of resources) {
      const response = await fetch(base + url);
      assert.equal(response.status, 200, url);
      assert.equal(response.headers.get('cache-control'), 'public, max-age=31536000, immutable');
      const bytes = Buffer.from(await response.arrayBuffer());
      assert.equal(url.split('/')[2],crypto.createHash('sha256').update(bytes).digest('hex').slice(0,20));
      const cached = await new Promise((resolve,reject) => {
        http.get(base + url,{headers:{'If-None-Match':response.headers.get('etag')}}, res=>{res.resume();res.on('end',()=>resolve(res.statusCode));}).on('error',reject);
      });
      assert.equal(cached,304);
    }
    const css = await (await fetch(base + styles[0].getAttribute('href'))).text();
    assert.doesNotMatch(css, /@import|https:\/\/fonts/);
    assert.match(css, /font-display: swap/);
    assert.match(css, /\.fa-github/);assert.match(css, /\.fa-bars/);
    assert.match(css, /\.lab-access-gate/);assert.match(css, /\.result-notice/);
    for (const [,font] of css.matchAll(/url\("(\/assets\/[^"\s]+\.woff2)"\)/g)) {
      const response = await fetch(base + font);
      assert.equal(response.status,200);assert.match(response.headers.get('content-type'),/font\/woff2/);
    }
    const bad = await fetch(base + '/assets/00000000000000000000/scripts/elementle.js');
    assert.equal(bad.status,404);assert.equal(bad.headers.get('cache-control'),'no-store');
    assert.equal((await fetch(base+'/assets/00000000000000000000/server.js')).status,404);
    assert.equal((await fetch(base+'/api/personal')).headers.get('cache-control'),'private, no-store');
    assert.equal((await fetch(base+'/styles/game.css')).headers.get('cache-control'),'public, max-age=0');
  } finally {if(server) await new Promise(resolve=>server.close(resolve));}

  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'elementle-assets-'));
  try {
    fs.cpSync(path.join(root,'images/icons'),path.join(fixture,'images/icons'),{recursive:true});
    fs.mkdirSync(path.join(fixture,'styles'));
    fs.mkdirSync(path.join(fixture,'fonts'));
    fs.writeFileSync(path.join(fixture,'styles/test.css'), '@font-face {src:url("/fonts/test.woff2")}');
    fs.writeFileSync(path.join(fixture,'fonts/test.woff2'), 'first-font');
    const first = createPublicAssets(fixture).get('/styles/test.css');
    fs.writeFileSync(path.join(fixture,'fonts/test.woff2'), 'updated-font');
    const next = createPublicAssets(fixture).get('/styles/test.css');
    assert.notEqual(first.url,next.url,'changing a dependency versions its parent stylesheet');
    assert.notDeepEqual(first.body,next.body);
  } finally {fs.rmSync(fixture,{recursive:true,force:true});}
  console.log('Content hashes, immutable assets, versioned fonts, one game stylesheet, local icons, cache isolation, and dependency updates pass.');
})().catch(error=>{console.error(error);process.exitCode=1;});

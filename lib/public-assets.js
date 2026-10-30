const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

// CSS order matches the game page, with membership styles available immediately.
const gameStyles = ['fonts', 'elementle', 'game-result', 'signup-nudge', 'lab', 'icons', 'footer', 'streak-freezes', 'lab-access'];
const icons = ['github', 'x-twitter', 'reddit', 'discord', 'bars', 'fire', 'arrow-left', 'trophy'];

function createPublicAssets(root) {
  const assets = new Map();
  const iconCSS = `/* Font Awesome Free 6.6.0 icons, CC BY 4.0; see images/icons/LICENSE.txt. */
.fa-solid,.fa-brands { display:inline-block; width:1em; height:1em; vertical-align:-.125em; background-color:currentColor; -webkit-mask:var(--site-icon) center/contain no-repeat; mask:var(--site-icon) center/contain no-repeat; }
` + icons.map(name => {
    const svg = fs.readFileSync(path.join(root, 'images/icons', name + '.svg'), 'utf8').replace(/<!--[\s\S]*?-->/g, '');
    return `.fa-${name} { --site-icon:url("data:image/svg+xml,${encodeURIComponent(svg.trim())}"); }`;
  }).join('\n');

  function read(file) {
    if (file === '/styles/icons.css') return Buffer.from(iconCSS);
    if (file === '/styles/game.css') {
      return Buffer.from(gameStyles.map(name => read('/styles/' + name + '.css').toString()
        .replace(/@import\s+url\(['"]?\/styles\/fonts\.css['"]?\);/g, '')).join('\n'));
    }
    return fs.readFileSync(path.join(root, file));
  }

  function get(file) {
    if (assets.has(file)) return assets.get(file);
    if (!/^\/(styles|scripts|data|images|fonts)\/[\w./-]+\.(css|js|json|svg|png|webp|jpg|jpeg|ico|woff2)$/.test(file) || file.split('/').includes('..')) return null;
    let body;
    try { body = read(file); } catch (error) { if (error.code === 'ENOENT' || error.code === 'EISDIR') return null; throw error; }
    // Version local CSS dependencies too; changing a font also changes the CSS URL.
    if (file.endsWith('.css')) {
      body = Buffer.from(body.toString().replace(/url\((['"]?)(\/[^)'"\s]+)\1\)/g,
        (match, quote, resource) => { const dependency = get(resource); return dependency ? `url("${dependency.url}")` : match; }));
    }
    const hash = crypto.createHash('sha256').update(body).digest('hex').slice(0, 20);
    const asset = { body, url: '/assets/' + hash + file, file };
    assets.set(file, asset);
    return asset;
  }

  function rewriteHtml(html) {
    // Only change real resource attributes, preserving inline scripts and JSON.
    return html.replace(/<(?:script|link|img|source)\b[^>]*>/gi, tag => tag.replace(/\b(src|href)="\/?((?:styles|scripts|data|images|fonts)\/[^"?#]+)"/g,
      (match, attribute, resource) => { const asset = get('/' + resource); return asset ? `${attribute}="${asset.url}"` : match; }));
  }

  function register(app) {
    app.get('/assets/:hash/*', (req, res) => {
      const asset = get('/' + req.params[0]);
      if (!asset || asset.url !== req.path) return res.set('Cache-Control', 'no-store').sendStatus(404);
      res.set('Cache-Control', 'public, max-age=31536000, immutable');
      res.type(path.extname(asset.file)).send(asset.body);
    });
    // Unversioned URLs support previews and runtime-created membership styles.
    for (const file of ['/styles/game.css', '/styles/icons.css']) {
      app.get(file, (req, res) => res.set('Cache-Control', 'public, max-age=0').type('css').send(get(file).body));
    }
    app.use((req, res, next) => {
      const send = res.send;
      res.send = function (body) {
        if (typeof body === 'string' && (res.get('Content-Type') || '').includes('text/html')) body = rewriteHtml(body);
        return send.call(this, body);
      };
      next();
    });
  }
  return { get, rewriteHtml, register };
}

module.exports = { createPublicAssets };

const fs = require('node:fs');
const path = require('node:path');

// A standard executable wrapper is present in every page response. Subscriber
// blocking settings and the migration guard must precede it.
const mediavine = '<script id="mediavine-script" async data-noptimize="1" data-cfasync="false" src="https://scripts.mediavine.com/tags/80c3c057-e005-4c3f-a5a4-5b6e721e5808.js"></script>';

const adGuard = fs.readFileSync(path.join(__dirname, '../scripts/ad-guard.js'), 'utf8');

const footer = fs.readFileSync(path.join(__dirname, 'footer.html'), 'utf8');

function readPage(rootDir, name) {
  return fs.readFileSync(path.join(rootDir, `${name}.html`), 'utf8')
    .replace(/<head>/i, head => `${head}\n  <!-- mediavine-membership-settings -->\n  <script id="elementle-ad-guard">${adGuard}</script>\n  ${mediavine}`)
    .replace('<!-- site-footer -->', () => footer.replace('{{year}}', String(new Date().getFullYear())));
}

module.exports = { readPage };

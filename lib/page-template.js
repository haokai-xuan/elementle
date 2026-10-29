const fs = require('node:fs');
const path = require('node:path');

// A standard executable wrapper is present in every page response. Subscriber
// blocking settings and the migration guard must precede it.
const mediavine = '<script id="mediavine-script" async data-noptimize="1" data-cfasync="false" src="https://scripts.mediavine.com/tags/80c3c057-e005-4c3f-a5a4-5b6e721e5808.js"></script>';

const adGuard = fs.readFileSync(path.join(__dirname, '../scripts/ad-guard.js'), 'utf8');

const footer = fs.readFileSync(path.join(__dirname, 'footer.html'), 'utf8');

function readPage(rootDir, name) {
  let html = fs.readFileSync(path.join(rootDir, `${name}.html`), 'utf8');
  if (name === 'index') {
    // Start essential game I/O straight from HTML, without first downloading
    // bootstrap scripts. Keep the standalone files for static previews/tests.
    for (const script of ['daily-bootstrap', 'practice-bootstrap']) {
      const source = fs.readFileSync(path.join(rootDir, 'scripts', script + '.js'), 'utf8');
      const inline = source.replace(/<\/script/gi, match => '<' + '\\' + match.slice(1));
      html = html.replace(`<script defer src="/scripts/${script}.js"></script>`,
        () => `<script data-game-bootstrap="${script}">${inline}</script>`);
    }
  }
  return html
    .replace(/<head>/i, head => `${head}\n  <!-- mediavine-membership-settings -->\n  <script id="elementle-ad-guard">${adGuard}</script>\n  ${mediavine}`)
    .replace('<!-- site-footer -->', () => footer.replace('{{year}}', String(new Date().getFullYear())));
}

module.exports = { readPage };

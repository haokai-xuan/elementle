const fs = require('node:fs');
const path = require('node:path');

const footer = fs.readFileSync(path.join(__dirname, 'footer.html'), 'utf8');

function readPage(rootDir, name) {
  return fs.readFileSync(path.join(rootDir, `${name}.html`), 'utf8')
    .replace('<!-- site-footer -->', () => footer.replace('{{year}}', String(new Date().getFullYear())));
}

module.exports = { readPage };

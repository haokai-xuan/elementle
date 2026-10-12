const { readPage } = require('./page-template');
const elements = require('../data/element-reference.json');
const families = { Nonmetal:'nonmetal', 'Noble Gas':'noble-gas', 'Alkali Metal':'alkali-metal', 'Alkaline Earth Metal':'alkaline-earth', Metalloid:'metalloid', Halogen:'halogen', Metal:'metal', 'Transition Metal':'transition-metal', Lanthanide:'lanthanide', Actinide:'actinide' };
const lock = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4M12 14v3"/></svg>';
function entrance() {
 return `<section class="vault-entry" aria-labelledby="entry-title"><div class="vault-corridor"><div class="vault-wall"><div class="vault-lintel"><span>ELEMENTLE / SECURE STORAGE</span><span>EST. 2026 · 118 CHAMBERS</span></div><div class="vault-door-frame"><div class="vault-door"><div class="door-rivets"></div><div class="door-label"><span>⚛</span><h1 id="entry-title">THE VAULT</h1><p>Every discovery belongs here.</p></div><div class="vault-wheel" aria-hidden="true"><i></i><i></i><i></i><b>El</b></div><div class="vault-bolts" aria-hidden="true"><i></i><i></i><i></i></div><div class="door-serial">DAILY DISCOVERIES / SERIES 118<br>Fe · 26 &nbsp; Cr · 24 &nbsp; Ni · 28</div></div></div><div class="vault-panel"><span class="panel-led">● IDENTITY TERMINAL</span><div class="scanner" aria-hidden="true">${lock}<i></i></div><p id="scan-status" role="status">Awaiting verification</p><button id="verify-vault">Verify identity <span>→</span></button><small>Demo access · verification always succeeds</small></div><a class="entry-exit" href="/">← Back to game</a><button class="entry-skip" id="skip-vault">Skip animation →</button></div></div></section>`;
}
function createVaultPages(root) {
 const template = readPage(root, 'how-to-play').replace(/(href|src)="(styles|scripts|images)\//g, '$1="/$2/');
 const render = number => template.replace(/<main\b[\s\S]*?<\/main>/, `<main class="vault-main" data-number="${number || ''}" tabindex="-1"><div id="vault-content" aria-live="polite"><p class="vault-loading">Connecting to your vault…</p></div></main>${number ? '' : entrance()}`)
 .replace(/<title>.*?<\/title>/, '<title>Vault | Elementle</title>')
 .replace(/<link rel="canonical"[^>]*>/, `<meta name="robots" content="noindex,follow">`)
 .replace(/<meta name="description"[^>]*>/, '<meta name="description" content="Your collection of daily Elementle discoveries.">')
 .replace('href="/how-to-play" aria-current="page"', 'href="/how-to-play"')
 .replace(/<header class="detail-header">[\s\S]*?<\/header>/, header => number ? '' : header)
 .replace('</head>', '<link rel="stylesheet" href="/styles/elements.css"><link rel="stylesheet" href="/styles/vault.css"></head>')
 .replace('</body>', `<script id="vault-elements" type="application/json">${JSON.stringify(elements.map(e=>({number:e.number,name:e.name,symbol:e.symbol,family:e.family,x:e.x,y:e.y,css:families[e.family]})))}</script><script src="/scripts/vault-progress.js"></script><script src="/scripts/vault.js"></script></body>`);
 return { overview: render(), details: new Map(elements.map(e=>[String(e.number),render(e.number)])) };
}
module.exports = { createVaultPages };

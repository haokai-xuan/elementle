const { readPage } = require('./page-template');
const elements = require('../data/element-reference.json');
const families = { Nonmetal:'nonmetal', 'Noble Gas':'noble-gas', 'Alkali Metal':'alkali-metal', 'Alkaline Earth Metal':'alkaline-earth', Metalloid:'metalloid', Halogen:'halogen', Metal:'metal', 'Transition Metal':'transition-metal', Lanthanide:'lanthanide', Actinide:'actinide' };
module.exports = root => readPage(root, 'how-to-play')
 .replace(/(href|src)="(styles|scripts|images)\//g, '$1="/$2/')
 .replace(/<title>.*?<\/title>/, '<title>elBot game analysis | Elementle</title>')
 .replace(/<link rel="canonical"[^>]*>/, '<meta name="robots" content="noindex,follow">')
 .replace('href="/how-to-play" aria-current="page"', 'href="/how-to-play"')
 .replace(/<main\b[\s\S]*?<\/main>/, `<main class="analysis-main">
 <header class="analysis-heading"><div><p class="element-eyebrow" id="analysis-context">YOUR GAME / ANALYSIS</p><h1><span data-i18n="Meet elBot">Meet <span translate="no">el<span class="elbot-brand">B</span>ot</span></span><span class="analysis-partner">, your Lab partner.</span></h1></div><a href="/" class="analysis-back" id="analysis-back">← Back to game</a></header>
 <section id="analysis-scores" class="analysis-scores" aria-label="Final game scores" hidden></section>
 <section class="bot-panel" aria-label="elBot coach"><div class="bot-stage" aria-hidden="true"><img id="bot-frame" src="/images/elbot_frames/thinking_01.webp" alt="" width="160" height="160"></div><div class="bot-speech"><h2 id="bot-title">Connecting the clues…</h2><p id="bot-message" role="status">I’m calculating your best moves.</p><button id="analysis-retry" hidden>Retry analysis</button></div></section>
 <div id="analysis-content" hidden>
 <div class="analysis-workspace"><aside class="guess-ledger"><h2>Your guesses</h2><div id="feedback-help"></div><p>Choose a turn to revisit its feedback.</p><ol id="analysis-guesses"></ol><p class="analysis-muted" id="analysis-result"></p></aside>
 <section class="analysis-table-panel"><div class="step-controls"><button id="step-prev" aria-label="Previous guess">←</button><div><span id="step-label"></span><strong id="candidate-count"></strong></div><button id="step-next" aria-label="Next guess">→</button></div>
 <div class="step-metrics" id="step-metrics" aria-live="polite"></div><p class="analysis-muted">Family colors = possible · Gray = eliminated · White outline = elBot’s suggested guess. Scroll sideways to explore →</p>
 <div class="periodic-scroll" tabindex="0" role="region" aria-label="Analysis periodic table, scroll horizontally"><div class="periodic-table">
 ${Array.from({length:18}, (_,i)=>`<span class="group-number" style="grid-column:${i+1};grid-row:1">${i+1}</span>`).join('')}
 <div class="table-key"><span id="table-phase">Before your first guess</span><strong id="table-remaining">118</strong><span>possible answers</span></div>
 ${elements.map(e=>`<div class="periodic-cell family-${families[e.family]}" data-number="${e.number}" style="grid-column:${e.x};grid-row:${e.y+1}" title="${e.number}. ${e.name} (${e.symbol})"><span class="cell-number">${e.number}</span><span class="cell-symbol">${e.symbol}</span><span class="cell-name">${e.name}</span></div>`).join('')}
 <span class="series-placeholder family-lanthanide" style="grid-column:3;grid-row:7">57–71<span>Lanthanides ↓</span></span><span class="series-placeholder family-actinide" style="grid-column:3;grid-row:8">89–103<span>Actinides ↓</span></span><span class="series-label" style="grid-column:1/3;grid-row:10">6 · Lanthanides</span><span class="series-label" style="grid-column:1/3;grid-row:11">7 · Actinides</span>
 </div></div><button id="toggle-feedback" class="feedback-toggle">Show before this guess</button></section></div>

 </div></main>`)
 .replace('</head>', '<link rel="stylesheet" href="/styles/elements.css"><link rel="stylesheet" href="/styles/analysis.css"></head>')
 .replace('</body>', `<script id="analysis-elements" type="application/json">${JSON.stringify(elements.map(e=>({number:e.number,name:e.name,symbol:e.symbol,family:e.family})))}</script><script src="/scripts/analysis.js"></script></body>`);

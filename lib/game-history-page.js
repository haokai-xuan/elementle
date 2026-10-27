const {readPage} = require('./page-template');
module.exports = root => readPage(root, 'stats')
  .replace(/(href|src)="(styles|scripts|images)\//g, '$1="/$2/')
  .replace(/<title>.*?<\/title>/, '<title>Your saved game | Elementle</title>')
  .replace(/<meta name="description"[^>]*>/, '<meta name="description" content="Revisit your saved daily Elementle game and elELO result.">')
  .replace(/<link rel="canonical"[^>]*>/, '')
  .replace('href="/stats" aria-current="page"', 'href="/stats"')
  .replace('</head>', '<link rel="stylesheet" href="/styles/game-history.css"></head>')
  .replace(/<main\b[\s\S]*?<\/main>/, `<main class="saved-game-main">
    <header class="saved-game-heading"><p class="saved-game-eyebrow">YOUR DAILY GAME</p><h1 id="saved-game-title">Saved game</h1><p id="saved-game-date"></p><a href="/stats#streak-calendar-title">← Streak calendar</a></header>
    <p id="saved-game-status" role="status">Loading your saved game…</p>
    <div id="saved-game-recovery" hidden><a href="/account" id="saved-game-signin" hidden>Sign in</a><button type="button" id="saved-game-retry">Retry</button></div>
    <div id="saved-game-content" hidden>
      <section class="saved-game-summary" aria-label="Daily game result"><p id="saved-game-outcome"></p>
        <div class="game-result-elo"><span class="game-result-elo-label">elELO</span><strong class="game-result-rating"></strong>
          <span class="game-result-change"><span class="game-result-arrow" aria-hidden="true"></span><span class="game-result-delta"></span></span><p class="game-result-rating-note"></p>
        </div>
      </section>
      <div class="grid-container"><div class="element-grid" id="saved-game-guesses" aria-label="Saved guesses in order"></div></div>
      <p id="saved-game-hint" hidden></p>
      <a id="saved-game-analysis" class="share-button saved-game-analysis" hidden><img src="/images/elbot_frames/idle_01.webp" width="24" height="24" alt="">Analyze with elBot</a>
    </div>
  </main>`)
  .replace(/<script src="\/scripts\/(streak-freezes|elelo|stats|archive-progress|archives)\.js"><\/script>/g, '')
  .replace('</body>', '<script src="/scripts/game-history.js"></script></body>');

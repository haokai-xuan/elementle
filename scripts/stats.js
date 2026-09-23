const API_BASE = '/api';
function updateStatValues(root, vals) {
  var keys = ['wins', 'played', 'streak', 'best', 'rate'];
  keys.forEach(function (key, idx) {
    var el = root.querySelector('[data-stat="' + key + '"]');
    if (!el) return;
    var prev = el.textContent;
    el.textContent = vals[key];
    if (prev !== String(vals[key])) {
      var delay = idx * 80;
      setTimeout(function () {
        el.classList.remove('stat-pop');
        el.classList.add('stat-pop-reset');
        void el.offsetWidth;
        el.classList.remove('stat-pop-reset');
        el.classList.add('stat-pop');
      }, delay);
    }
  });
}

function updateDistributionBars(root, dist) {
  var mapped = {};
  for (var i = 1; i <= 8; i++) mapped[String(i)] = dist[String(i)] || 0;
  mapped['X'] = dist['failed'] || dist['X'] || 0;
  var maxVal = Math.max(...Object.values(mapped), 1);
  var keys = Object.keys(mapped);
  keys.forEach(function (key, idx) {
    var col = root.querySelector('[data-bar="' + key + '"]');
    if (!col) return;
    var count = col.querySelector('.bar-count');
    var fill = col.querySelector('.bar-fill');
    if (count) count.textContent = mapped[key];
    if (fill) {
      var pct = (mapped[key] / maxVal * 100);
      fill.style.height = pct + '%';
      fill.style.animation = 'none';
      fill.style.transform = 'scaleY(0)';
      void fill.offsetWidth;
      fill.style.animation = 'barGrow 0.5s ease-out forwards';
      fill.style.animationDelay = (0.5 + idx * 0.06) + 's';
    }
  });
}

var _leaderboardLoaded = false;

function renderStatsPage(root, loading) {
  var totalWins, totalGames, currentStreak, maxWinStreak, winRateDisplay;

  if (loading) {
    totalWins = totalGames = currentStreak = maxWinStreak = winRateDisplay = '—';
  } else {
    totalGames = localStorage.getItem('totalGames') || 0;
    totalWins = localStorage.getItem('totalWins') || 0;
    var winRate = totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0;
    currentStreak = localStorage.getItem('currentStreak') || 0;
    maxWinStreak = localStorage.getItem('maxWinStreak') || 0;
    winRateDisplay = winRate + '%';
  }

  let distributionData;
  if (loading) {
    distributionData = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 'X': 0 };
  } else {
    distributionData = JSON.parse(localStorage.getItem('guessDistribution') || JSON.stringify({
      1: 0, 2: 0, 3: 0, 4: 0,
      5: 0, 6: 0, 7: 0, 8: 0,
      'X': 0
    }));
  }

  let maxValue = Math.max(...Object.values(distributionData), 1);

  const bars = Object.keys(distributionData).map((key, idx) => {
    let value = distributionData[key];
    let percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
    let delay = (0.5 + idx * 0.06).toFixed(2);
    return `
      <div class="bar-col" data-bar="${key}">
        <span class="bar-count">${value}</span>
        <div class="bar-track">
          <div class="bar-fill" style="height: ${percentage}%; animation-delay: ${delay}s;"></div>
        </div>
        <span class="bar-label">${key}</span>
      </div>
    `;
  }).join("");

  root.innerHTML = `
    <div class="page-card stats-modal">
      <div class="stats-modal-header">
        <h1 class="modal-title">Statistics</h1>
        <button type="button" class="stats-fire-btn js-leaderboard-toggle" aria-label="View streak leaderboard">
          <i class="fa-solid fa-fire"></i>
        </button>
      </div>

      <div class="stats-swipe-viewport">
        <div class="stats-swipe-track js-stats-swipe-track">

          <div class="stats-swipe-panel stats-panel-view">
            <div class="stats-grid">
              <div class="stat-item">
                <span class="stat-value" data-stat="wins">${totalWins}</span>
                <span class="stat-label">Wins</span>
              </div>
              <div class="stat-item">
                <span class="stat-value" data-stat="played">${totalGames}</span>
                <span class="stat-label">Played</span>
              </div>
              <div class="stat-item">
                <span class="stat-value" data-stat="streak">${currentStreak}</span>
                <span class="stat-label">Current streak</span>
              </div>
              <div class="stat-item">
                <span class="stat-value" data-stat="best">${maxWinStreak}</span>
                <span class="stat-label">Best streak</span>
              </div>
              <div class="stat-item stat-item-wide">
                <span class="stat-value" data-stat="rate">${winRateDisplay}</span>
                <span class="stat-label">Win rate</span>
              </div>
            </div>
            <div class="guess-distribution">
              <h3 class="distribution-title">Guess distribution</h3>
              <div class="bars-container">
                ${bars}
              </div>
            </div>
          </div>

          <div class="stats-swipe-panel leaderboard-panel-view" inert>
            <div class="leaderboard-header">
              <button type="button" class="leaderboard-back-btn js-leaderboard-back" aria-label="Back to your stats">
                <i class="fa-solid fa-arrow-left"></i>
              </button>
              <h3 class="leaderboard-title"><i class="fa-solid fa-fire"></i> Top Current Streaks</h3>
            </div>
            <ul class="leaderboard-list js-leaderboard-list">
              <li class="leaderboard-loading">Loading<span class="loading-dots"></span></li>
            </ul>
          </div>

        </div>
      </div>

      <p class="js-stats-status auth-error" role="status"></p>
      ${['today', 'yesterday'].map(period => `
      <section class="guess-distribution community-distribution js-${period}-distribution" aria-labelledby="${period}-title">
        <h2 class="distribution-title" id="${period}-title">${period === 'today' ? 'Today' : 'Yesterday'}’s community results</h2>
        <p class="distribution-caption js-distribution-date"></p>
        <p class="distribution-caption js-distribution-status" role="status">Loading results…</p>
        <div class="bars-container js-distribution-bars" hidden></div>
        <button type="button" class="auth-forgot-link js-distribution-retry" hidden>Try again</button>
      </section>`).join('')}
      <a class="modal-back-button" href="/">Back to game</a>
    </div>
  `;


  _leaderboardLoaded = false;
  bindLeaderboardToggle(root);
  syncStatsSwipeViewportHeight(root);

  new ResizeObserver(() => syncStatsSwipeViewportHeight(root)).observe(root.querySelector('.stats-panel-view'));
}

function syncStatsSwipeViewportHeight(root) {
  var viewport = root.querySelector('.stats-swipe-viewport');
  var statsPanel = root.querySelector('.stats-panel-view');
  if (!viewport || !statsPanel) return;

  viewport.style.height = 'auto';
  viewport.style.height = statsPanel.offsetHeight + 'px';
}

function bindLeaderboardToggle(root) {
  const fireBtn = root.querySelector('.js-leaderboard-toggle');
  const backBtn = root.querySelector('.js-leaderboard-back');
  const track = root.querySelector('.js-stats-swipe-track');
  if (!fireBtn || !backBtn || !track) return;

  fireBtn.addEventListener('click', () => {
    syncStatsSwipeViewportHeight(root);
    root.querySelector('.stats-panel-view').inert = true;
    root.querySelector('.leaderboard-panel-view').inert = false;
    track.classList.add('is-leaderboard-view');
    // Focus must not scroll the offscreen panel in addition to the slide transform.
    backBtn.focus({ preventScroll: true });
    fireBtn.classList.add('is-active');
    if (!_leaderboardLoaded) loadLeaderboard(root);
  });

  backBtn.addEventListener('click', () => {
    root.querySelector('.stats-panel-view').inert = false;
    root.querySelector('.leaderboard-panel-view').inert = true;
    track.classList.remove('is-leaderboard-view');
    fireBtn.focus({ preventScroll: true });
    fireBtn.classList.remove('is-active');
  });
}

async function loadLeaderboard(root) {
  const list = root.querySelector('.js-leaderboard-list');
  if (!list) return;

  list.innerHTML = '<li class="leaderboard-loading">Loading<span class="loading-dots"></span></li>';

  try {
    const res = await fetch(API_BASE + '/leaderboard/current_streaks');
    if (!res.ok) throw new Error('Failed to load leaderboard');
    const data = await res.json(); // [["avsangelschick",42], ["gmeowser",27], ["LucaGiordano",27], ...]

    if (!Array.isArray(data) || data.length === 0) {
      list.innerHTML = '<li class="leaderboard-empty">No active streaks yet</li>';
      _leaderboardLoaded = true;
      return;
    }

    let lastStreak = null;
    let lastRank = 0;
    const currentUsername = typeof window.getAuthUser === 'function'
      ? window.getAuthUser()?.username
      : null;

    list.innerHTML = data.map(([username, streak], index) => {
      // Dense ranking: ties share a rank; next distinct streak value increments by 1 (no skipping)
      if (streak !== lastStreak) {
        lastRank += 1;
        lastStreak = streak;
      }
      const rank = lastRank;
      const rankClass = rank <= 3 ? ' rank-' + rank : '';
      const isCurrentUser = currentUsername && username === currentUsername;
      const currentUserClass = isCurrentUser ? ' is-current-user' : '';

      return `
        <li class="leaderboard-row${rankClass}${currentUserClass}" style="--row-i: ${index}"${isCurrentUser ? ' aria-current="true"' : ''}>
          <div class="leaderboard-rank">${rank}</div>
          <div class="leaderboard-username">${escapeHtmlText(username)}</div>
          <div class="leaderboard-streak"><i class="fa-solid fa-fire"></i>${streak}</div>
        </li>
      `;
    }).join('');

    _leaderboardLoaded = true;
  } catch (err) {
    list.innerHTML = '<li class="leaderboard-error">Couldn\'t load leaderboard. Try again later.</li>';
    console.warn('Leaderboard fetch failed', err);
  }
}

function escapeHtmlText(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}


function getLocalDay(offset = 0, now = new Date()) {
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, 12);
  return {
    key: String(date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate()),
    label: date.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })
  };
}

function normalizeDailyDistribution(data) {
  return Array.from({ length: 9 }, (_, index) => {
    const count = Number(data?.[String(index + 1)] ?? 0);
    return { label: index === 8 ? 'X' : String(index + 1),
      count: Number.isFinite(count) && count >= 0 ? Math.floor(count) : 0 };
  });
}

function getPlayerResultColumn(state, dayKey) {
  if (!state || String(state.localDate) !== dayKey) return null;
  const guesses = Number(state.numGuesses);
  if (!Number.isInteger(guesses) || guesses < 1 || guesses > 8) return null;
  if (state.won === true) return String(guesses);
  return guesses === 8 ? 'X' : null;
}

// Session caches survive page navigation; scopes prevent stale day/account/game data.
const statsRequestMemory = new Map();
const statsRequestsInFlight = new Map();
async function cachedStatsRequest(key, scope, ttl, request) {
  const storageKey = 'elementle_stats_cache_' + key;
  let cached = statsRequestMemory.get(storageKey);
  try { cached = JSON.parse(sessionStorage.getItem(storageKey)) || cached; } catch {}
  if (cached && cached.scope === scope && cached.expiresAt > Date.now()) return cached.data;
  const flightKey = storageKey + ':' + scope;
  if (!statsRequestsInFlight.has(flightKey)) {
    const pending = request().then(data => {
      const entry = { scope, expiresAt: Date.now() + ttl, data };
      statsRequestMemory.set(storageKey, entry);
      try { sessionStorage.setItem(storageKey, JSON.stringify(entry)); } catch {}
      return data;
    }).finally(() => statsRequestsInFlight.delete(flightKey));
    statsRequestsInFlight.set(flightKey, pending);
  }
  return statsRequestsInFlight.get(flightKey);
}

function statsGameRevision() {
  return localStorage.getItem('elementle_stats_revision') || '';
}

async function accountCacheScope(token, dayKey) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return dayKey + ':' + Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, '0')).join('') + ':' + statsGameRevision();
}

async function getTodayResultColumn(dayKey) {
  const token = localStorage.getItem('elementle_token');
  if (token) {
    try {
      const scope = await accountCacheScope(token, dayKey);
      const state = await cachedStatsRequest('game_state', scope, 60000, async () => {
        const response = await fetch(API_BASE + '/game/state?localDate=' + dayKey, {
          headers: { Authorization: 'Bearer ' + token }
        });
        if (!response.ok) throw new Error('Unable to load game state');
        return response.json();
      });
      return getPlayerResultColumn(state, dayKey);
    } catch { return null; }
  }
  return getPlayerResultColumn({
    localDate: localStorage.getItem('gameDate'),
    numGuesses: localStorage.getItem('numberOfGuesses'),
    won: localStorage.getItem('guessedCorrectly') === 'true'
  }, dayKey);
}

// Today and yesterday use the same five-minute snapshot, including across navigation.
function fetchCommunityDistribution() {
  const scope = getLocalDay().key + ':' + statsGameRevision();
  return cachedStatsRequest('community', scope, 5 * 60000, async () => {
    const response = await fetch(API_BASE + '/guess_distribution');
    if (!response.ok) throw new Error('Unable to load results');
    const data = await response.json();
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Invalid results');
    return data;
  });
}

function initializeCommunityDistribution(root, period) {
  const isToday = period === 'today';
  const section = root.querySelector('.js-' + period + '-distribution');
  const dateLabel = section.querySelector('.js-distribution-date');
  const status = section.querySelector('.js-distribution-status');
  const bars = section.querySelector('.js-distribution-bars');
  const retry = section.querySelector('.js-distribution-retry');
  let requestedDay = '';
  let requestId = 0;

  async function load() {
    const day = getLocalDay(isToday ? 0 : -1);
    requestedDay = day.key;
    const id = ++requestId;
    dateLabel.textContent = day.label + ' · All players · X = unsuccessful';
    status.textContent = 'Loading results…';
    bars.hidden = true;
    retry.hidden = true;
    try {
      const resultColumn = isToday ? getTodayResultColumn(day.key) : Promise.resolve(null);
      const data = await fetchCommunityDistribution();
      if (id !== requestId) return;
      const distribution = normalizeDailyDistribution(data[day.key]);
      const total = distribution.reduce((sum, bucket) => sum + bucket.count, 0);
      if (!total) {
        status.textContent = 'No results recorded for this day yet.';
        return;
      }
      const max = Math.max(...distribution.map(bucket => bucket.count));
      bars.innerHTML = distribution.map(({ label, count }) => {
        const percentage = (count / total * 100).toLocaleString(undefined, { maximumFractionDigits: 1 }) + '%';
        return `
        <div class="bar-col" data-result-column="${label}" aria-label="${label === 'X' ? 'Unsuccessful' : label + ' guesses'}: ${percentage}">
          <span class="bar-count">${percentage}</span>
          <div class="bar-track"><div class="bar-fill" style="height: ${count / max * 100}%; min-height: 0"></div></div>
          <span class="bar-label">${label}</span>
        </div>`;
      }).join('');
      status.textContent = '';
      bars.hidden = false;
      const playerColumn = await resultColumn;
      if (id !== requestId || !playerColumn) return;
      const column = bars.querySelector('[data-result-column="' + playerColumn + '"]');
      if (column) {
        const marker = document.createElement('span');
        marker.className = 'distribution-you';
        marker.innerHTML = 'You<span aria-hidden="true">↓</span>';
        column.prepend(marker);
        column.classList.add('is-player-result');
        column.setAttribute('aria-label', 'Your result · ' + column.getAttribute('aria-label'));
      }
    } catch {
      if (id !== requestId) return;
      status.textContent = 'Could not load ' + (isToday ? 'today’s' : 'yesterday’s') + ' results.';
      retry.hidden = false;
    }
  }

  retry.addEventListener('click', load);
  // Refresh when a page left open crosses local midnight, including after sleep.
  function refreshDay() {
    if (getLocalDay(isToday ? 0 : -1).key !== requestedDay) load();
  }
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) refreshDay();
  });
  setInterval(refreshDay, 60000);
  load();
}

async function initializeStats() {
  const root = document.querySelector('.js-stats-page');
  const token = localStorage.getItem('elementle_token');
  renderStatsPage(root, !!token);
  initializeCommunityDistribution(root, 'today');
  initializeCommunityDistribution(root, 'yesterday');
  if (!token) return;
  const status = root.querySelector('.js-stats-status');
  status.textContent = 'Loading your statistics…';
  const date = new Date();
  const localDate = date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
  try {
    const scope = await accountCacheScope(token, String(localDate));
    const data = await cachedStatsRequest('user_stats', scope, 60000, async () => {
      const response = await fetch('/api/user/stats?localDate=' + localDate, {
        headers: { Authorization: 'Bearer ' + token }
      });
      if (!response.ok) throw new Error('Unable to load statistics');
      return response.json();
    });
    updateStatValues(root, { wins: data.totalWins || 0, played: data.totalGamesPlayed || 0,
      streak: data.currentStreak || 0, best: data.maxStreak || 0, rate: (data.winRate || 0) + '%' });
    updateDistributionBars(root, data.guessDistribution || {});
    status.textContent = '';
  } catch {
    status.textContent = 'Could not load your statistics. Please refresh to try again.';
  }
}
initializeStats();

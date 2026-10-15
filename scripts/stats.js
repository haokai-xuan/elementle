const API_BASE = '/api';
const CALENDAR_START_DATE = '20260725';
// Only completed wins have a solving guess count; X is excluded.
function averageWinningGuesses(distribution) {
  let wins = 0, guesses = 0;
  for (let i = 1; i <= 8; i++) {
    const count = Number(distribution[String(i)]) || 0;
    wins += count;
    guesses += i * count;
  }
  return wins ? (guesses / wins).toFixed(1) : '—';
}
function updateStatValues(root, vals) {
  var keys = ['wins', 'played', 'streak', 'best', 'rate', 'average'];
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
var _calendarSizeObserver;

function setStatsLoading(root, active, initial = false) {
  root.classList?.toggle('stats-is-loading', active);
  root.classList?.toggle('stats-initial-loading', active && initial);
  root.setAttribute?.('aria-busy', String(active));
  const status = root.querySelector('.js-stats-status');
  status?.classList?.toggle('stats-loading-indicator', active);
}

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
      <section class="major-stats-card" aria-labelledby="major-stats-title">
        <div class="stats-modal-header">
          <h1 class="modal-title" id="major-stats-title">Statistics</h1>
          <button type="button" class="leaderboard-launch streak-leaderboard-launch js-leaderboard-toggle" aria-label="View streak leaderboard" aria-expanded="false" aria-controls="streak-leaderboard">
            <i class="fa-solid fa-fire" aria-hidden="true"></i><span>Streak leaders</span><span aria-hidden="true">↗</span>
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
                <div class="stat-item">
                  <span class="stat-value" data-stat="rate">${winRateDisplay}</span>
                  <span class="stat-label">Win rate</span>
                </div>
                <div class="stat-item" title="Average guesses in completed daily wins; unsuccessful and practice games are excluded.">
                  <span class="stat-value" data-stat="average">${loading ? '—' : averageWinningGuesses(distributionData)}</span>
                  <span class="stat-label">Avg guesses (wins)</span>
                </div>
              </div>
            </div>

            <div class="stats-swipe-panel leaderboard-panel-view" id="streak-leaderboard" inert>
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

      </section>

      <div class="guess-distribution">
        <h3 class="distribution-title">Guess distribution</h3>
        <div class="bars-container">
          ${bars}
        </div>
      </div>

      <p class="js-stats-status auth-error" role="status"></p>
      <section class="guess-distribution community-distribution js-today-distribution" aria-labelledby="today-title">
        <h2 class="distribution-title" id="today-title">Today’s community results</h2>
        <p class="distribution-caption js-distribution-date"></p>
        <p class="distribution-caption js-distribution-status" role="status">Loading results…</p>
        <div class="bars-container js-distribution-bars" hidden></div>
        <button type="button" class="auth-forgot-link js-distribution-retry" hidden>Try again</button>
      </section>

      <hr class="stats-section-divider">
      ${window.ElementleElo.markup(loading)}
      <hr class="stats-section-divider">
      <section class="lab-archives stats-calendar streak-calendar" aria-labelledby="streak-calendar-title">
        <div class="freeze-scenery" aria-hidden="true"><span>❄</span><span>❄</span><span>❄</span></div>
        <div class="lab-heading"><h2 id="streak-calendar-title">Streak calendar</h2></div>
        <p class="js-freeze-guest" ${loading ? 'hidden' : ''}><a href="/account">Sign in</a> to earn streak freezes and keep your daily calendar across devices.</p>
        <div class="js-freeze-account calendar-body" ${loading ? '' : 'hidden'}>
          <div class="calendar-intro"><div class="calendar-intro-content"><div class="freeze-summary"><span class="freeze-count">❄ <strong class="js-freeze-count" title="Every ten new daily solves earns one freeze. Milestones reached at capacity are not banked.">— / —</strong><small> freezes</small></span><span class="js-freeze-progress-label">Loading…</span></div>
          <progress class="freeze-progress js-freeze-progress" max="10" value="0" aria-label="Daily solves towards your next freeze"></progress>
          <p>Earn a freeze every 10 daily solves. Store one on a free account, or two with Elementle Lab. Freezes protect failed days and fully covered absences. Protected days preserve your streak without adding wins.</p></div></div>
          <div class="lab-controls"><button class="js-streak-prev" aria-label="Previous month">←</button><h3 class="js-streak-month"></h3><button class="js-streak-next" aria-label="Next month">→</button></div>
          <div class="lab-week" aria-hidden="true"><span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span></div>
          <div class="lab-days js-streak-days"></div>
          <div class="calendar-legend"><span class="solved">✓ Solved</span><span class="missed">− Missed</span><span class="failed">× Failed</span><span class="frozen">❄ Freeze used</span></div>
        </div>
      </section>
    </div>
  `;


  _leaderboardLoaded = false;
  const layout = typeof root.closest === 'function' ? root.closest('.stats-layout') : null;
  if (layout) {
    _calendarSizeObserver?.disconnect();
    const intros = layout.querySelectorAll('.calendar-intro-content');
    const legends = layout.querySelectorAll('.calendar-legend');
    _calendarSizeObserver = new ResizeObserver(() => {
      const height = Math.ceil(Math.max(...Array.from(intros, intro => intro.getBoundingClientRect().height)));
      layout.style.setProperty('--calendar-intro-height', height + 'px');
      const legendHeight = Math.ceil(Math.max(...Array.from(legends, legend => {
        const top = legend.getBoundingClientRect().top;
        return Math.max(...Array.from(legend.children, item => item.getBoundingClientRect().bottom - top));
      })));
      layout.style.setProperty('--calendar-legend-height', legendHeight + 'px');
    });
    intros.forEach(intro => _calendarSizeObserver.observe(intro));
    legends.forEach(legend => _calendarSizeObserver.observe(legend));
  }
  bindLeaderboardToggle(root);
  window.ElementleElo.initialize(root, loading);
  syncStatsSwipeViewportHeight(root);

  new ResizeObserver(() => syncStatsSwipeViewportHeight(root)).observe(root.querySelector('.stats-grid'));
}

function syncStatsSwipeViewportHeight(root) {
  var viewport = root.querySelector('.stats-swipe-viewport');
  var grid = root.querySelector('.stats-grid');
  if (!viewport || !grid) return;

  viewport.style.height = grid.offsetHeight + 'px';
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
    fireBtn.setAttribute('aria-expanded', 'true');
    if (!_leaderboardLoaded) loadLeaderboard(root);
  });

  backBtn.addEventListener('click', () => {
    root.querySelector('.stats-panel-view').inert = false;
    root.querySelector('.leaderboard-panel-view').inert = true;
    track.classList.remove('is-leaderboard-view');
    fireBtn.focus({ preventScroll: true });
    fireBtn.classList.remove('is-active');
    fireBtn.setAttribute('aria-expanded', 'false');
  });
}

async function loadLeaderboard(root) {
  const list = root.querySelector('.js-leaderboard-list');
  if (!list) return;

  list.innerHTML = '<li class="leaderboard-loading">Loading<span class="loading-dots"></span></li>';

  try {
    const res = await fetch(API_BASE + '/leaderboard/current_streaks', {cache:'no-store'});
    if (!res.ok) throw new Error('Failed to load leaderboard');
    const data = await res.json(); // [[username, streak, isLab], ...]; old two-value rows remain supported.

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

    list.innerHTML = data.map(([username, streak, isLab], index) => {
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
          <div class="leaderboard-username"><span class="leaderboard-name-text">${escapeHtmlText(username)}</span>${isLab === true ? '<img class="leaderboard-lab-icon" src="/images/lab_icon.png" width="18" height="18" alt="Elementle Lab member" title="Elementle Lab member">' : ''}</div>
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
    label: date.toLocaleDateString(window.ElementleI18n?.locale, { month: 'long', day: 'numeric', year: 'numeric' })
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
      // Do not replay one-time freeze notifications from a cached stats response.
      const cachedData = key === 'personal' && data.streakFreezes ? {...data, streakFreezes:{...data.streakFreezes, used:0, earned:false}} : data;
      const entry = { scope, expiresAt: Date.now() + ttl, data:cachedData };
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

async function getDailyResultColumn(dayKey) {
  const token = localStorage.getItem('elementle_token');
  if (token) {
    try {
      const scope = await accountCacheScope(token, dayKey);
      const state = await cachedStatsRequest('game_state_' + dayKey, scope, 60000, async () => {
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

// Cache today’s community snapshot for five minutes, including across navigation.
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
    status.classList?.add('stats-loading-indicator');
    section.setAttribute?.('aria-busy','true');
    bars.hidden = true;
    retry.hidden = true;
    try {
      const resultColumn = getDailyResultColumn(day.key);
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
        const percentage = (count / total * 100).toLocaleString(window.ElementleI18n?.locale, { maximumFractionDigits: 1 }) + '%';
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
    } finally {
      if (id === requestId) {status.classList?.remove('stats-loading-indicator');section.setAttribute?.('aria-busy','false');}
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

function initializeStreakCalendar(root) {
  let month = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  let currentMonth = month.getTime();
  let history = {};
  let analyzableDates = new Set();
  let ratings = new Map();
  let ready = false;
  const first = new Date(2026, 6, 1);
  function render() {
    const now = new Date();
    const today = getLocalDay().key;
    const latestMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    if (month.getTime() === currentMonth) month = new Date(latestMonth);
    currentMonth = latestMonth;
    root.querySelector('.js-streak-month').textContent = month.toLocaleDateString(window.ElementleI18n?.locale, {month:'long',year:'numeric'});
    root.querySelector('.js-streak-prev').disabled = month <= first;
    root.querySelector('.js-streak-next').disabled = month >= new Date(now.getFullYear(), now.getMonth(), 1);
    const grid = root.querySelector('.js-streak-days');
    grid.replaceChildren();
    for (let i=0; i<month.getDay(); i++) grid.append(document.createElement('span'));
    const days = new Date(month.getFullYear(), month.getMonth()+1, 0).getDate();
    for (let n=1; n<=days; n++) {
      const key = String(month.getFullYear()*10000 + (month.getMonth()+1)*100 + n);
      const state = ready && key >= CALENDAR_START_DATE ? (key === today && history[key] === 'missed' ? '' : history[key]) || (key < today && key >= CALENDAR_START_DATE ? 'missed' : '') : '';
      const symbol = { solved:'✓', missed:'−', failed:'×', frozen:'❄' }[state] || '';
      const cell = document.createElement('button');
      cell.type = 'button';
      const analyzable = ready && key >= CALENDAR_START_DATE && (analyzableDates.has(key) || ratings.has(key)) && key <= today;
      cell.className = state + (key === today ? ' today' : '') + (analyzable ? ' analyzable' : '');
      cell.disabled = !analyzable;
      cell.innerHTML = '<span class="day-number">' + n + '</span>' + '<span class="day-symbol" aria-hidden="true">' + symbol + '</span>';
      const label = { solved:'Solved', missed:'Missed', failed:'Failed without a freeze', frozen:'Streak freeze used' }[state] || (key === today ? 'Not completed yet' : 'No result');
      cell.setAttribute('aria-label', new Date(month.getFullYear(),month.getMonth(),n).toLocaleDateString(window.ElementleI18n?.locale) + ': ' + label);
      cell.title = label + (analyzable ? ' · View game result and elELO' : '');
      if (analyzable) {
        cell.innerHTML += '<span class="analysis-magnifier" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/></svg></span>';
        cell.setAttribute('aria-label', cell.title + ' · ' + new Date(month.getFullYear(),month.getMonth(),n).toLocaleDateString(window.ElementleI18n?.locale));
        cell.onclick = () => {
          window.ElementleGameResult.openHistory({localDate:key, title:'Daily game result', historical:true, elo:ratings.get(key)});
        };
      }
      if (key === today) cell.setAttribute('aria-current','date');
      grid.append(cell);
    }
    const weeks = Math.ceil((month.getDay() + days) / 7);
    grid.setAttribute('data-weeks', String(weeks));
    while (grid.children.length < weeks * 7) grid.append(document.createElement('span'));
  }
  root.querySelector('.js-streak-prev').onclick = () => {month = new Date(month.getFullYear(),month.getMonth()-1,1);render();};
  root.querySelector('.js-streak-next').onclick = () => {month = new Date(month.getFullYear(),month.getMonth()+1,1);render();};
  render();
  return data => {
    const f = data.streakFreezes;
    ready = true;
    history = data.calendar || {};
    ratings = new Map((data.elELO?.history || []).map(entry => [String(entry.date).replace(/-/g, ''), entry]));
    analyzableDates = new Set(data.analyzableDates || Object.keys(history).filter(key => ['solved','failed'].includes(history[key])));
    root.querySelector('.js-freeze-count').textContent = f ? f.available + ' / ' + f.capacity : '— / 2';
    root.querySelector('.js-freeze-progress').value = f?.progress || 0;
    root.querySelector('.js-freeze-progress-label').textContent = f ? (f.available === f.capacity ? 'At capacity · ' : '') + `${f.progress} / ${f.earnEvery} daily solves` : 'Freezes are coming soon';
    render();
    window.ElementleFreezes?.consume(data);
  };
}

async function initializeStats() {
  const root = document.querySelector('.js-stats-page');
  root.addEventListener('elementle:elo-layout', () => syncStatsSwipeViewportHeight(root));
  let token = localStorage.getItem('elementle_token');
  renderStatsPage(root, !!token);
  let updateCalendar = initializeStreakCalendar(root);
  let requestId = 0, personalRevision = 0, hasLoaded = false;
  async function refresh() {
    const auth = localStorage.getItem('elementle_token');
    if (auth !== token) {
      token = auth;
      hasLoaded = false;
      // Repaint account data immediately so another user's history never lingers.
      renderStatsPage(root, !!token);
      initializeCommunityDistribution(root, 'today');
      updateCalendar = initializeStreakCalendar(root);
    }
    const id = ++requestId;
    if (!root.querySelector('.js-elelo-board').hidden) void window.ElementleElo.refreshLeaderboard(root);
    if (!auth) {setStatsLoading(root,false);return;}
    const status = root.querySelector('.js-stats-status');
    status.textContent = hasLoaded ? 'Updating statistics…' : 'Loading your statistics…';
    setStatsLoading(root,true,!hasLoaded);
    try {
      const day = getLocalDay().key;
      const scope = await accountCacheScope(auth, day) + ':' + personalRevision + ':' + (localStorage.getItem('elementle_lab_revision') || '');
      const data = await cachedStatsRequest('personal', scope, 30000, async () => {
        const response = await fetch('/api/user/stats?localDate=' + day, {
          cache:'no-store', headers: {Authorization:'Bearer ' + auth}, signal:AbortSignal.timeout(12000)
        });
        if (!response.ok) throw new Error('Unable to load statistics');
        return response.json();
      });
      if (id !== requestId || auth !== localStorage.getItem('elementle_token')) return;
      updateStatValues(root, {wins:data.totalWins || 0, played:data.totalGamesPlayed || 0,
        streak:data.currentStreak || 0, best:data.maxStreak || 0, rate:(data.winRate || 0) + '%',
        average:averageWinningGuesses(data.guessDistribution || {})});
      updateDistributionBars(root, data.guessDistribution || {});
      updateCalendar(data);
      window.ElementleElo.update(root, data.elELO);
      syncStatsSwipeViewportHeight(root);
      hasLoaded = true;
      status.textContent = '';
    } catch {
      if (id === requestId) {
        status.textContent = 'Could not load your statistics. We’ll try again when you return to this tab.';
        if(root.querySelector('.js-elelo-rating').textContent === '—') window.ElementleElo.update(root, null);
      }
    } finally {
      if (id === requestId && auth === localStorage.getItem('elementle_token')) setStatsLoading(root,false);
    }
  }
  window.addEventListener('focus', refresh);
  window.addEventListener('pageshow', event => {if (event.persisted) refresh();});
  window.addEventListener('elementle:auth-change', refresh);
  window.addEventListener('elementle:game-complete', () => { personalRevision++; refresh(); });
  window.addEventListener('storage', event => {if (['elementle_token','elementle_stats_revision'].includes(event.key)) refresh();});
  document.addEventListener('visibilitychange', () => {if (!document.hidden) refresh();});
  setInterval(() => {if (!document.hidden) refresh();}, 60000);
  const archiveFirst = typeof location !== 'undefined' && location.hash === '#lab-archives';
  const initial = archiveFirst ? new Promise(resolve => window.addEventListener('elementle:archives-ready', () => {refresh().then(resolve);}, {once:true})) : refresh();
  window.ElementleStatsReady = initial;
  await initial;
  initializeCommunityDistribution(root, 'today');
}
initializeStats();

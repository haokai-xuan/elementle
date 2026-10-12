/* Read-only daily history: no game submissions, local game state or streak writes. */
(() => {
  const $ = id => document.getElementById(id);
  const date = new URLSearchParams(location.search).get('date') || '';
  let requestId = 0, inFlight = null;
  const cacheKey = 'elementle_saved_game_' + date;
  function readCache(token) {
    try {
      const entry = JSON.parse(sessionStorage.getItem(cacheKey) || 'null');
      if (entry?.token === token && entry.expires > Date.now()) return entry.data;
    } catch {}
    return null;
  }
  async function requestGame(token, force) {
    const cached = !force && readCache(token);
    if (cached) return cached;
    if (inFlight?.token === token) return inFlight.promise;
    const promise = (async () => {
      const response = await fetch('/api/game/history?localDate=' + date, {cache:'no-store',headers:{Authorization:'Bearer '+token},
        signal:typeof AbortSignal !== 'undefined' ? AbortSignal.timeout(12000) : undefined});
      const data = await response.json().catch(() => {throw new Error('Saved games are temporarily unavailable. Please try again.');});
      if (!response.ok) throw new Error(response.status === 401 ? 'Sign in again to view your saved game.' : data.error || 'Unable to load your saved game.');
      if (!data.answer || !Array.isArray(data.guesses)) throw new Error('This saved game is unavailable.');
      if (token === localStorage.getItem('elementle_token')) {
        try { sessionStorage.setItem(cacheKey, JSON.stringify({token, expires:Date.now()+300000, data})); } catch {}
      }
      return data;
    })();
    inFlight = {token, promise};
    try { return await promise; }
    catch (error) {try { sessionStorage.removeItem(cacheKey); } catch {} throw error;}
    finally {if (inFlight?.promise === promise) inFlight = null;}
  }
  const make = (tag, className, text) => {
    const node = document.createElement(tag); node.className = className; node.textContent = text; return node;
  };
  function renderGame(data) {
    $('saved-game-title').textContent = 'Daily Elementle';
    $('saved-game-outcome').textContent = `${data.won ? 'Solved in' : 'Used'} ${data.numGuesses} / 8 guesses · Answer: ${data.answer.name} (${data.answer.symbol})`;
    window.ElementleGameResult.renderElo($('saved-game-content'), {elo:data.elELO, historical:true});
    const grid = $('saved-game-guesses'); grid.replaceChildren();
    for (let index = 0; index < 8; index++) {
      const card = make('div', 'element', '');
      const guess = data.guesses[index];
      card.setAttribute('aria-label', guess ? `Guess ${index+1}: ${guess.name}` : `Guess ${index+1}: unused`);
      if (guess) {
        const exact = guess.atomicNumber === data.answer.atomicNumber;
        card.classList.add('guessed-element', 'shimmer-done');
        const atomic = make('span', 'atomic-number', String(guess.atomicNumber) + ' ');
        atomic.append(make('span', 'atomic-signal', exact ? '🎉' : guess.atomicNumber < data.answer.atomicNumber ? '⬆️' : '⬇️'));
        const symbol = make('span', 'symbol', '');
        [...guess.symbol].forEach((letter, position) => {
          const span = make('span', '', letter);
          const lower = letter.toLowerCase(), answerSymbol = data.answer.symbol.toLowerCase();
          if (lower === answerSymbol[position]) span.style.color = 'rgb(83, 141, 78)';
          else if (answerSymbol.includes(lower)) span.style.color = 'rgb(181, 159, 59)';
          symbol.append(span);
        });
        const name = make('span', 'name', guess.name);
        const family = make('span', 'family', guess.family);
        if (guess.family === data.answer.family) family.classList.add('green');
        if (exact) {card.classList.add('correct-card'); name.classList.add('green'); atomic.classList.add('green');}
        card.append(atomic, symbol, name, family);
      } else card.append(make('span', 'element-slot-number', String(index+1)));
      grid.append(card);
    }
    $('saved-game-hint').hidden = !data.hintUsed;
    $('saved-game-hint').textContent = data.hintUsedAtGuess == null ? 'Hint used' : `Hint used after guess ${data.hintUsedAtGuess}`;
    $('saved-game-analysis').hidden = false;
    $('saved-game-analysis').href = '/analysis?date=' + date;
    $('saved-game-content').hidden = false;
  }
  async function load(force = false) {
    force = force === true;
    const id = ++requestId;
    const token = localStorage.getItem('elementle_token');
    window.ElementleGameResult.close();
    $('saved-game-content').hidden = true;
    $('saved-game-guesses').replaceChildren();
    $('saved-game-recovery').hidden = true;
    $('saved-game-signin').hidden = true;
    $('saved-game-status').textContent = 'Loading your saved game…';
    if (!/^\d{8}$/.test(date)) {$('saved-game-status').textContent = 'Choose a completed game from your streak calendar.';return;}
    $('saved-game-date').textContent = new Date(+date.slice(0,4),+date.slice(4,6)-1,+date.slice(6,8)).toLocaleDateString(undefined,{month:'long',day:'numeric',year:'numeric'});
    if (!token) {
      $('saved-game-status').textContent = 'Sign in to view your saved game.';
      $('saved-game-recovery').hidden = false; $('saved-game-signin').hidden = false; $('saved-game-retry').hidden = true; return;
    }
    $('saved-game-retry').hidden = false;
    try {
      const data = await requestGame(token, force);
      if (id !== requestId || token !== localStorage.getItem('elementle_token')) return;
      renderGame(data); $('saved-game-status').textContent = '';
    } catch (error) {
      if (id !== requestId || token !== localStorage.getItem('elementle_token')) return;
      $('saved-game-status').textContent = error.message; $('saved-game-recovery').hidden = false;
      $('saved-game-signin').hidden = !/Sign in/.test(error.message);
    }
  }
  $('saved-game-retry').addEventListener('click', () => load(true));
  window.addEventListener('elementle:auth-change', () => load(true));
  window.addEventListener('pageshow', event => {if(event.persisted) load();});
  load();
})();

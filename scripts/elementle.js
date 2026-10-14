const playParams = new URLSearchParams(location.search);
const playMode = playParams.get('mode') === 'freeplay' ? 'freeplay' : playParams.get('mode') === 'archive' ? 'archive' : 'daily';
const practice = playMode !== 'daily';
const playDate = playParams.get('date');
let practiceGame = null;
let practiceLoadPromise = null;
let dailyReadOnly = false;
let dailyLockReason = null;
let loadedDailyDate = 0;
let dailyReloadPending = false;
let dailyMidnightTimer = null;
let dailyDateInterval = null;
let guestId = localStorage.getItem('elementle_guest_id');
if (!guestId) { guestId = crypto.randomUUID(); localStorage.setItem('elementle_guest_id', guestId); }
const practicePrefix = `elementle_${playMode}_${playDate || 'session'}_${localStorage.getItem('elementle_token') || guestId}_`;
const gameStorage = practice ? {
  getItem: key => localStorage.getItem(key === 'elementle_token' ? key : practicePrefix + key),
  setItem: (key, value) => localStorage.setItem(practicePrefix + key, value)
} : localStorage;
async function practiceRequest(path, body) {
  const token = getAuthToken();
  const early = window.ElementlePracticeBootstrap;
  const reuse = path === 'start' && early && !early.consumed && early.token === token && JSON.stringify(early.body) === JSON.stringify(body);
  if (reuse) early.consumed = true;
  const res = await (reuse ? early.promise : fetch('/api/practice/' + path, {
    method: body ? 'POST' : 'GET',
    signal: typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(12000) : undefined,
    headers: { 'Content-Type': 'application/json', 'X-Guest-ID': guestId, ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {})
  }));
  const data = await res.json();
  window.ElementleLab?.checkResponse?.(res);
  if (!res.ok) throw new Error(data.error || 'Unable to load lab');
  return data;
}
let pendingPracticeGuesses = [];
let practiceSyncing = false;
let practiceSyncPromise = null;
let practiceSyncFailed = false;
function updateModeUI() {
  document.body.dataset.mode = playMode;
  const badge = document.querySelector('.mode-badge');
  badge.hidden = !practice;
  badge.textContent = playMode === 'freeplay' ? '∞ FREEPLAY' : 'LAB ARCHIVES';
  badge.title = 'Practice mode · daily stats stay untouched';
  document.querySelector('.mode-tools').hidden = !practice;
  const label = document.querySelector('.mode-file');
  const date = playDate && new Date(Number(playDate.slice(0,4)), Number(playDate.slice(4,6))-1, Number(playDate.slice(6,8)));
  label.textContent = playMode === 'archive' && date && !isNaN(date) ? 'FILE: ' + date.toLocaleDateString(window.ElementleI18n?.locale, {month:'short',day:'numeric',year:'numeric'}).toUpperCase() : 'EXPERIMENT: ∞';
  document.title = playMode === 'archive' ? 'Lab archives | Elementle' : 'Freeplay | Elementle';
  document.querySelectorAll('.freeplay-nav').forEach(el => { if (playMode === 'freeplay') el.setAttribute('aria-current','page'); });
}
function updatePracticeSyncUI() {
  const button = document.querySelector('.practice-sync');
  button.hidden = !practiceSyncFailed;
  button.textContent = 'Save interrupted · Retry';
  const analysis = document.querySelector('.js-analysis-button');
  if (analysis) analysis.disabled = pendingPracticeGuesses.length > 0 || practiceSyncing || !practiceGame?.completed;
  const next = document.querySelector('#next-experiment');
  if (next) { next.disabled = pendingPracticeGuesses.length > 0; next.textContent = pendingPracticeGuesses.length ? 'Saving experiment…' : 'Next experiment ↻'; }
}
function restoreAnalysisButton() {
  const button = document.querySelector('.js-analysis-button');
  if (!button) return;
  if (practice) { updatePracticeSyncUI(); return; }
  button.disabled = dailyReloadPending || !(numberOfGuesses >= 8 || guessedCorrectly === 'true');
}
function savePracticeQueue() {
  gameStorage.setItem('pendingGuesses', JSON.stringify(pendingPracticeGuesses));
  if (practiceGame) gameStorage.setItem('practiceSnapshot', JSON.stringify(practiceGame));
  if (playMode === 'archive' && practiceGame) {
    const completed = guessedCorrectly === 'true' || Number(numberOfGuesses) >= 8 || practiceGame.completed;
    window.ElementleArchiveProgress.publish(playDate, completed, pendingPracticeGuesses.length > 0);
  }
}
async function flushPracticeQueue() {
  if (practiceSyncPromise) return practiceSyncPromise;
  practiceSyncPromise = syncPracticeQueue();
  try { return await practiceSyncPromise; }
  finally { practiceSyncPromise = null; }
}
async function syncPracticeQueue() {
  if (playMode === 'freeplay') { updatePracticeSyncUI(); return; }
  if (practiceSyncing || !practiceGame) return;
  practiceSyncing = true;
  practiceSyncFailed = false;
  updatePracticeSyncUI();
  try {
    while (pendingPracticeGuesses.length) {
      const entry = pendingPracticeGuesses[0];
      const state = await practiceRequest('guess', { gameId: practiceGame.id, guess: entry.guess, guessNumber: entry.number, localDate: getTodayDateInt(), ...(practiceGame.draft ? { freeplay: { atomicNumber: practiceGame.atomic_number } } : {}) });
      practiceGame = state;
      pendingPracticeGuesses.shift();
      savePracticeQueue();
    }
    // Reconcile after all queued guesses, never replace newer local feedback with an older response.
    applyGameStateFromApi(practiceGame.guesses, practiceGame.guesses.length, practiceGame.won);
  } catch (error) {
    practiceSyncFailed = true;
    createPopup('Your guesses are saved in this browser. Retry to sync with the lab.');
  } finally {
    practiceSyncing = false;
    updatePracticeSyncUI();
  }
}
function restorePracticePreview() {
  try {
    const snapshot = JSON.parse(gameStorage.getItem('practiceSnapshot') || 'null');
    if (!snapshot?.id || snapshot.id !== gameStorage.getItem('sessionId') || !Array.isArray(snapshot.guesses)) return;
    const mystery = getElementFromAtomicNumber(snapshot.atomic_number);
    if (!mystery) return;
    mysteryElementCache = mystery;
    renderFromLocalCache();
  } catch {}
}
async function loadPractice(newRound = false) {
  if (practiceLoadPromise) return practiceLoadPromise;
  practiceLoadPromise = loadPracticeState(newRound);
  try { return await practiceLoadPromise; }
  finally { practiceLoadPromise = null; }
}
async function loadPracticeState(newRound = false) {
  if (playMode === 'archive' && Number(playDate) >= getTodayDateInt()) { location.replace('/'); return; }
  let draft = null;
  if (playMode === 'freeplay') {
    try { draft = JSON.parse(gameStorage.getItem('practiceSnapshot') || 'null'); } catch {}
    if (newRound || !gameStorage.getItem('sessionId')) {
      const previous = practiceGame?.atomic_number || draft?.atomic_number || Number(gameStorage.getItem('lastFreeplayAtomic'));
      const candidates = Array.from({length:118}, (_,i)=>i+1).filter(n=>n!==previous);
      draft = {id:crypto.randomUUID(),atomic_number:candidates[Math.floor(Math.random()*candidates.length)],guesses:[],won:false,completed:false,hint_used:false,hint_used_at_guess:null,draft:true};
      gameStorage.setItem('sessionId', draft.id);
      gameStorage.setItem('lastFreeplayAtomic', String(draft.atomic_number));
      gameStorage.setItem('practiceSnapshot', JSON.stringify(draft));
      gameStorage.setItem('pendingGuesses','[]');
    }
  }
  const localDraft = playMode === 'freeplay' && draft && draft.id === gameStorage.getItem('sessionId') && Number.isInteger(draft.atomic_number) && draft.atomic_number >= 1 && draft.atomic_number <= 118 && Array.isArray(draft.guesses);
  practiceGame = localDraft ? draft : await practiceRequest('start', { mode: playMode, date: playDate, localDate: getTodayDateInt(), gameId: playMode === 'freeplay' && !newRound ? gameStorage.getItem('sessionId') : null });
  gameStorage.setItem('sessionId', practiceGame.id);
  gameStorage.setItem('hintUsed:' + practiceGame.id, String(practiceGame.hint_used));
  mysteryElementCache = getElementFromAtomicNumber(practiceGame.atomic_number);
  pendingPracticeGuesses = newRound ? [] : JSON.parse(gameStorage.getItem('pendingGuesses') || '[]');
  // A reply may have been lost after commit. Keep only guesses not yet acknowledged.
  pendingPracticeGuesses = pendingPracticeGuesses.filter(entry => practiceGame.guesses[entry.number - 1] !== entry.guess);
  if (practiceGame.completed) pendingPracticeGuesses = [];
  if (playMode !== 'freeplay') savePracticeQueue();
  const merged = [...practiceGame.guesses];
  for (const entry of pendingPracticeGuesses) { if (entry.number === merged.length + 1) merged.push(entry.guess); }
  applyGameStateFromApi(merged, merged.length, merged.at(-1) === practiceGame.atomic_number);
  if (playMode === 'freeplay') {
    practiceGame = {...practiceGame, guesses:merged, won:merged.at(-1)===practiceGame.atomic_number, completed:merged.length>=8 || merged.at(-1)===practiceGame.atomic_number, localOnly:true};
    pendingPracticeGuesses = [];
  }
  savePracticeQueue();
  gameStorage.setItem('fadeInAppliedList', '[]');
  renderFromLocalCache();
  updateModeUI();
  if (numberOfGuesses >= 8 || guessedCorrectly === 'true') displayResults();
  if (pendingPracticeGuesses.length) flushPracticeQueue();
}
document.querySelector('.practice-sync').addEventListener('click', flushPracticeQueue);
window.addEventListener('online', () => { if (practice) flushPracticeQueue(); });
const options = { 
  year: 'numeric', 
  month: '2-digit', 
  day: '2-digit', 
  hour: '2-digit', 
  minute: '2-digit', 
  second: '2-digit', 
  hour12: false 
};

// Frontend talks only to our Node proxy; secrets live in process.env on the server.
const API_BASE = '/api';

(function idleNFlicker() {
  var el = document.querySelector('.green-letter');
  if (!el) return;
  var classes = ['n-flicker-1', 'n-flicker-2', 'n-flicker-3'];
  function scheduleFlicker() {
    var delay = 4000 + Math.random() * 10000;
    setTimeout(function () {
      if (el.closest('.nav-text:hover')) return scheduleFlicker();
      var cls = classes[Math.floor(Math.random() * classes.length)];
      classes.forEach(function (c) { el.classList.remove(c); });
      void el.offsetWidth;
      el.classList.add(cls);
      el.addEventListener('animationend', function () {
        el.classList.remove(cls);
      }, { once: true });
      scheduleFlicker();
    }, delay);
  }
  scheduleFlicker();
})();
const AUTH_TOKEN_KEY = 'elementle_token';
const MYSTERY_ELEMENT_STORAGE_KEY = 'elementle_mystery_element';

function getAuthToken() {
  return gameStorage.getItem(AUTH_TOKEN_KEY) || '';
}

function closeMobileNavMenu() {
  const dropdown = document.querySelector('.js-nav-dropdown');
  const toggle = document.querySelector('.js-nav-menu-toggle');
  if (!dropdown || !toggle) return;
  if (dropdown.hidden || dropdown.classList.contains('nav-dropdown-closing')) return;
  dropdown.classList.add('nav-dropdown-closing');
  dropdown.addEventListener('animationend', function onCloseEnd() {
    dropdown.removeEventListener('animationend', onCloseEnd);
    dropdown.classList.remove('nav-dropdown-closing');
    dropdown.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
  }, { once: true });
}
window.closeMobileNavMenu = closeMobileNavMenu;

let mysteryElementCache = null;

function getTodayDateInt() {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

function getHintIndexForToday() {
  const seed = String(getTodayDateInt());
  const rng = (typeof Math.seedrandom === 'function') ? new Math.seedrandom(seed) : null;
  const value = rng ? rng() : Math.random();
  return Math.floor(value * 3) % 3;
}

async function fetchMysteryElementForDate(dateInt) {
  const early = window.ElementleDailyBootstrap;
  if (early && early.date === dateInt && !early.token) {
    const data = await early.promise;
    return data ? getElementFromAtomicNumber(data.atomic_number) : null;
  }
  const res = await fetch(`${API_BASE}/mystery_element/${dateInt}`);
  if (!res.ok) return null;
  const data = await res.json();
  return getElementFromAtomicNumber(data.atomic_number);
}

function getElementFromAtomicNumber(atomicNumber) {
  const parsedAtomicNumber = atomicNumber != null ? parseInt(atomicNumber, 10) : null;
  if (parsedAtomicNumber == null || Number.isNaN(parsedAtomicNumber)) return null;
  return elements.find((e) => e.atomicNumber === parsedAtomicNumber) || null;
}

function getCachedMysteryElement(dateInt) {
  try {
    const cached = JSON.parse(gameStorage.getItem(MYSTERY_ELEMENT_STORAGE_KEY) || 'null');
    if (!cached || String(cached.date) !== String(dateInt)) return null;
    return getElementFromAtomicNumber(cached.atomicNumber);
  } catch {
    return null;
  }
}

function cacheMysteryElement(dateInt, element) {
  if (!element) return;
  gameStorage.setItem(MYSTERY_ELEMENT_STORAGE_KEY, JSON.stringify({
    date: String(dateInt),
    atomicNumber: element.atomicNumber
  }));
}

const defaultUsedElements = JSON.parse(gameStorage.getItem('defaultUsedElements')) || []; // Load defaultUsedElements from localStorage


const inputElement = document.querySelector('.js-guess-input');
inputElement.addEventListener('input', onInputChange);

const clearBtn = document.querySelector('.js-input-clear');
function updateClearBtn() {
  clearBtn.classList.toggle('visible', inputElement.value.length > 0);
}
inputElement.addEventListener('input', updateClearBtn);
inputElement.addEventListener('focus', updateClearBtn);
inputElement.addEventListener('blur', () => setTimeout(() => clearBtn.classList.remove('visible'), 150));
clearBtn.addEventListener('click', () => {
  inputElement.value = '';
  removeAutocompleteDropdown();
  clearBtn.classList.remove('visible');
  inputElement.focus();
});

const guessButtonElement = document.querySelector('.js-guess-button');
guessButtonElement.addEventListener('click', (event) => {
  event.preventDefault();
  processGuess();
});

const shareButtonElement = document.querySelector('.js-share-button');

(function initAnimatedPlaceholder() {
  const sampleNames = ['Oxygen', 'Gold', 'Neon', 'Iron', 'Helium', 'Carbon', 'Silver', 'Zinc', 'Radon', 'Copper'];
  let wordIdx = 0, charIdx = 0, deleting = false, timeout;
  const typeSpeed = 100, deleteSpeed = 50, pauseBefore = 1600, pauseAfter = 800;

  var cursorVisible = true, blinkInterval;

  function startBlink() {
    clearInterval(blinkInterval);
    cursorVisible = true;
    blinkInterval = setInterval(function () { cursorVisible = !cursorVisible; updatePlaceholder(); }, 530);
  }

  function stopBlink() {
    clearInterval(blinkInterval);
    cursorVisible = true;
  }

  function updatePlaceholder() {
    var word = window.ElementleI18n ? window.ElementleI18n.t(sampleNames[wordIdx]) : sampleNames[wordIdx];
    var text = word.slice(0, charIdx);
    inputElement.setAttribute('placeholder', text + (cursorVisible ? '|' : '\u00A0'));
  }

  function tick() {
    if (inputElement.disabled || document.activeElement === inputElement || inputElement.value) {
      stopBlink();
      inputElement.setAttribute('placeholder', 'Element');
      return;
    }
    var word = window.ElementleI18n ? window.ElementleI18n.t(sampleNames[wordIdx]) : sampleNames[wordIdx];
    if (!deleting) {
      charIdx++;
      stopBlink();
      cursorVisible = true;
      updatePlaceholder();
      if (charIdx === word.length) {
        deleting = true;
        startBlink();
        timeout = setTimeout(function () { stopBlink(); tick(); }, pauseBefore);
        return;
      }
      timeout = setTimeout(tick, typeSpeed);
    } else {
      charIdx--;
      cursorVisible = true;
      updatePlaceholder();
      if (charIdx === 0) {
        deleting = false;
        wordIdx = (wordIdx + 1) % sampleNames.length;
        startBlink();
        timeout = setTimeout(function () { stopBlink(); tick(); }, pauseAfter);
        return;
      }
      timeout = setTimeout(tick, deleteSpeed);
    }
  }

  function startIfIdle() {
    clearTimeout(timeout);
    stopBlink();
    if (!inputElement.disabled && !inputElement.value && document.activeElement !== inputElement) {
      tick();
    } else {
      inputElement.setAttribute('placeholder', 'Element');
    }
  }

  inputElement.addEventListener('focus', () => {
    clearTimeout(timeout);
    stopBlink();
    inputElement.setAttribute('placeholder', 'Element');
  });
  inputElement.addEventListener('blur', () => setTimeout(startIfIdle, 300));

  setTimeout(tick, 1200);
})();

document.body.addEventListener('click', () => {
  removeAutocompleteDropdown();
});

document.body.addEventListener('keydown', (event) => {
  if (event.key === 'Enter'){
    if (event.target.closest('button, a, textarea, [contenteditable="true"]')) return;
      if (document.querySelector('.autocomplete-list')) {
        return;
      }
      processGuess();
  }
});

const savedGuessesList = gameStorage.getItem('guessesList');
const guessesList = savedGuessesList ? JSON.parse(savedGuessesList) : [];

let numberOfGuesses = gameStorage.getItem('numberOfGuesses'); // Update local storage with new numberOfGuesses
if (numberOfGuesses === null) {
  numberOfGuesses = '0';
}

let guessedCorrectly = gameStorage.getItem('guessedCorrectly');
if (guessedCorrectly === null) {
  guessedCorrectly = 'false';
}

// Get the hint button and hint container elements
const hintButton = document.querySelector('.js-hint-button');
const hintContainer = document.querySelector('.js-hint-container');

let cancelHintConfirmation = null;

function confirmHintInGame() {
  return new Promise(resolve => {
    hintContainer.innerHTML = `
      <div class="hint-confirmation">
        <strong>Reveal a hint?</strong>
        <p>Today’s game will be marked as played with a hint.</p>
        <div class="hint-confirmation-actions">
          <button type="button" class="hint-cancel">Keep solving</button>
          <button type="button" class="hint-reveal">Reveal hint</button>
        </div>
      </div>`;
    hintContainer.setAttribute('role', 'group');
    hintContainer.setAttribute('aria-label', 'Confirm hint use');
    hintContainer.setAttribute('aria-hidden', 'false');
    hintButton.setAttribute('aria-expanded', 'true');
    hintContainer.classList.add('hint-visible');
    const cancel = hintContainer.querySelector('.hint-cancel');
    const reveal = hintContainer.querySelector('.hint-reveal');
    function finish(accepted) {
      cancelHintConfirmation = null;
      hintContainer.removeEventListener('keydown', onKey);
      hintContainer.setAttribute('role', 'status');
      hintContainer.removeAttribute('aria-label');
      hintContainer.textContent = accepted ? 'Revealing your hint…' : '';
      if (!accepted) {
        hintContainer.classList.remove('hint-visible');
        hintContainer.setAttribute('aria-hidden', 'true');
        hintButton.setAttribute('aria-expanded', 'false');
      }
      hintButton.focus({ preventScroll: true });
      resolve(accepted);
    }
    function onKey(event) {
      // Confirmation buttons must not trigger the game's Enter-to-guess shortcut.
      event.stopPropagation();
      if (event.key === 'Escape') {
        event.preventDefault();
        finish(false);
      }
    }
    cancelHintConfirmation = () => finish(false);
    cancel.addEventListener('click', () => finish(false), { once: true });
    reveal.addEventListener('click', () => finish(true), { once: true });
    hintContainer.addEventListener('keydown', onKey);
    cancel.focus({ preventScroll: true });
  });
}

// Add click event listener to the hint button
hintButton.addEventListener('click', async (event) => {
  event.preventDefault();
  if (checkDailyDateLock()) return;
  const completed = numberOfGuesses >= 8 || guessedCorrectly === 'true';
  if ((dailyReadOnly && !completed) || hintButton.disabled) return;
  const mystery = getMysteryElement();
  if (!mystery || !mystery.hints) return;

  if (cancelHintConfirmation) {
    cancelHintConfirmation();
    return;
  }
  if (hintContainer.classList.contains('hint-visible')) {
    hintContainer.classList.remove('hint-visible');
    hintContainer.setAttribute('aria-hidden', 'true');
    hintButton.setAttribute('aria-expanded', 'false');
    return;
  }

  const hintKey = 'hintUsed:' + (practice ? practiceGame.id : getTodayDateInt());
  if (!completed && gameStorage.getItem(hintKey) !== 'true') {
    if (!practice && !await confirmHintInGame()) return;
    hintButton.disabled = true;
    hintButton.classList.add('hint-loading');
    hintButton.setAttribute('aria-busy', 'true');
    try {
      const pending = _pendingGuessPromise || _gameStateSyncPromise;
      if (pending) await pending;
      if (checkDailyDateLock()) return;
      // Completion can arrive while the confirmation or last guess is pending.
      if (numberOfGuesses >= 8 || guessedCorrectly === 'true') {
        revealHintText(mystery);
        return;
      }
      if (dailyReadOnly) return;
      const token = getAuthToken();
      if (playMode === 'freeplay') {
        practiceGame.hint_used = true;
        practiceGame.hint_used_at_guess = Number(numberOfGuesses) || 0;
      } else if (practice) {
        if (pendingPracticeGuesses.length || practiceSyncPromise) await flushPracticeQueue();
        if (pendingPracticeGuesses.length) throw new Error('Save your guesses before using a hint');
        practiceGame = await practiceRequest('hint', { gameId: practiceGame.id, localDate: getTodayDateInt(), ...(practiceGame.draft ? { freeplay: { atomicNumber: practiceGame.atomic_number } } : {}) });
      } else if (token) {
        const res = await fetch(API_BASE + '/game/hint', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
          body: JSON.stringify({ localDate: getTodayDateInt() })
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({error:'Could not save hint use. Please try again.'}));
          if (data.readOnly || data.frozen) setDailyReadOnly(true, data.lockReason);
          throw new Error(data.error || 'Hint could not be saved');
        }
      }
      if (practice) savePracticeQueue();
      gameStorage.setItem(hintKey, 'true');
      gameStorage.setItem('hintUsedAtGuess:' + getTodayDateInt(), String(numberOfGuesses || 0));
    } catch (error) {
      hintContainer.classList.remove('hint-visible');
      hintContainer.setAttribute('aria-hidden', 'true');
      hintButton.setAttribute('aria-expanded', 'false');
      createPopup(error.message || 'Could not save hint use. Please try again.');
      return;
    } finally {
      hintButton.classList.remove('hint-loading');
      hintButton.setAttribute('aria-busy', 'false');
      hintButton.disabled = dailyReloadPending || (dailyReadOnly && numberOfGuesses < 8 && guessedCorrectly !== 'true');
    }
  }
  if (dailyReadOnly && numberOfGuesses < 8 && guessedCorrectly !== 'true') return;
  if (!practice && !getAuthToken() && numberOfGuesses > 0 && guessedCorrectly !== 'true' && numberOfGuesses < 8) recordVaultDaily();
  revealHintText(mystery);
});

function revealHintText(mystery) {
  const idx = getHintIndexForToday();
  hintContainer.textContent = mystery.hints[idx];
  hintContainer.setAttribute('aria-hidden', 'false');
  hintButton.setAttribute('aria-expanded', 'true');
  requestAnimationFrame(() => hintContainer.classList.add('hint-visible'));
}

// Let the latest signed-in guess finish syncing before leaving the game.
document.querySelectorAll('a[href="/stats"], a[href="/account"], a[href="/how-to-play"]').forEach((link) => {
  link.addEventListener('click', async (event) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const pending = _pendingGuessPromise || _gameStateSyncPromise;
    if (!pending) return;
    event.preventDefault();
    try { await pending; } finally { window.location.assign(link.href); }
  });
});

var _initialRenderDone = false;

function renderShimmerGrid() {
  const elementGrid = document.querySelector('.element-grid');
  if (elementGrid.querySelector('.element.shimmer')) return;
  elementGrid.innerHTML = '';
  for (let i = 0; i < 8; i++) {
    const div = document.createElement('div');
    div.classList.add('element', 'shimmer');
    const slotNum = document.createElement('span');
    slotNum.classList.add('element-slot-number');
    slotNum.textContent = i + 1;
    div.appendChild(slotNum);
    elementGrid.appendChild(div);
  }
}

function renderGuess(options) {
  const animate = options && options.animate;
  const stagger = options && options.stagger;
  const mystery = getMysteryElement();
  if (!mystery) return;

  const guessedList = JSON.parse(gameStorage.getItem('guessesList'));
  const elementGrid = document.querySelector('.element-grid');
  elementGrid.innerHTML = '';

  const fadeInAppliedList = JSON.parse(gameStorage.getItem('fadeInAppliedList')) || [];
  const guessCount = (guessedList && guessedList.length) || 0;
  const lastGuess = guessCount > 0 ? guessedList[guessCount - 1] : null;
  const lastGuessCorrect = lastGuess && lastGuess.atomicNumber === mystery.atomicNumber;
  const gameOver = guessedCorrectly === 'true' || lastGuessCorrect || guessCount >= 8;
  let nextSlotMarked = false;

  for (let i = 0; i < 8; i++) {
    const elementDiv = document.createElement('div');
    elementDiv.classList.add('element');

    if (guessedList && guessedList.length > 0 && guessedList[i]) {
      elementDiv.classList.add('guessed-element');
      const guessedElement = getElementFromAtomicNumber(guessedList[i].atomicNumber) || guessedList[i];
      const atomicSignal = (guessedElement.atomicNumber === mystery.atomicNumber) ? '&#127881;' : (guessedElement.atomicNumber < mystery.atomicNumber) ? '⬆️' : '⬇️';
      const familyClass = (guessedElement.family === mystery.family) ? 'green' : 'family';

      const isNew = !fadeInAppliedList[i] && animate;
      const applyFadeIn = isNew ? 'fade-in-text' : '';
      if (isNew) {
        elementDiv.classList.add('card-flip');
        if (stagger) elementDiv.style.animationDelay = (i * 0.08) + 's';
      }

      const atomicNumberSpan = document.createElement('span');
      atomicNumberSpan.classList.add('atomic-number');
      const signalSpan = `<span class="atomic-signal">${atomicSignal}</span>`;
      if (isNew && !practice) {
        atomicNumberSpan.innerHTML = `0 ${signalSpan}`;
        const target = guessedElement.atomicNumber;
        const duration = 1000;
        const startDelay = stagger ? 400 + (i * 80) : 400;
        setTimeout(() => {
          const startTime = performance.now();
          const tick = (now) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = Math.round(eased * target);
            atomicNumberSpan.innerHTML = `${current} ${signalSpan}`;
            if (progress < 1) {
              requestAnimationFrame(tick);
            } else {
              const sig = atomicNumberSpan.querySelector('.atomic-signal');
              if (sig) sig.classList.add('signal-bounce');
            }
          };
          requestAnimationFrame(tick);
        }, startDelay);
      } else {
        atomicNumberSpan.innerHTML = guessedElement.atomicNumber + ` ${signalSpan}`;
      }
      if (applyFadeIn) atomicNumberSpan.classList.add(applyFadeIn);
      elementDiv.appendChild(atomicNumberSpan);

      const symbolSpan = document.createElement('span');
      symbolSpan.classList.add('symbol');
      const letters = guessedElement.symbol.split('');
      const letterSpans = letters.map(letter => {
        const span = document.createElement('span');
        span.textContent = letter;
        return span;
      });
      letterSpans.forEach((span, index) => {
        const guessedLetter = guessedElement.symbol.toLowerCase().charAt(index);
        const mysteryLetter = mystery.symbol.toLowerCase().charAt(index);
        if (guessedLetter === mysteryLetter) {
          span.style.color = 'rgb(83, 141, 78)';
        } else if (mystery.symbol.toLowerCase().includes(guessedLetter)) {
          span.style.color = 'rgb(181, 159, 59)';
        }
      });
      letterSpans.forEach(span => symbolSpan.appendChild(span));
      if (applyFadeIn) symbolSpan.classList.add(applyFadeIn);
      elementDiv.appendChild(symbolSpan);

      const nameSpan = document.createElement('span');
      nameSpan.classList.add('name');
      nameSpan.textContent = guessedElement.name;
      if (guessedElement.atomicNumber === mystery.atomicNumber) {
        nameSpan.classList.add('green');
        atomicNumberSpan.classList.add('green');
        elementDiv.classList.add('correct-card');
      }
      if (applyFadeIn) nameSpan.classList.add(applyFadeIn);
      elementDiv.appendChild(nameSpan);

      const familySpan = document.createElement('span');
      familySpan.classList.add('family');
      familySpan.textContent = guessedElement.family;
      familySpan.classList.add(familyClass);
      if (isNew && familyClass === 'green') familySpan.classList.add('family-flash');
      if (applyFadeIn) familySpan.classList.add(applyFadeIn);
      elementDiv.appendChild(familySpan);

      if (!_initialRenderDone) elementDiv.classList.add('shimmer-done');
      fadeInAppliedList[i] = true;
    } else {
      const slotNum = document.createElement('span');
      slotNum.classList.add('element-slot-number');
      slotNum.textContent = i + 1;
      elementDiv.appendChild(slotNum);
      if (!nextSlotMarked && !gameOver) {
        elementDiv.classList.add('next-slot');
        nextSlotMarked = true;
      }
    }

    elementGrid.appendChild(elementDiv);
  }

  _initialRenderDone = true;
  gameStorage.setItem('fadeInAppliedList', JSON.stringify(fadeInAppliedList));
}


function trackGuessDistribution(guessCount) {
  let distributionData = JSON.parse(gameStorage.getItem('guessDistribution') || JSON.stringify({
    1: 0, 2: 0, 3: 0, 4: 0, 
    5: 0, 6: 0, 7: 0, 8: 0, 
    'X': 0
  }));
  
  if (guessCount === 0) {
    distributionData['X']++;
  } else {
    distributionData[guessCount]++;
  }

  gameStorage.setItem('guessDistribution', JSON.stringify(distributionData));
}


function submitGuestMainResult() {
  if (practice || getAuthToken()) return;
  const date = String(getTodayDateInt());
  window.ElementleGuestResults?.record(guestId, {
    mode: 'daily', localDate: date,
    guesses: guessesList.map(element => element.atomicNumber),
    hintUsed: gameStorage.getItem('hintUsed:' + date) === 'true',
    hintAt: Number(gameStorage.getItem('hintUsedAtGuess:' + date) || 0)
  });
}

let _guessInFlight = false;
let _pendingGuessPromise = null;
let _gameStateSyncPromise = null;

async function processGuess() {
  if (checkDailyDateLock()) return;
  if (dailyReadOnly || _guessInFlight || inputElement.disabled || (practice && hintButton.disabled) || !getMysteryElement() || numberOfGuesses >= 8 || guessedCorrectly === 'true') return;

  const inputValue = inputElement.value.trim();
  const guessedElement = elements.find(element => window.ElementleI18n ? window.ElementleI18n.matchesElement(element, inputValue) : element.name.toLowerCase() === inputValue.toLowerCase());

  if (!guessedElement && inputValue !== '') {
    invalidGuess();
    inputElement.focus();
    return;
  }

  if (inputValue === '') {
    inputElement.focus();
    return;
  }

  inputElement.value = '';

  const alreadyGuessed = guessesList.some(guess => guess.atomicNumber === guessedElement.atomicNumber);
  if (alreadyGuessed) {
    alreadyGuessedPopup();
    inputElement.focus();
    return;
  }

  _guessInFlight = true;

  if (practice) {
    const nextGuesses = [...guessesList.map(el => el.atomicNumber), guessedElement.atomicNumber];
    const won = guessedElement.atomicNumber === practiceGame.atomic_number;
    applyGameStateFromApi(nextGuesses, nextGuesses.length, won);
    if (playMode === 'freeplay') practiceGame = {...practiceGame, guesses:nextGuesses, won, completed:won || nextGuesses.length>=8, localOnly:true, draft:false};
    else pendingPracticeGuesses.push({ guess: guessedElement.atomicNumber, number: nextGuesses.length });
    savePracticeQueue();
    removeAutocompleteDropdown();
    renderGuess({ animate: true });
    if (won || nextGuesses.length >= 8) {
      displayResults();
      showGameResult(won, nextGuesses.length);
      if (won && typeof confetti === 'function') confetti({ particleCount: 80, spread: 100 });
    }
    _guessInFlight = false;
    updatePracticeSyncUI();
    flushPracticeQueue();
    inputElement.focus();
    return;
  }

  guessesList.push({
    name: guessedElement.name,
    atomicNumber: guessedElement.atomicNumber,
    family: guessedElement.family,
    hint: (guessedElement.hints && guessedElement.hints[0]) || '',
    symbol: guessedElement.symbol
  });
  numberOfGuesses = +numberOfGuesses + 1;
  gameStorage.setItem('guessesList', JSON.stringify(guessesList));
  gameStorage.setItem('numberOfGuesses', numberOfGuesses);
  removeAutocompleteDropdown();
  renderGuess({ animate: true });

  if (window.innerWidth < 768) {
    var grid = document.querySelector('.element-grid');
    var latestCard = grid && grid.children[numberOfGuesses - 1];
    if (latestCard) latestCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  const isCorrect = guessedElement.atomicNumber === getMysteryElement().atomicNumber;
  const isGameOver = numberOfGuesses >= 8;

  recordVaultDaily(isCorrect);

  // Invalidate Stats page snapshots when this browser submits a new guess.
  gameStorage.setItem('elementle_stats_revision', String(Date.now()));

  const token = getAuthToken();

  if (token) {
    _pendingGuessPromise = fetch(API_BASE + '/game/guess', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({ localDate: getTodayDateInt(), guess: guessedElement.atomicNumber })
    })
      .then(async function (res) {
        const data = await res.json();
        if (!res.ok) {
          if (data.readOnly || data.frozen) setDailyReadOnly(true, data.lockReason);
          throw new Error(data.error || 'Could not save your game');
        }
        if (token === getAuthToken()) { window.ElementleFreezes?.consume(data); window.ElementleLab?.consumeGame?.(data); }
        localStorage.setItem('elementle_stats_revision', String(Date.now()));
        window.dispatchEvent(new Event('elementle:game-complete'));
        return data;
      })
      .catch(function (e) { console.warn('Game guess sync failed', e); createPopup('Could not sync your game. Reopen the game to check your saved result.'); })
      .finally(function () {
        _guessInFlight = false;
        _pendingGuessPromise = null;
      });

    if (isCorrect) {
      gameStorage.setItem('guessedCorrectly', 'true');
      guessedCorrectly = 'true';
      confetti({ particleCount: 150, spread: 200 });
      showGameResult(true, numberOfGuesses);
      displayResults();
    } else if (isGameOver) {
      gameStorage.setItem('guessedCorrectly', 'false');
      guessedCorrectly = 'false';
      showGameResult(false, numberOfGuesses);
      displayResults();
    } else {
      _guessInFlight = false;
    }
    inputElement.focus();
    return;
  }

  _guessInFlight = false;

  if (isCorrect) {
    trackGuessDistribution(numberOfGuesses);
    gameStorage.setItem('totalGames', +gameStorage.getItem('totalGames') + 1);
    gameStorage.setItem('totalWins', +gameStorage.getItem('totalWins') + 1);
    gameStorage.setItem('currentStreak', +gameStorage.getItem('currentStreak') + 1);
    gameStorage.setItem('maxWinStreak', (Number(gameStorage.getItem("currentStreak")) > Number(gameStorage.getItem("maxWinStreak"))) ? gameStorage.getItem("currentStreak"): gameStorage.getItem("maxWinStreak"));
    gameStorage.setItem('guessedCorrectly', 'true');
    guessedCorrectly = 'true';
    confetti({ particleCount: 150, spread: 200 });
    showGameResult(true, numberOfGuesses);
    displayResults();
    submitGuestMainResult();
  } else if (isGameOver) {
    trackGuessDistribution(0);
    gameStorage.setItem('totalGames', +gameStorage.getItem('totalGames') + 1);
    gameStorage.setItem('currentStreak', 0);
    gameStorage.setItem('guessedCorrectly', 'false');
    guessedCorrectly = 'false';
    displayResults();
    showGameResult(false, numberOfGuesses);
    submitGuestMainResult();
  } else {
    gameStorage.setItem('guessedCorrectly', 'false');
    guessedCorrectly = 'false';
  }
  inputElement.focus();
}

function invalidGuess() {
  createPopup('Please enter a valid element.');
  shakeInputBar();
}

function shakeInputBar() {
  inputElement.classList.remove('shake', 'glow-red');
  void inputElement.offsetWidth;
  inputElement.classList.add('shake', 'glow-red');
  setTimeout(() => {
    inputElement.classList.remove('shake', 'glow-red');
  }, 650);
}

function alreadyGuessedPopup() {
  createPopup('You have already guessed this element.');
  shakeInputBar();
}


function onInputChange() {
  const value = inputElement.value.toLowerCase();

  if (value.length === 0) {
    removeAutocompleteDropdown();
    return;
  }

  const filtered = window.ElementleI18n ? window.ElementleI18n.searchElements(elements, value) : [];
  if (!window.ElementleI18n) elements.forEach((el) => {
    if (el.name.substring(0, value.length).toLowerCase() === value) {
      filtered.push({ name: el.name, symbol: el.symbol });
    }
  });
  filtered.sort((a, b) => a.name.localeCompare(b.name, window.ElementleI18n?.locale));
  updateAutocompleteDropdown(filtered, value.length);
}

let _acIndex = -1;

function updateAutocompleteDropdown(list, matchLen) {
  _acIndex = -1;
  let listElement = document.querySelector('.autocomplete-list');
  const isNew = !listElement;

  if (!list.length) {
    if (listElement) listElement.remove();
    return;
  }

  if (isNew) {
    listElement = document.createElement('ul');
    listElement.className = 'autocomplete-list';
  } else {
    listElement.innerHTML = '';
  }

  list.forEach((el) => {
    const listItem = document.createElement('li');
    const elementButton = document.createElement('button');
    const prefixMatches = (window.ElementleI18n?.normalize(el.name) || el.name.toLowerCase()).startsWith(window.ElementleI18n?.normalize(inputElement.value) || inputElement.value.toLowerCase());
    const matched = prefixMatches ? el.name.substring(0, matchLen) : '';
    const rest = prefixMatches ? el.name.substring(matchLen) : el.name;
    const nameWrapper = document.createElement('span');
    nameWrapper.className = 'ac-name';
    const matchSpan = document.createElement('span');
    matchSpan.className = 'ac-match';
    matchSpan.textContent = matched;
    nameWrapper.append(matchSpan, document.createTextNode(rest));
    elementButton.append(nameWrapper);
    elementButton.setAttribute('data-name', el.name);
    if (window.ElementleI18n) elementButton.setAttribute('translate', 'no');
    elementButton.addEventListener('click', onElementButtonClick);
    listItem.appendChild(elementButton);
    listElement.append(listItem);
  });

  if (isNew) {
    document.querySelector('.js-autocomplete-wrapper').appendChild(listElement);
  }
}

function updateAcHighlight() {
  const btns = document.querySelectorAll('.autocomplete-list button');
  btns.forEach((b, i) => {
    b.classList.toggle('ac-active', i === _acIndex);
    if (i === _acIndex) b.scrollIntoView({ block: 'nearest' });
  });
}

inputElement.addEventListener('keydown', (e) => {
  const listEl = document.querySelector('.autocomplete-list');
  if (!listEl) return;
  const btns = listEl.querySelectorAll('button');
  if (!btns.length) return;

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    _acIndex = (_acIndex + 1) % btns.length;
    updateAcHighlight();
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    _acIndex = (_acIndex - 1 + btns.length) % btns.length;
    updateAcHighlight();
  } else if (e.key === 'Enter' && _acIndex >= 0) {
    e.preventDefault();
    e.stopPropagation();
    inputElement.value = btns[_acIndex].getAttribute('data-name') || '';
    removeAutocompleteDropdown();
    inputElement.focus();
  }
});

function removeAutocompleteDropdown() {
  const listElement = document.querySelector('.autocomplete-list');
  if (listElement) {
    listElement.remove();
  }
}

function onElementButtonClick(event) {
  event.preventDefault();
  const btn = event.target.closest('button');
  if (!btn) return;
  inputElement.value = btn.getAttribute('data-name') || '';
  removeAutocompleteDropdown();
}



function updateLastPlayedDate() {
  const date = new Date();
  gameStorage.setItem('lastPlayedDate', date.toISOString().slice(0,10).replace(/-/g,""));
}

function getLastPlayedDate() {
  return gameStorage.getItem('lastPlayedDate');
}

function resetStreakIfNeeded() {
  const lastPlayedDate = getLastPlayedDate();
  
  if (lastPlayedDate) {
    const today = new Date();
    const dayBeforeYesterday = new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString().slice(0,10).replace(/-/g,"");
  
    if (lastPlayedDate <= dayBeforeYesterday) {
      gameStorage.setItem('currentStreak', 0);
    }
  }
}

function applyGameStateFromApi(apiGuesses, numGuesses, won) {
  guessesList.length = 0;
  (apiGuesses || []).forEach(function (atomicNum) {
    const el = elements.find(function (e) { return e.atomicNumber === atomicNum; });
    if (el) {
      guessesList.push({
        name: el.name,
        atomicNumber: el.atomicNumber,
        family: el.family,
        hint: (el.hints && el.hints[0]) || '',
        symbol: el.symbol
      });
    }
  });
  numberOfGuesses = guessesList.length;
  guessedCorrectly = won ? 'true' : 'false';
  gameStorage.setItem('guessesList', JSON.stringify(guessesList));
  gameStorage.setItem('numberOfGuesses', String(numberOfGuesses));
  gameStorage.setItem('guessedCorrectly', guessedCorrectly);
}

function localGuessesMatchServer(apiGuesses, numGuesses, won) {
  const local = JSON.parse(gameStorage.getItem('guessesList') || '[]');
  const serverAtomic = (apiGuesses || []).map(Number);
  const localAtomic = local.map(function (g) { return g.atomicNumber; });
  if (localAtomic.length !== serverAtomic.length) return false;
  for (var i = 0; i < localAtomic.length; i++) {
    if (localAtomic[i] !== serverAtomic[i]) return false;
  }
  const localWon = gameStorage.getItem('guessedCorrectly') === 'true';
  return localWon === !!won && local.length === (numGuesses || 0);
}

async function fetchGameState(todayInt, token) {
  const res = await fetch(
    API_BASE + '/game/state?localDate=' + encodeURIComponent(todayInt),
    { headers: { Authorization: 'Bearer ' + token } }
  );
  if (!res.ok) return null;
  return res.json();
}

async function fetchGameBootstrap(todayInt, token) {
  const early = window.ElementleDailyBootstrap;
  if (early && early.date === todayInt && early.token === token) return early.promise;
  const res = await fetch(
    API_BASE + '/game/bootstrap?localDate=' + encodeURIComponent(todayInt),
    { headers: { Authorization: 'Bearer ' + token } }
  );
  // Allows a safe rolling deploy: a newly deployed frontend can still work
  // against an origin that has not received the bootstrap route yet.
  if (res.status === 404) return { useLegacyEndpoints: true };
  if (!res.ok) return null;
  return res.json();
}

function renderFromLocalCache() {
  var cachedGuesses = JSON.parse(gameStorage.getItem('guessesList') || '[]');
  if (cachedGuesses && cachedGuesses.length > 0) {
    _initialRenderDone = false;
    gameStorage.setItem('fadeInAppliedList', JSON.stringify([]));
    renderGuess({ animate: playMode !== 'freeplay', stagger: playMode !== 'freeplay' });
  } else {
    renderGuess();
  }
}

function checkDailyDateLock() {
  if (practice) return false;
  if (dailyReloadPending) return true;
  const today = getTodayDateInt();
  if (loadedDailyDate && today !== loadedDailyDate) {
    dailyReloadPending = true;
    inputElement.disabled = true;
    guessButtonElement.disabled = true;
    hintButton.disabled = true;
    if (cancelHintConfirmation) cancelHintConfirmation();
    const pending = [_pendingGuessPromise, _gameStateSyncPromise].filter(Boolean);
    if (!pending.length) window.location.reload();
    else Promise.race([
      Promise.allSettled(pending),
      new Promise(resolve => setTimeout(resolve, 10000))
    ]).then(() => window.location.reload());
    return true;
  }
  return false;
}
window.addEventListener('focus', checkDailyDateLock);
window.addEventListener('pageshow', event => {
  checkDailyDateLock();
  if (event.persisted) restoreAnalysisButton();
});
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) checkDailyDateLock();
});


function setDailyReadOnly(readOnly, reason = 'frozen') {
  dailyReadOnly = !practice && Boolean(readOnly);
  dailyLockReason = dailyReadOnly ? reason : null;
  if (dailyReadOnly) {
    inputElement.disabled = true;
    guessButtonElement.disabled = true;
    hintButton.disabled = dailyReloadPending || !(reason === 'completed' || numberOfGuesses >= 8 || guessedCorrectly === 'true');
    document.querySelector('.autocomplete-list')?.remove();
    if (cancelHintConfirmation) cancelHintConfirmation();
    hintContainer.classList.remove('hint-visible');
    hintContainer.setAttribute('aria-hidden', 'true');
    hintButton.setAttribute('aria-expanded', 'false');
    if (reason !== 'frozen') document.querySelector('.frozen-day-notice')?.remove();
    if (reason === 'frozen' && !document.querySelector('.frozen-day-notice')) {
      const notice = document.createElement('p');
      notice.className = 'frozen-day-notice';
      notice.setAttribute('role', 'status');
      notice.textContent = 'A streak freeze protected this day. Guesses and hints are locked.';
      inputElement.parentElement.insertAdjacentElement('beforebegin', notice);
    }
  } else {
    document.querySelector('.frozen-day-notice')?.remove();
    hintButton.disabled = false;
  }
}

function applyServerGameState(data, options) {
  options = options || {};
  if (!practice) { window.ElementleFreezes?.consume(data); window.ElementleLab?.consumeGame?.(data); }
  if (!practice) {
    gameStorage.setItem('hintUsed:' + getTodayDateInt(), String(Boolean(data.hintUsed)));
    gameStorage.setItem('hintUsedAtGuess:' + getTodayDateInt(), String(data.hintUsedAtGuess ?? 0));
  }
  const apiGuesses = data.guesses || [];
  const numGuesses = data.numGuesses;
  const won = data.won;
  const gameOver = won || numGuesses >= 8;
  const unchanged = !options.forceRender && localGuessesMatchServer(apiGuesses, numGuesses, won);

  applyGameStateFromApi(apiGuesses, numGuesses, won);
  gameStorage.setItem('gameDate', String(getTodayDateInt()));

  if (options.fromLogin) {
    clearEndOfGameUI();
  }
  setDailyReadOnly(data.readOnly || data.frozen || gameOver, data.lockReason || (gameOver ? 'completed' : 'frozen'));

  if (unchanged) {
    if (gameOver) displayResults();
    return;
  }

  const hasGuesses = apiGuesses.length > 0;
  if (hasGuesses) {
    _initialRenderDone = false;
    gameStorage.setItem('fadeInAppliedList', JSON.stringify([]));
    renderGuess({ animate: true, stagger: true });
  } else {
    renderGuess({ animate: true, stagger: false });
  }
  if (gameOver) displayResults();
}

async function setMysteryElementOfTheDay() {
  resetStreakIfNeeded();

  const todayInt = getTodayDateInt();
  const todayStr = String(todayInt);
  const gameDate = gameStorage.getItem('gameDate');

  if (gameDate !== todayStr) {
    numberOfGuesses = 0;
    gameStorage.setItem('guessedCorrectly', 'false');
    gameStorage.setItem('numberOfGuesses', '0');
    gameStorage.setItem('guessesList', JSON.stringify([]));
    gameStorage.setItem('fadeInAppliedList', JSON.stringify([]));
    gameStorage.setItem('gameDate', todayStr);
    guessesList.length = 0;
    guessedCorrectly = 'false';

    document.querySelector('.js-reveal-answer')?.remove();
    document.querySelector('.js-additional-info')?.remove();
    document.querySelector('.js-share-button')?.remove();
    document.querySelector('.js-analysis-button')?.remove();
    document.querySelector('.correct-guess-container').classList.remove('has-game-analysis', 'post-game-ready');
    document.querySelector('.timebox')?.classList.remove('post-game-ready');
  }

  const token = getAuthToken();
  const bootstrapPromise = token
    ? fetchGameBootstrap(todayInt, token).catch(function (e) {
        console.warn('Failed to load game bootstrap from server', e);
        return null;
      })
    : null;
  const mysteryPromise = bootstrapPromise
    ? bootstrapPromise.then(function (data) {
        if (!data) return null;
        return data.useLegacyEndpoints
          ? fetchMysteryElementForDate(todayInt)
          : getElementFromAtomicNumber(data.atomic_number);
      })
    : fetchMysteryElementForDate(todayInt);
  const statePromise = bootstrapPromise
    ? bootstrapPromise.then(function (data) {
        if (!data) return null;
        return data.useLegacyEndpoints ? fetchGameState(todayInt, token) : data.game;
      })
    : null;

  if (statePromise) {
    _gameStateSyncPromise = statePromise;
  }

  const cachedMystery = getCachedMysteryElement(todayInt);
  if (cachedMystery) {
    mysteryElementCache = cachedMystery;
    renderFromLocalCache();
  }

  const fetchedMystery = await mysteryPromise;
  if (fetchedMystery) {
    const mysteryChanged = !mysteryElementCache || mysteryElementCache.atomicNumber !== fetchedMystery.atomicNumber;
    mysteryElementCache = fetchedMystery;
    cacheMysteryElement(todayInt, fetchedMystery);
    if (mysteryChanged) renderFromLocalCache();
  }
  if (!mysteryElementCache) {
    console.error('Could not load mystery element for today');
    if (statePromise) _gameStateSyncPromise = null;
    return;
  }

  if (token && statePromise) {
    try {
      const data = await statePromise;
      if (!data) throw new Error("Could not verify your saved game. Reload to try again.");
      applyServerGameState(data);
    } finally {
      _gameStateSyncPromise = null;
    }
  }
}

function clearEndOfGameUI() {
  var el;
  el = document.querySelector('.js-reveal-answer');
  if (el) el.innerHTML = '';
  el = document.querySelector('.js-additional-info');
  if (el) el.innerHTML = '';
  el = document.querySelector('.js-share-button');
  if (el) el.innerHTML = '';

  if (window._countdownInterval) {
    clearInterval(window._countdownInterval);
    window._countdownInterval = null;
  }
  var timebox = document.querySelector('.timebox');
  if (timebox) timebox.style.display = 'none';

  document.querySelector('.js-analysis-button')?.remove();
  document.querySelector('.correct-guess-container').classList.remove('has-game-analysis', 'post-game-ready');
  timebox?.classList.remove('post-game-ready');
  inputElement.disabled = false;
  guessButtonElement.disabled = false;
}
window.clearEndOfGameUI = clearEndOfGameUI;

async function syncGameStateFromServer() {
  const token = getAuthToken();
  if (practice) { location.reload(); return; }
  if (!token) return;
  inputElement.disabled = true;
  guessButtonElement.disabled = true;
  hintButton.disabled = true;
  renderShimmerGrid();
  const todayInt = getTodayDateInt();
  try {
    const data = await fetchGameState(todayInt, token);
    if (!data) {
      renderGuess();
      return;
    }
    applyServerGameState(data, { forceRender: true, fromLogin: true });
  } catch (e) {
    console.warn('Failed to load game state from server', e);
    renderGuess();
  }
}
window.syncGameStateFromServer = syncGameStateFromServer;

function getMysteryElement() {
  return mysteryElementCache;
}

function displayResults() {
  if (!practice) setDailyReadOnly(true, dailyLockReason === 'past' || dailyLockReason === 'frozen' ? dailyLockReason : 'completed');
  hintButton.disabled = dailyReloadPending;
  hintContainer.classList.remove('hint-visible');
  hintContainer.setAttribute('aria-hidden', 'true');
  hintButton.setAttribute('aria-expanded', 'false');
  if (!practice) window.dispatchEvent(new Event('elementle:game-complete'));
  {
    document.querySelector('.correct-guess-container').classList.add('has-game-analysis');
    if (!document.querySelector('.js-analysis-button')) {
      const button = document.createElement('button');
      button.className = 'share-button js-analysis-button';
      button.innerHTML = '<img class="analysis-button-icon" src="/images/elbot_frames/idle_01.png" width="24" height="24" alt="" aria-hidden="true"><span>Analyze with el<span class="elbot-brand">B</span>ot</span>';
      button.addEventListener('click', async () => {
        button.disabled = true;
        if (playMode === 'freeplay') {
          if (!practiceGame?.completed) { updatePracticeSyncUI(); return; }
          sessionStorage.setItem('elementle_freeplay_analysis', JSON.stringify({owner:getAuthToken(),id:practiceGame.id,freeplay:{atomicNumber:practiceGame.atomic_number,guesses:practiceGame.guesses,hintUsed:!!practiceGame.hint_used,hintAt:practiceGame.hint_used_at_guess}}));
          location.assign('/analysis?mode=freeplay&localGameId=' + encodeURIComponent(practiceGame.id));
          return;
        }
        if (practice) {
          await flushPracticeQueue();
          if (pendingPracticeGuesses.length || !practiceGame?.completed) { updatePracticeSyncUI(); return; }
          location.assign('/analysis?gameId=' + encodeURIComponent(practiceGame.id));
          return;
        }
        const pending = _pendingGuessPromise || _gameStateSyncPromise;
        if (pending) await pending.catch(() => {});
        const date = String(getTodayDateInt());
        sessionStorage.setItem('elementle_analysis', JSON.stringify({
          localDate: date,
          guesses: JSON.parse(gameStorage.getItem('guessesList') || '[]').map(e => e.atomicNumber),
          hintUsed: gameStorage.getItem('hintUsed:' + date) === 'true',
          hintAt: Number(gameStorage.getItem('hintUsedAtGuess:' + date) || 0)
        }));
        location.assign('/analysis?date=' + date);
      });
      document.querySelector('.correct-guess-container').prepend(button);
    }
  }
  let additionalInfoElement = document.querySelector('.js-additional-info');
  let revealAnswerElement = document.querySelector('.js-reveal-answer');

  let correctGuessContainer = document.querySelector('.correct-guess-container');
  let revealAnswerContainer = document.querySelector('.reveal-answer-container');


  // Create the elements if they don't exist
  if (!additionalInfoElement) {
    additionalInfoElement = document.createElement('div');
    additionalInfoElement.className = 'js-additional-info';
    correctGuessContainer.appendChild(additionalInfoElement); // Append to the appropriate container
  }

  if (!revealAnswerElement) {
    revealAnswerElement = document.createElement('div');
    revealAnswerElement.className = 'js-reveal-answer';
    revealAnswerContainer.appendChild(revealAnswerElement); // Append to the appropriate container
  }

  if (!additionalInfoElement.querySelector('a') || additionalInfoElement.querySelector('a').href !== `https://en.wikipedia.org/wiki/${getMysteryElement().name}`) additionalInfoElement.innerHTML = `<a class="additional-info" href="https://en.wikipedia.org/wiki/${getMysteryElement().name}" target="_blank" rel="noopener noreferrer">&#128218; Wikipedia</a>`;
  inputElement.disabled = true;
  guessButtonElement.disabled = true;

  let shareButtonElement = document.querySelector('.js-share-button');

  if (!shareButtonElement) {
    shareButtonElement = document.createElement('div');
    shareButtonElement.className = 'js-share-button';
    correctGuessContainer.appendChild(shareButtonElement); // Append to the appropriate container
  }

  if (shareButtonElement && !shareButtonElement.querySelector('button')) {
    shareButtonElement.innerHTML = `<button class="share-button"><svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="#FFFFFF"><path d="M648-96q-50 0-85-35t-35-85q0-9 4-29L295-390q-16 14-36.05 22-20.04 8-42.95 8-50 0-85-35t-35-85q0-50 35-85t85-35q23 0 43 8t36 22l237-145q-2-7-3-13.81-1-6.81-1-15.19 0-50 35-85t85-35q50 0 85 35t35 85q0 50-35 85t-85 35q-23 0-43-8t-36-22L332-509q2 7 3 13.81 1 6.81 1 15.19 0 8.38-1 15.19-1 6.81-3 13.81l237 145q16-14 36.05-22 20.04-8 42.95-8 50 0 85 35t35 85q0 50-35 85t-85 35Zm0-72q20.4 0 34.2-13.8Q696-195.6 696-216q0-20.4-13.8-34.2Q668.4-264 648-264q-20.4 0-34.2 13.8Q600-236.4 600-216q0 20.4 13.8 34.2Q627.6-168 648-168ZM216-432q20.4 0 34.2-13.8Q264-459.6 264-480q0-20.4-13.8-34.2Q236.4-528 216-528q-20.4 0-34.2 13.8Q168-500.4 168-480q0 20.4 13.8 34.2Q195.6-432 216-432Zm432-264q20.4 0 34.2-13.8Q696-723.6 696-744q0-20.4-13.8-34.2Q668.4-792 648-792q-20.4 0-34.2 13.8Q600-764.4 600-744q0 20.4 13.8 34.2Q627.6-696 648-696Zm0 480ZM216-480Zm432-264Z"/></svg>Share</button>`;
  }

  guessedCorrectly = gameStorage.getItem('guessedCorrectly');

  if (guessedCorrectly === 'false') {
    const m = getMysteryElement();
    // A save response can render results again; keep the reveal's animation once.
    if (!revealAnswerElement.querySelector('.reveal-answer') || revealAnswerElement.dataset.answer !== String(m.atomicNumber)) {
      revealAnswerElement.dataset.answer = String(m.atomicNumber);
      revealAnswerElement.setAttribute('role', 'status');
      revealAnswerElement.setAttribute('aria-live', 'polite');
      revealAnswerElement.innerHTML = `<div class="reveal-answer">
        <div class="reveal-answer-badge" aria-hidden="true">
          <span class="reveal-answer-badge-num">${m.atomicNumber}</span>
          <span class="reveal-answer-badge-symbol">${m.symbol}</span>
        </div>
        <div class="reveal-answer-copy">
          <div class="reveal-answer-eyebrow">${practice ? 'The element was' : 'Today’s element'}</div>
          <div class="reveal-answer-name">${m.name}</div>
          <div class="reveal-answer-label">${m.family}</div>
        </div>
      </div>`;
    }
  }

  if (practice) {
    shareButtonElement.innerHTML = playMode === 'freeplay' ? '<button class="share-button" id="next-experiment">Next random element ↻</button>' : '<a class="additional-info" href="/stats#lab-archives">Back to Lab archives</a>';
    document.querySelector('#next-experiment')?.addEventListener('click', async () => {
      if (pendingPracticeGuesses.length) return;
      const nextButton = document.querySelector('#next-experiment');
      nextButton.disabled = true;
      nextButton.textContent = 'Preparing experiment…';
      inputElement.disabled = true;
      guessButtonElement.disabled = true;
      try {
        await loadPractice(true);
        clearEndOfGameUI();
        inputElement.value = '';
        inputElement.focus();
      } catch (error) { createPopup(error.message); updatePracticeSyncUI(); }
    });
    updatePracticeSyncUI();
    return;
  }

  shareButtonElement.onclick = () => {
    guessedCorrectly = gameStorage.getItem('guessedCorrectly');
    numberOfGuesses = gameStorage.getItem('numberOfGuesses');
    const guessedList = JSON.parse(gameStorage.getItem('guessesList'));
    let shareText = `#Elementle 🧪\n${new Date().toLocaleDateString('en-US', options).slice(0, 10)}\n`;
  
    let line = '';
    guessedList.forEach((guessedElement) => {
      if (guessedElement.atomicNumber < getMysteryElement().atomicNumber){
        line += '⬆️';
      }
      else if (guessedElement.atomicNumber > getMysteryElement().atomicNumber){
        line += '⬇️';
      }
      else{
        line += '🎉';
      }

      const mysterySymbol = getMysteryElement().symbol.toLowerCase();
      const guessedSymbol = guessedElement.symbol.toLowerCase();
    
    // Case when the guessed element has a 2-letter symbol
    if (guessedSymbol.length === 2) {
      for (let i = 0; i < 2; i++) {
        const guessedLetter = guessedSymbol.charAt(i);
        const mysteryLetter = mysterySymbol.charAt(i) || '0';

        if (guessedLetter === mysteryLetter) {
          line += '🟩';
        } else if (mysterySymbol.includes(guessedLetter)) {
          line += '🟨';
        } else {
          line += '⬜';
        }
      }
    }
    // Case when the guessed element has a 1-letter symbol
    else if (guessedSymbol.length === 1) {
      const guessedLetter = guessedSymbol.charAt(0);
      const mysteryLetter = mysterySymbol.charAt(0);

      if (guessedLetter === mysteryLetter) {
        line += '🟩';
      } else if (mysterySymbol.includes(guessedLetter)) {
        line += '🟨';
      } else {
        line += '⬜';
      }

      if (guessedElement.atomicNumber === getMysteryElement().atomicNumber) {
        line += '🟩';
      }
      else {
        line += '⬜';
      }
    }

      // Add the result of this guess to the shareText
      shareText += `${line}\n`;
      line = ''; // Reset line for the next guess
    });
    
  
    if (guessedCorrectly === 'true') {
      shareText += `${numberOfGuesses}/8 (100%)\nhttps://elementlegame.com`;
    } else {
      shareText += `❌/8\nhttps://elementlegame.com`;
    }
  
    navigator.clipboard.writeText(window.ElementleI18n ? window.ElementleI18n.t(shareText) : shareText);
    createPopup('Copied results to clipboard');
  };
  updateLastPlayedDate();
  displayCountdown();
  if (window._countdownInterval) clearInterval(window._countdownInterval);
  window._countdownInterval = setInterval(displayCountdown, 1000);
  correctGuessContainer.classList.add('post-game-ready');
  document.querySelector('.timebox')?.classList.add('post-game-ready');
}


function showGameResult(won, guesses) {
  if (practice) return;
  const title = getGameResultMessage(won, guesses);
  if (!practice && window.ElementleGameResult) {
    const token = getAuthToken();
    const date = getTodayDateInt();
    window.ElementleGameResult.schedule({
      won, guesses, title, localDate: date, guest: !token,
      onAnalysis: () => document.querySelector('.js-analysis-button')?.click()
    }, _pendingGuessPromise, () => token === getAuthToken() && date === getTodayDateInt());
    return;
  }
  const detail = won ? 'Solved in ' + guesses + ' / 8 guesses.' : 'All eight guesses used. A new element awaits tomorrow.';
  if (window.ElementleFreezes) window.ElementleFreezes.notice(title, detail, won ? 'win' : 'loss');
  else createPopup(title);
}

function getGameResultMessage(won, guesses) {
  const winMessages = {
    1: ['Perfect!', 'Incredible!', 'Are you cheating?'],
    2: ['Brilliant!', 'So quick!', 'Impressive!'],
    3: ['Great job!', 'Nicely done!', 'Sharp work!'],
    4: ['Nice work!', 'Good job!', 'You got it!'],
    5: ['Got there!', 'Solved it!', 'Nice one!'],
    6: ['You did it!', 'Kept at it!', 'Good effort!'],
    7: ['Close call!', 'Just in time!', 'One to spare!'],
    8: ['Just made it!', 'Last chance!', 'That was close!']
  };
  const messages = won
    ? (winMessages[guesses] || winMessages[4])
    : ['Good try!', 'Next time!', 'Try again tomorrow!'];
  return messages[Math.floor(Math.random() * messages.length)];
}

function createPopup(text) {
  const popupElement = document.createElement('div');
  popupElement.classList.add('popup');
  popupElement.textContent = text;
  document.body.appendChild(popupElement);
  requestAnimationFrame(() => {
    popupElement.classList.add('popup-visible');
    setTimeout(() => {
      popupElement.classList.remove('popup-visible');
      popupElement.classList.add('popup-exit');
      popupElement.addEventListener('transitionend', () => {
        popupElement.remove();
      }, { once: true });
    }, 2200);
  });
}

function getNextMidnight() {
  const now = new Date();
  const nextMidnight = new Date(now);
  nextMidnight.setHours(24, 0, 0, 0);
  if (now.getTime() > nextMidnight.getTime()) {
    nextMidnight.setDate(now.getDate() + 1);
  }
  return nextMidnight;
}

function displayCountdown() {
  const timebox = document.querySelector('.timebox');
  const hours_container = document.querySelector(".js-hours");
  const minutes_container = document.querySelector(".js-minutes");
  const seconds_container = document.querySelector(".js-seconds");
  const countdown_text_container = document.querySelector(".countdown-text");
  const colon_containers = document.querySelectorAll(".colon-text");

  if (countdown_text_container.textContent !== "Next Elementle in ") countdown_text_container.textContent = "Next Elementle in ";
  colon_containers.forEach(element => {
    if (element.textContent !== ":") element.textContent = ":";
  })

  const target_date = getNextMidnight();
  const current_date = new Date().getTime();
  const distance = target_date - current_date;

  const hours = String(Math.floor(distance / 1000 / 60 / 60)).padStart(2, '0');
  const minutes = String(Math.floor(distance / 1000 / 60) % 60).padStart(2, '0');
  const seconds = String(Math.floor(distance / 1000) % 60).padStart(2, '0');

  // console.log(hours + ":" + minutes + ":" + seconds);

  if (hours_container.textContent !== hours) hours_container.textContent = hours;
  if (minutes_container.textContent !== minutes) minutes_container.textContent = minutes;
  if (seconds_container.textContent !== seconds) seconds_container.textContent = seconds;
  // Reveal only after every digit is ready, so the first frame is complete.
  if (timebox) timebox.style.display = 'flex';

}

(function initMobileNavMenu() {
  const toggle = document.querySelector('.js-nav-menu-toggle');
  const dropdown = document.querySelector('.js-nav-dropdown');
  if (!toggle || !dropdown) return;
  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    if (dropdown.hidden) {
      dropdown.hidden = false;
      toggle.setAttribute('aria-expanded', 'true');
    } else {
      closeMobileNavMenu();
    }
  });
  document.addEventListener('click', () => closeMobileNavMenu());
  dropdown.addEventListener('click', (e) => e.stopPropagation());
})();

function scheduleMidnightReload() {
  if (practice || dailyReloadPending) return;
  clearTimeout(dailyMidnightTimer);
  const now = new Date();
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  dailyMidnightTimer = setTimeout(() => {
    if (!checkDailyDateLock()) scheduleMidnightReload();
  }, tomorrow - now + 50);
  if (!dailyDateInterval) dailyDateInterval = setInterval(() => {
    if (!document.hidden) checkDailyDateLock();
  }, 15000);
}

async function initializeGame() {
  document.body.classList.add('game-loading');
  if (!practice) {
    loadedDailyDate = getTodayDateInt();
    scheduleMidnightReload();
  }
  if (practice) updateModeUI();
  inputElement.disabled = true;
  guessButtonElement.disabled = true;
  hintButton.disabled = practice || Boolean(getAuthToken());
  if (practice && playMode !== 'freeplay') restorePracticePreview();

  try {
    if (practice) { await loadPractice(); hintButton.disabled = false; } else await setMysteryElementOfTheDay();
  } catch (error) { createPopup(error.message); return; }
  finally { document.body.classList.remove('game-loading'); }
  if (!getMysteryElement()) return;

  if (checkDailyDateLock()) return;

  if (numberOfGuesses >= 8 || guessedCorrectly === 'true') {
    if (!practice) displayResults();
  } else {
    if (!dailyReadOnly) {
      inputElement.disabled = false;
      guessButtonElement.disabled = false;
      inputElement.focus();
    }
  }
  return true;
}

// This script is loaded at the end of <body>, so all game DOM nodes already
// exist. Starting here avoids waiting for non-essential resources such as ads,
// web fonts, images, and analytics before the game API requests begin.
window.ElementlePendingGameSave = () => Promise.allSettled([_pendingGuessPromise, _gameStateSyncPromise].filter(Boolean));
window.ElementleGameReady = initializeGame();

// Daily guests keep a per-puzzle ledger; account records come from the API.
function recordVaultDaily(won = guessedCorrectly === 'true') {
  if (practice || getAuthToken() || !getMysteryElement()) return;
  const date = String(getTodayDateInt());
  window.ElementleVault?.recordGuest({ number: getMysteryElement().atomicNumber,
    date: date.slice(0,4) + '-' + date.slice(4,6) + '-' + date.slice(6,8),
    guesses: Number(numberOfGuesses), won,
    hint: gameStorage.getItem('hintUsed:' + date) === 'true' });
}

window.addEventListener("elementle:language-ready", () => { if (getMysteryElement()) renderGuess(); if (inputElement.value) onInputChange(); });

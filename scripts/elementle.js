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

function getAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY) || '';
}

function closeMobileNavMenu() {
  const dropdown = document.querySelector('.js-nav-dropdown');
  const toggle = document.querySelector('.js-nav-menu-toggle');
  if (dropdown) dropdown.hidden = true;
  if (toggle) toggle.setAttribute('aria-expanded', 'false');
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
  const res = await fetch(`${API_BASE}/mystery_element/${dateInt}`);
  if (!res.ok) return null;
  const data = await res.json();
  const atomicNumber = data.atomic_number != null ? parseInt(data.atomic_number, 10) : null;
  if (atomicNumber == null) return null;
  return elements.find((e) => e.atomicNumber === atomicNumber) || null;
}

const defaultUsedElements = JSON.parse(localStorage.getItem('defaultUsedElements')) || []; // Load defaultUsedElements from localStorage


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
    var word = sampleNames[wordIdx];
    var text = word.slice(0, charIdx);
    inputElement.setAttribute('placeholder', text + (cursorVisible ? '|' : '\u00A0'));
  }

  function tick() {
    if (inputElement.disabled || document.activeElement === inputElement || inputElement.value) {
      stopBlink();
      inputElement.setAttribute('placeholder', 'Element');
      return;
    }
    var word = sampleNames[wordIdx];
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
      if (document.querySelector('.autocomplete-list')) {
        return;
      }
      processGuess();
  }
});

const savedGuessesList = localStorage.getItem('guessesList');
const guessesList = savedGuessesList ? JSON.parse(savedGuessesList) : [];

let numberOfGuesses = localStorage.getItem('numberOfGuesses'); // Update local storage with new numberOfGuesses
if (numberOfGuesses === null) {
  numberOfGuesses = '0';
}

let guessedCorrectly = localStorage.getItem('guessedCorrectly');
if (guessedCorrectly === null) {
  guessedCorrectly = 'false';
}

// Get the hint button and hint container elements
const hintButton = document.querySelector('.js-hint-button');
const hintContainer = document.querySelector('.js-hint-container');

// Add click event listener to the hint button
hintButton.addEventListener('click', (event) => {
  event.preventDefault();
  const mystery = getMysteryElement();
  if (!mystery || !mystery.hints) return;
  const idx = getHintIndexForToday();
  hintContainer.classList.remove('hint-visible');
  hintContainer.innerHTML = mystery.hints[idx];
  requestAnimationFrame(() => hintContainer.classList.add('hint-visible'));
});

document.querySelectorAll('.js-stats-button').forEach((btn) => btn.addEventListener('click', (event) => {
  event.preventDefault();
  closeMobileNavMenu();
  displayStats();
}));

function displayStats() {
  const overlay = document.querySelector('.js-overlay');
  overlay.style.display = 'flex';
  setTimeout(() => {
    overlay.classList.add('show');
  }, 10);

  const token = getAuthToken();
  const isLoggedIn = !!token;

  renderStatsModal(overlay, isLoggedIn);

  if (isLoggedIn) {
    var fetchStats = function () {
      return fetch(API_BASE + '/user/stats?localDate=' + encodeURIComponent(getTodayDateInt()), {
        headers: { Authorization: 'Bearer ' + token }
      })
        .then(function (res) { return res.ok ? res.json() : null; })
        .then(function (data) {
          if (!data) return;
          updateStatValues(overlay, {
            wins: data.totalWins || 0,
            played: data.totalGamesPlayed || 0,
            streak: data.currentStreak || 0,
            best: data.maxStreak || 0,
            rate: (data.winRate != null ? data.winRate : 0) + '%'
          });
          if (data.guessDistribution) {
            updateDistributionBars(overlay, data.guessDistribution);
          }
        })
        .catch(function () {});
    };

    if (_pendingGuessPromise) {
      _pendingGuessPromise.then(fetchStats);
    } else {
      fetchStats();
    }
  }
}

function updateStatValues(overlay, vals) {
  ['wins', 'played', 'streak', 'best', 'rate'].forEach(function (key) {
    var el = overlay.querySelector('[data-stat="' + key + '"]');
    if (!el) return;
    var prev = el.textContent;
    el.textContent = vals[key];
    if (prev !== String(vals[key])) {
      el.classList.remove('stat-pop');
      void el.offsetWidth;
      el.classList.add('stat-pop');
    }
  });
}

function updateDistributionBars(overlay, dist) {
  var mapped = {};
  for (var i = 1; i <= 8; i++) mapped[String(i)] = dist[String(i)] || 0;
  mapped['X'] = dist['failed'] || 0;
  var maxVal = Math.max(...Object.values(mapped), 1);
  Object.keys(mapped).forEach(function (key) {
    var col = overlay.querySelector('[data-bar="' + key + '"]');
    if (!col) return;
    var count = col.querySelector('.bar-count');
    var fill = col.querySelector('.bar-fill');
    if (count) count.textContent = mapped[key];
    if (fill) fill.style.height = (mapped[key] / maxVal * 100) + '%';
  });
}

function renderStatsModal(overlay, loading) {
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

  overlay.innerHTML = `
    <div class="modal-card stats-modal">
      <h2 class="modal-title">Statistics</h2>
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
      <button class="modal-back-button">Back</button>
    </div>
  `;

  document.querySelector('.modal-back-button').addEventListener('click', (event) => {
    event.preventDefault();
    closeModal(overlay);
  });

  lockBodyScroll();
  setTimeout(function () { setupFocusTrap(overlay); }, 20);
}

var _focusTrapContainer = null;
var _focusTrapHandler = null;

function lockBodyScroll() {
  document.body.classList.add('modal-open');
}

function unlockBodyScroll() {
  document.body.classList.remove('modal-open');
}

function getFocusableElements(container) {
  var sel = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
  return Array.prototype.filter.call(container.querySelectorAll(sel), function (el) {
    return !el.disabled && el.offsetParent !== null;
  });
}

function setupFocusTrap(container) {
  if (_focusTrapContainer) return;
  var focusables = getFocusableElements(container);
  if (focusables.length === 0) return;
  focusables[0].focus();
  _focusTrapContainer = container;
  _focusTrapHandler = function (e) {
    if (e.key !== 'Tab') return;
    var list = getFocusableElements(container);
    if (list.length === 0) return;
    var idx = list.indexOf(document.activeElement);
    if (idx === -1) idx = 0;
    var next = e.shiftKey ? (idx - 1 + list.length) % list.length : (idx + 1) % list.length;
    list[next].focus();
    e.preventDefault();
  };
  container.addEventListener('keydown', _focusTrapHandler);
}

function removeFocusTrap() {
  if (_focusTrapContainer && _focusTrapHandler) {
    _focusTrapContainer.removeEventListener('keydown', _focusTrapHandler);
    _focusTrapContainer = null;
    _focusTrapHandler = null;
  }
}

function closeModal(overlay) {
  unlockBodyScroll();
  removeFocusTrap();
  var card = overlay.querySelector('.modal-card');
  if (card) {
    card.classList.add('modal-closing');
    card.addEventListener('animationend', function () {
      overlay.classList.remove('show');
      overlay.addEventListener('transitionend', function () {
        if (!overlay.classList.contains('show')) {
          overlay.style.display = 'none';
          card.classList.remove('modal-closing');
        }
      }, { once: true });
    }, { once: true });
  } else {
    overlay.classList.remove('show');
    overlay.addEventListener('transitionend', function () {
      if (!overlay.classList.contains('show')) overlay.style.display = 'none';
    }, { once: true });
  }
}
window.closeModal = closeModal;
window.lockBodyScroll = lockBodyScroll;
window.setupFocusTrap = setupFocusTrap;

document.querySelectorAll('.js-help-button').forEach((btn) => btn.addEventListener('click', (event) => {
  event.preventDefault();
  closeMobileNavMenu();
  displayHelp();
}));

function displayHelp() {
  const overlay = document.querySelector('.js-overlay');
  overlay.style.display = 'flex';

  setTimeout(() => {
    overlay.classList.add('show');
  }, 10);

  overlay.innerHTML = `
    <div class="modal-card help-modal">
      <h2 class="modal-title">How to Play</h2>
      <div class="help-content">
        <p class="help-intro">Guess the daily element in 8 tries. A new game is available at midnight (00:00) local time.</p>
        <div class="help-section">
          <h3 class="help-section-title">After each guess you'll see:</h3>
          <ul class="help-list">
            <li><span class="help-icon">⬆️</span> Mystery element's atomic number is <strong>higher</strong></li>
            <li><span class="help-icon">⬇️</span> Mystery element's atomic number is <strong>lower</strong></li>
            <li><span class="help-letter green">Green</span> symbol letter — correct letter, correct position</li>
            <li><span class="help-letter yellow">Yellow</span> symbol letter — correct letter, wrong position</li>
            <li><span class="help-letter green">Green</span> family name — element is in the correct family</li>
          </ul>
        </div>
        <p class="help-tip">Use the <strong>HINT</strong> button if you're stuck.</p>
      </div>
      <button class="modal-back-button">Back</button>
    </div>`;

  document.querySelector('.modal-back-button').addEventListener('click', (event) => {
    event.preventDefault();
    closeModal(overlay);
  });

  lockBodyScroll();
  setTimeout(function () { setupFocusTrap(overlay); }, 20);
}

var _initialRenderDone = false;

function renderShimmerGrid() {
  const elementGrid = document.querySelector('.element-grid');
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
  const mystery = getMysteryElement();
  if (!mystery) return;

  const guessedList = JSON.parse(localStorage.getItem('guessesList'));
  const elementGrid = document.querySelector('.element-grid');
  elementGrid.innerHTML = '';

  const fadeInAppliedList = JSON.parse(localStorage.getItem('fadeInAppliedList')) || [];
  const guessCount = (guessedList && guessedList.length) || 0;
  const lastGuess = guessCount > 0 ? guessedList[guessCount - 1] : null;
  const lastGuessCorrect = lastGuess && lastGuess.name && lastGuess.name.toLowerCase() === mystery.name.toLowerCase();
  const gameOver = guessedCorrectly === 'true' || lastGuessCorrect || guessCount >= 8;
  let nextSlotMarked = false;

  for (let i = 0; i < 8; i++) {
    const elementDiv = document.createElement('div');
    elementDiv.classList.add('element');

    if (guessedList && guessedList.length > 0 && guessedList[i]) {
      elementDiv.classList.add('guessed-element');
      const guessedElement = guessedList[i];
      const atomicSignal = (guessedElement.atomicNumber === mystery.atomicNumber) ? '&#127881;' : (guessedElement.atomicNumber < mystery.atomicNumber) ? '⬆️' : '⬇️';
      const familyClass = (guessedElement.family === mystery.family) ? 'green' : 'family';

      const isNew = !fadeInAppliedList[i] && animate;
      const applyFadeIn = isNew ? 'fade-in-text' : '';
      if (isNew) elementDiv.classList.add('card-flip');

      const atomicNumberSpan = document.createElement('span');
      atomicNumberSpan.classList.add('atomic-number');
      const signalSpan = `<span class="atomic-signal">${atomicSignal}</span>`;
      if (isNew) {
        atomicNumberSpan.innerHTML = `0 ${signalSpan}`;
        const target = guessedElement.atomicNumber;
        const duration = 1000;
        const startDelay = 400;
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
      if (guessedElement.name.toLowerCase() === mystery.name.toLowerCase()) {
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
  localStorage.setItem('fadeInAppliedList', JSON.stringify(fadeInAppliedList));
}


function trackGuessDistribution(guessCount) {
  let distributionData = JSON.parse(localStorage.getItem('guessDistribution') || JSON.stringify({
    1: 0, 2: 0, 3: 0, 4: 0, 
    5: 0, 6: 0, 7: 0, 8: 0, 
    'X': 0
  }));
  
  if (guessCount === 0) {
    distributionData['X']++;
  } else {
    distributionData[guessCount]++;
  }

  localStorage.setItem('guessDistribution', JSON.stringify(distributionData));
}


function sendDistribution(nog) {
  const dateInt = getTodayDateInt();
  const guesses = Math.max(1, Math.min(9, nog <= 8 ? nog : 9));

  fetch(`${API_BASE}/guess_distribution`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      localDate: dateInt,
      guesses: guesses
    })
  })
    .then((res) => (res.ok ? res.json() : Promise.reject(res)))
    .catch((err) => console.warn('Guess distribution request failed', err));
}

let _guessInFlight = false;
let _pendingGuessPromise = null;

async function processGuess() {
  if (_guessInFlight) return;

  const inputValue = inputElement.value.trim();
  const guessedElement = elements.find(element => element.name.toLowerCase() === inputValue.toLowerCase());

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

  const alreadyGuessed = guessesList.some(guess => guess.name.toLowerCase() === guessedElement.name.toLowerCase());
  if (alreadyGuessed) {
    alreadyGuessedPopup();
    inputElement.focus();
    return;
  }

  _guessInFlight = true;

  guessesList.push({
    name: guessedElement.name,
    atomicNumber: guessedElement.atomicNumber,
    family: guessedElement.family,
    hint: (guessedElement.hints && guessedElement.hints[0]) || '',
    symbol: guessedElement.symbol
  });
  numberOfGuesses = +numberOfGuesses + 1;
  localStorage.setItem('guessesList', JSON.stringify(guessesList));
  localStorage.setItem('numberOfGuesses', numberOfGuesses);
  removeAutocompleteDropdown();
  renderGuess({ animate: true });

  if (window.innerWidth < 768) {
    var grid = document.querySelector('.element-grid');
    var latestCard = grid && grid.children[numberOfGuesses - 1];
    if (latestCard) latestCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  const isCorrect = guessedElement.name.toLowerCase() === getMysteryElement().name.toLowerCase();
  const isGameOver = numberOfGuesses >= 8;

  const token = getAuthToken();

  if (token) {
    _pendingGuessPromise = fetch(API_BASE + '/game/guess', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({ localDate: getTodayDateInt(), guess: guessedElement.atomicNumber })
    })
      .then(function (res) { return res.json().catch(function () { return {}; }); })
      .catch(function (e) { console.warn('Game guess sync failed', e); })
      .finally(function () {
        _guessInFlight = false;
        _pendingGuessPromise = null;
      });

    if (isCorrect) {
      localStorage.setItem('guessedCorrectly', 'true');
      guessedCorrectly = 'true';
      confetti({ particleCount: 150, spread: 200 });
      createPopup('Well done!');
      displayResults();
    } else if (isGameOver) {
      localStorage.setItem('guessedCorrectly', 'false');
      guessedCorrectly = 'false';
      createPopup('Thanks for playing!');
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
    localStorage.setItem('totalGames', +localStorage.getItem('totalGames') + 1);
    localStorage.setItem('totalWins', +localStorage.getItem('totalWins') + 1);
    localStorage.setItem('currentStreak', +localStorage.getItem('currentStreak') + 1);
    localStorage.setItem('maxWinStreak', (Number(localStorage.getItem("currentStreak")) > Number(localStorage.getItem("maxWinStreak"))) ? localStorage.getItem("currentStreak"): localStorage.getItem("maxWinStreak"));
    localStorage.setItem('guessedCorrectly', 'true');
    guessedCorrectly = 'true';
    confetti({ particleCount: 150, spread: 200 });
    createPopup('Well done!');
    displayResults();
    sendDistribution(numberOfGuesses);
  } else if (isGameOver) {
    trackGuessDistribution(0);
    localStorage.setItem('totalGames', +localStorage.getItem('totalGames') + 1);
    localStorage.setItem('currentStreak', 0);
    localStorage.setItem('guessedCorrectly', 'false');
    guessedCorrectly = 'false';
    displayResults();
    createPopup('Thanks for playing!');
    sendDistribution(9);
  } else {
    localStorage.setItem('guessedCorrectly', 'false');
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

  const filtered = [];
  elements.forEach((el) => {
    if (el.name.substring(0, value.length).toLowerCase() === value) {
      filtered.push({ name: el.name, symbol: el.symbol });
    }
  });
  filtered.sort((a, b) => a.name.localeCompare(b.name));
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
    const matched = el.name.substring(0, matchLen);
    const rest = el.name.substring(matchLen);
    elementButton.innerHTML = '<span class="ac-name"><span class="ac-match">' + matched + '</span>' + rest + '</span>';
    elementButton.setAttribute('data-name', el.name);
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
  localStorage.setItem('lastPlayedDate', date.toISOString().slice(0,10).replace(/-/g,""));
}

function getLastPlayedDate() {
  return localStorage.getItem('lastPlayedDate');
}

function resetStreakIfNeeded() {
  const lastPlayedDate = getLastPlayedDate();
  
  if (lastPlayedDate) {
    const today = new Date();
    const dayBeforeYesterday = new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString().slice(0,10).replace(/-/g,"");
  
    if (lastPlayedDate <= dayBeforeYesterday) {
      localStorage.setItem('currentStreak', 0);
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
  localStorage.setItem('guessesList', JSON.stringify(guessesList));
  localStorage.setItem('numberOfGuesses', String(numberOfGuesses));
  localStorage.setItem('guessedCorrectly', guessedCorrectly);
}

async function setMysteryElementOfTheDay() {
  resetStreakIfNeeded();

  const todayInt = getTodayDateInt();
  const todayStr = String(todayInt);
  const gameDate = localStorage.getItem('gameDate');

  if (gameDate !== todayStr) {
    numberOfGuesses = 0;
    inputElement.disabled = false;
    guessButtonElement.disabled = false;
    localStorage.setItem('guessedCorrectly', 'false');
    localStorage.setItem('numberOfGuesses', '0');
    localStorage.setItem('guessesList', JSON.stringify([]));
    localStorage.setItem('fadeInAppliedList', JSON.stringify([]));
    localStorage.setItem('gameDate', todayStr);
    guessesList.length = 0;
    guessedCorrectly = 'false';

    document.querySelector('.js-reveal-answer')?.remove();
    document.querySelector('.js-additional-info')?.remove();
    document.querySelector('.js-share-button')?.remove();
  }

  mysteryElementCache = await fetchMysteryElementForDate(todayInt);
  if (!mysteryElementCache) {
    console.error('Could not load mystery element for today');
    return;
  }

  if (getAuthToken()) {
    await syncGameStateFromServer();
  } else {
    renderGuess();
  }
  inputElement.focus();
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

  inputElement.disabled = false;
  guessButtonElement.disabled = false;
}
window.clearEndOfGameUI = clearEndOfGameUI;

async function syncGameStateFromServer() {
  const token = getAuthToken();
  if (!token) return;
  const todayInt = getTodayDateInt();
  try {
    const res = await fetch(
      API_BASE + '/game/state?localDate=' + encodeURIComponent(todayInt),
      { headers: { Authorization: 'Bearer ' + token } }
    );
    if (!res.ok) return;
    const data = await res.json();
    applyGameStateFromApi(data.guesses || [], data.numGuesses, data.won);
    localStorage.setItem('gameDate', String(todayInt));
    clearEndOfGameUI();

    const hasGuesses = (data.guesses && data.guesses.length) > 0;
    if (hasGuesses) {
      _initialRenderDone = false;
      renderShimmerGrid();
      setTimeout(function () {
        renderGuess();
        if (data.won || data.numGuesses >= 8) {
          displayResults();
        }
      }, 500);
    } else {
      renderGuess();
      if (data.won || data.numGuesses >= 8) {
        displayResults();
      }
    }
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

  additionalInfoElement.innerHTML = `<a class="additional-info" href="https://en.wikipedia.org/wiki/${getMysteryElement().name}" target="_blank">&#128218; Wikipedia</a>`;
  inputElement.disabled = true;
  guessButtonElement.disabled = true;

  let shareButtonElement = document.querySelector('.js-share-button');

  if (!shareButtonElement) {
    shareButtonElement = document.createElement('div');
    shareButtonElement.className = 'js-share-button';
    correctGuessContainer.appendChild(shareButtonElement); // Append to the appropriate container
  }

  if (shareButtonElement) {
    shareButtonElement.innerHTML = `<button class="share-button"><svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="#FFFFFF"><path d="M648-96q-50 0-85-35t-35-85q0-9 4-29L295-390q-16 14-36.05 22-20.04 8-42.95 8-50 0-85-35t-35-85q0-50 35-85t85-35q23 0 43 8t36 22l237-145q-2-7-3-13.81-1-6.81-1-15.19 0-50 35-85t85-35q50 0 85 35t35 85q0 50-35 85t-85 35q-23 0-43-8t-36-22L332-509q2 7 3 13.81 1 6.81 1 15.19 0 8.38-1 15.19-1 6.81-3 13.81l237 145q16-14 36.05-22 20.04-8 42.95-8 50 0 85 35t35 85q0 50-35 85t-85 35Zm0-72q20.4 0 34.2-13.8Q696-195.6 696-216q0-20.4-13.8-34.2Q668.4-264 648-264q-20.4 0-34.2 13.8Q600-236.4 600-216q0 20.4 13.8 34.2Q627.6-168 648-168ZM216-432q20.4 0 34.2-13.8Q264-459.6 264-480q0-20.4-13.8-34.2Q236.4-528 216-528q-20.4 0-34.2 13.8Q168-500.4 168-480q0 20.4 13.8 34.2Q195.6-432 216-432Zm432-264q20.4 0 34.2-13.8Q696-723.6 696-744q0-20.4-13.8-34.2Q668.4-792 648-792q-20.4 0-34.2 13.8Q600-764.4 600-744q0 20.4 13.8 34.2Q627.6-696 648-696Zm0 480ZM216-480Zm432-264Z"/></svg>Share</button>`;
  }

  guessedCorrectly = localStorage.getItem('guessedCorrectly');

  if (guessedCorrectly === 'false') {
    const m = getMysteryElement();
    revealAnswerElement.innerHTML = `<div class="reveal-answer">
      <div class="reveal-answer-badge">
        <span class="reveal-answer-badge-symbol">${m.symbol}</span>
        <span class="reveal-answer-badge-num">${m.atomicNumber}</span>
      </div>
      <div>
        <div class="reveal-answer-name">${m.name}</div>
        <div class="reveal-answer-label">${m.family}</div>
      </div>
    </div>`;
  }

  shareButtonElement.addEventListener('click', () => {
    guessedCorrectly = localStorage.getItem('guessedCorrectly');
    numberOfGuesses = localStorage.getItem('numberOfGuesses');
    const guessedList = JSON.parse(localStorage.getItem('guessesList'));
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
  
    navigator.clipboard.writeText(shareText);
    createPopup('Copied results to clipboard');
  });
  updateLastPlayedDate();
  displayCountdown();
  if (window._countdownInterval) clearInterval(window._countdownInterval);
  window._countdownInterval = setInterval(displayCountdown, 1000);
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
  if (timebox) timebox.style.display = 'flex';
  const hours_container = document.querySelector(".js-hours");
  const minutes_container = document.querySelector(".js-minutes");
  const seconds_container = document.querySelector(".js-seconds");
  const countdown_text_container = document.querySelector(".countdown-text");
  const colon_containers = document.querySelectorAll(".colon-text");

  countdown_text_container.innerHTML = "Next Elementle in ";
  colon_containers.forEach(element => {
    element.innerHTML = ":";
  })

  const target_date = getNextMidnight();
  const current_date = new Date().getTime();
  const distance = target_date - current_date;

  const hours = String(Math.floor(distance / 1000 / 60 / 60)).padStart(2, '0');
  const minutes = String(Math.floor(distance / 1000 / 60) % 60).padStart(2, '0');
  const seconds = String(Math.floor(distance / 1000) % 60).padStart(2, '0');

  // console.log(hours + ":" + minutes + ":" + seconds);

  hours_container.innerHTML = hours;
  minutes_container.innerHTML = minutes;
  seconds_container.innerHTML = seconds;

  if (hours == "00" && minutes == "00" && seconds == "00") {
    setTimeout(() => {
      hours_container.innerHTML = "";
      minutes_container.innerHTML = "";
      seconds_container.innerHTML = "";
      countdown_text_container.innerHTML = "";
      colon_containers.forEach(element => {
        element.innerHTML = "";
      })
      window.location.reload();
    }, 1000)
  }
}

(function initMobileNavMenu() {
  const toggle = document.querySelector('.js-nav-menu-toggle');
  const dropdown = document.querySelector('.js-nav-dropdown');
  if (!toggle || !dropdown) return;
  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    const willOpen = dropdown.hidden;
    dropdown.hidden = !willOpen;
    toggle.setAttribute('aria-expanded', String(willOpen));
  });
  document.addEventListener('click', () => closeMobileNavMenu());
  dropdown.addEventListener('click', (e) => e.stopPropagation());
})();

window.onload = async function() {
  if (numberOfGuesses >= 8 || guessedCorrectly === 'true') {
    inputElement.disabled = true;
    guessButtonElement.disabled = true;
  } else {
    inputElement.focus();
  }

  await setMysteryElementOfTheDay();

  if (numberOfGuesses >= 8 || guessedCorrectly === 'true') {
    displayResults();
  }

  let totalGames = parseInt(localStorage.getItem("totalGames"), 10);
  if (!totalGames && !getAuthToken()) {
    displayHelp();
  }
};

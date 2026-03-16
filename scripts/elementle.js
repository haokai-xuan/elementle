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

const guessButtonElement = document.querySelector('.js-guess-button');
guessButtonElement.addEventListener('click', (event) => {
  event.preventDefault();
  processGuess();
});

const shareButtonElement = document.querySelector('.js-share-button');

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
  hintContainer.innerHTML = mystery.hints[idx];
});

document.querySelector('.js-stats-button').addEventListener('click', (event) => {
  event.preventDefault();
  displayStats();
});

function displayStats() {
  const overlay = document.querySelector('.js-overlay');
  overlay.style.display = 'flex';
  setTimeout(() => {
    overlay.classList.add('show'); // Add the show class to trigger fade-in
  }, 10); // Short delay to ensure the display property is applied first

  const totalGames = localStorage.getItem('totalGames') || 0;
  const totalWins = localStorage.getItem('totalWins') || 0;
  const winRate = totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0;
  const currentStreak = localStorage.getItem('currentStreak') || 0;
  const maxWinStreak = localStorage.getItem('maxWinStreak') || 0;

  // Get the guess distribution from localStorage
  let distributionData = JSON.parse(localStorage.getItem('guessDistribution') || JSON.stringify({
    1: 0, 2: 0, 3: 0, 4: 0, 
    5: 0, 6: 0, 7: 0, 8: 0, 
    'X': 0
  }));

  let maxValue = Math.max(...Object.values(distributionData));

  const bars = Object.keys(distributionData).map((key) => {
    let value = distributionData[key];
    let percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
    return `
      <div class="bar-col">
        <span class="bar-count">${value}</span>
        <div class="bar-track">
          <div class="bar-fill" style="height: ${percentage}%;"></div>
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
          <span class="stat-value">${totalWins}</span>
          <span class="stat-label">Wins</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">${totalGames}</span>
          <span class="stat-label">Played</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">${currentStreak}</span>
          <span class="stat-label">Current streak</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">${maxWinStreak}</span>
          <span class="stat-label">Best streak</span>
        </div>
        <div class="stat-item stat-item-wide">
          <span class="stat-value">${winRate}%</span>
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
    overlay.classList.remove('show');
    overlay.addEventListener('transitionend', () => {
      if (!overlay.classList.contains('show')) {
        overlay.style.display = 'none';
      }
    }, { once: true });
  });
}



document.querySelector('.js-help-button').addEventListener('click', (event) => {
  event.preventDefault();
  displayHelp();
});

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
    overlay.classList.remove('show'); // Remove the show class to trigger fade-out
    overlay.addEventListener('transitionend', () => {
      if (!overlay.classList.contains('show')) {
        overlay.style.display = 'none'; // Hide overlay after transition ends
      }
    }, { once: true });
  });
}

function renderGuess() {
  const mystery = getMysteryElement();
  if (!mystery) return;

  const guessedList = JSON.parse(localStorage.getItem('guessesList'));
  const elementGrid = document.querySelector('.element-grid');
  elementGrid.innerHTML = '';

  // Retrieve the fade-in applied state from localStorage
  const fadeInAppliedList = JSON.parse(localStorage.getItem('fadeInAppliedList')) || [];

  // Loop through the elements to render each grid
  for (let i = 0; i < 8; i++) {
    const elementDiv = document.createElement('div');
    elementDiv.classList.add('element');

    if (guessedList && guessedList.length > 0 && guessedList[i]) {
      elementDiv.classList.add('guessed-element');
      const guessedElement = guessedList[i];
      const atomicSignal = (guessedElement.atomicNumber === mystery.atomicNumber) ? '&#127881;' : (guessedElement.atomicNumber < mystery.atomicNumber) ? '⬆️' : '⬇️';
      const familyClass = (guessedElement.family === mystery.family) ? 'green' : 'family';

      // Apply fade-in-text effect only to the text elements in the newly guessed element
      const applyFadeIn = !fadeInAppliedList[i] ? 'fade-in-text' : '';

      // Render the guessed element information
      const atomicNumberSpan = document.createElement('span');
      atomicNumberSpan.classList.add('atomic-number');
      atomicNumberSpan.innerHTML = guessedElement.atomicNumber + ` ${atomicSignal}`;
      if (applyFadeIn) {
        atomicNumberSpan.classList.add(applyFadeIn);
      }
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
      letterSpans.forEach(span => {
        symbolSpan.appendChild(span);
      });
      if (applyFadeIn) {
        symbolSpan.classList.add(applyFadeIn);
      }
      elementDiv.appendChild(symbolSpan);

      const nameSpan = document.createElement('span');
      nameSpan.classList.add('name');
      nameSpan.textContent = guessedElement.name;
      if (guessedElement.name.toLowerCase() === mystery.name.toLowerCase()) {
        nameSpan.classList.add('green');
        atomicNumberSpan.classList.add('green');
      }
      if (applyFadeIn) {
        nameSpan.classList.add(applyFadeIn);
      }
      elementDiv.appendChild(nameSpan);

      const familySpan = document.createElement('span');
      familySpan.classList.add('family');
      familySpan.textContent = guessedElement.family;
      familySpan.classList.add(familyClass);
      if (applyFadeIn) {
        familySpan.classList.add(applyFadeIn);
      }
      elementDiv.appendChild(familySpan);

      // Mark fade-in as applied
      fadeInAppliedList[i] = true;
    } else {
      // Render empty boxes for elements that have not been guessed yet
      const emptyDiv = document.createElement('div');
      emptyDiv.classList.add('empty-box');
      elementDiv.appendChild(emptyDiv);
    }

    // Append the grid to the element grid container
    elementGrid.appendChild(elementDiv);
  }

  // Update the fadeInAppliedList in localStorage
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

function processGuess() {
  const inputValue = inputElement.value.trim();
  const guessedElement = elements.find(element => element.name.toLowerCase() === inputValue.toLowerCase());

  if (guessedElement || inputValue === '') {
    inputElement.value = '';

    const alreadyGuessed = guessesList.some(guess => guess.name.toLowerCase() === guessedElement.name.toLowerCase());

    if (alreadyGuessed) {
      alreadyGuessedPopup();
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

    localStorage.setItem('guessesList', JSON.stringify(guessesList));
    localStorage.setItem('numberOfGuesses', numberOfGuesses);
    removeAutocompleteDropdown();
    renderGuess();

    if (numberOfGuesses <= 8 && guessedElement.name.toLowerCase() === getMysteryElement().name.toLowerCase()) {
      trackGuessDistribution(numberOfGuesses);

      localStorage.setItem('totalGames', +localStorage.getItem('totalGames') + 1);
      localStorage.setItem('totalWins', +localStorage.getItem('totalWins') + 1);
      localStorage.setItem('currentStreak', +localStorage.getItem('currentStreak') + 1);
      localStorage.setItem('maxWinStreak', (Number(localStorage.getItem("currentStreak")) > Number(localStorage.getItem("maxWinStreak"))) ? localStorage.getItem("currentStreak"): localStorage.getItem("maxWinStreak"));

      localStorage.setItem('guessedCorrectly', 'true');
      confetti({
        particleCount: 150,
        spread: 200
      });
      createPopup('Well done!');
      displayResults();
      sendDistribution(numberOfGuesses);
    } else if (numberOfGuesses >= 8) {
      trackGuessDistribution(0);

      localStorage.setItem('totalGames', +localStorage.getItem('totalGames') + 1);
      localStorage.setItem('currentStreak', 0);
      
      localStorage.setItem('guessedCorrectly', 'false');
      displayResults();
      createPopup('Thanks for playing!');
      sendDistribution(9);
    } else {
      localStorage.setItem('guessedCorrectly', 'false');
    }
  }
  else {
    invalidGuess();
  }
  inputElement.focus();
}

function invalidGuess() {
  createPopup('Please enter a valid element.');
  shakeInputBar();
}

function shakeInputBar() {
  inputElement.classList.add('shake', 'glow-red');
  setTimeout(() => {
    inputElement.classList.remove('shake', 'glow-red');
  }, 500);
}

function alreadyGuessedPopup() {
  createPopup('You have already guessed this element.');
  shakeInputBar();
}


function onInputChange() {
  removeAutocompleteDropdown();
  const value = inputElement.value.toLowerCase();

  if (value.length === 0) return;

  const filteredNames = [];

  elements.forEach((elementObject) => {
    elementName = elementObject.name;
    if (elementName.substr(0, value.length).toLowerCase() === value){
      filteredNames.push(elementName.toUpperCase());
    }
  });
  createAutocompleteDropdown(filteredNames);
}

function createAutocompleteDropdown(list) {
  const listElement = document.createElement('ul');
  listElement.className = 'autocomplete-list';

  list.forEach((element) => {
    const listItem = document.createElement('li');
    const elementButton = document.createElement('button');
    elementButton.innerHTML = element;
    elementButton.addEventListener('click', onElementButtonClick);
    listItem.appendChild(elementButton);

    listElement.append(listItem);
  });

  document.querySelector('.js-autocomplete-wrapper').appendChild(listElement);
}

function removeAutocompleteDropdown() {
  const listElement = document.querySelector('.autocomplete-list');
  if (listElement) {
    listElement.remove();
  }
}

function onElementButtonClick(event) {
  event.preventDefault();

  const buttonElement = event.target;
  inputElement.value = buttonElement.innerHTML;
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

async function setMysteryElementOfTheDay() {
  resetStreakIfNeeded();

  const todayInt = getTodayDateInt();
  const todayStr = String(todayInt);
  const gameDate = localStorage.getItem('gameDate');

  mysteryElementCache = await fetchMysteryElementForDate(todayInt);
  if (!mysteryElementCache) {
    console.error('Could not load mystery element for today');
    return;
  }

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

  renderGuess();
  inputElement.focus();
}

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
    revealAnswerElement.innerHTML = `<p class="reveal-answer">Element: ${getMysteryElement().name}</p>`;
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
  setInterval(displayCountdown, 1000);
}


function createPopup(text) {
  const popupElement = document.createElement('div');
  popupElement.classList.add('popup');
  popupElement.textContent = text
  document.body.appendChild(popupElement);
  setTimeout(() => {
    popupElement.style.opacity = '1';
    setTimeout(() => {
      popupElement.style.opacity = '0';
      setTimeout(() => {
        document.body.removeChild(popupElement);
      }, 1000); // Adjust the delay for hiding the popup
    }, 2000); // Adjust the delay for showing the popup
  }, 100); // Adjust the delay for adding the popup to the DOM
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

window.onload = async function() {
  inputElement.focus();
  await setMysteryElementOfTheDay();

  if (numberOfGuesses >= 8 || (numberOfGuesses <= 8 && guessedCorrectly === 'true')){
    displayResults();
  }

  let totalGames = parseInt(localStorage.getItem("totalGames"), 10);
  if (!totalGames) {
    displayHelp();
  }
};

const changeModeEl = document.querySelector('.js-change-mode-button');
changeModeEl.addEventListener('click', () => {
  window.location.href = '/index.html';
});

// INPUT
const inputElement = document.querySelector('.js-guess-input');
inputElement.addEventListener('input', onInputChange);

document.body.addEventListener('click', () => {
  removeAutocompleteDropdown();
});


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

// DISPLAY STATS
document.querySelector('.js-stats-button').addEventListener('click', (event) => {
  event.preventDefault();
  displayStats();
});

function displayStats() {
  const overlay = document.querySelector('.js-overlay');
  overlay.style.display = 'block'; // Ensure the overlay is displayed
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

  let totalGuesses = Object.values(distributionData).reduce((sum, value) => sum + value, 0);

  const bars = Object.keys(distributionData).map((key) => {
    let value = distributionData[key];
    let percentage = totalGuesses > 0 ? (value / totalGuesses) * 100 : 0; // Normalize by the number of games
  
    return `
      <div class="bar-container">
        <p class="bar-label">${key}&nbsp;</p>
        <div class="bar-background">
          <div class="bar-foreground" style="width: ${percentage}%;"></div>
        </div>
        <p class="bar-count">&nbsp;${value}</p>
      </div>
    `;
  }).join("");


  overlay.innerHTML = `
    <div class="stats-container">
      <h3>Statistics</h3>
      <br/>
      <div class="stats">
        <div class="stat">
          <p class="number">${totalWins}</p>
          <p class="stat-name">Total Wins</p>
        </div>
        <div class="stat">
          <p class="number">${totalGames}</p>
          <p class="stat-name">Games Played</p>
        </div>
        <div class="stat">
          <p class="number">${currentStreak}</p>
          <p class="stat-name">Current Streak</p>
        </div>
        <div class="stat">
          <p class="number">${maxWinStreak}</p>
          <p class="stat-name">Max Streak</p>
        </div>
        <div class="stat">
          <p class="number">${winRate}%</p>
          <p class="stat-name">Win Rate</p>
        </div>
      </div>
      <br/>
      <!-- Guess Distribution Bars -->
        <div class="guess-distribution">
          <div class="bars-container">
            ${bars}
          </div>
        </div>
      <button class="back-button">Back</button>
    </div>
  `;

  document.querySelector('.back-button').addEventListener('click', (event) => {
    event.preventDefault();
    overlay.classList.remove('show'); // Remove the show class to trigger fade-out
    overlay.addEventListener('transitionend', () => {
      if (!overlay.classList.contains('show')) {
        overlay.style.display = 'none'; // Hide overlay after transition ends
      }
    }, { once: true });
  });
}

// DISPLAY HELP
document.querySelector('.js-help-button').addEventListener('click', (event) => {
  event.preventDefault();
  displayHelp();
});

function displayHelp() {
  document.querySelector('.js-overlay').style.display = 'block';
  const overlay = document.querySelector('.js-overlay');

  setTimeout(() => {
    overlay.classList.add('show'); // Add the show class to trigger fade-in
  }, 10); // Short delay to ensure the display property is applied first

  overlay.innerHTML = `
    <div class="help-container">
    <h2>How to Play</h2>
    <h2>Freeplay</h2>
    <br/>
    <ul>
      <li>Indications are provided after each guess:
        <ul>
          <li><span>⬆️</span> means the mystery element number is higher.</li>
          <li><span>⬇️</span> means the mystery element number is lower.</li>
          <li><span style="color: rgb(83, 141, 78)">Green symbol letter</span> means the letter is correct and in the right spot.</li>
          <li><span style="color: rgb(181, 159, 59)">Yellow symbol letter</span> means the letter is correct but in the wrong spot.</li>
          <li><span style="color: rgb(83, 141, 78)">Green family name</span> means the element belongs to the correct family.</li>
        </ul>
      </li>
      <li>Click GIVE UP to try new element.</li>
    </ul>
    <button class="back-button">Back</a>
  </div>`;

  document.querySelector('.back-button').addEventListener('click', (event) => {
    event.preventDefault();
    overlay.classList.remove('show'); // Remove the show class to trigger fade-out
    overlay.addEventListener('transitionend', () => {
      if (!overlay.classList.contains('show')) {
        overlay.style.display = 'none'; // Hide overlay after transition ends
      }
    }, { once: true });
  });
  overlay.style.display = 'block';
}

// GAME LOGIC
const savedGuessesList = localStorage.getItem('guessesListFP');
const guessesList = savedGuessesList ? JSON.parse(savedGuessesList) : [];

const guessButtonElement = document.querySelector('.js-guess-button');
guessButtonElement.addEventListener('click', (event) => {
  event.preventDefault();
  processGuess();
});

document.body.addEventListener('keydown', (event) => {
  if (event.key === 'Enter'){
      if (document.querySelector('.autocomplete-list')) {
        return;
      }
      processGuess();
  }
});

let numberOfGuesses = localStorage.getItem('numberOfGuessesFP'); // Update local storage with new numberOfGuesses
if (numberOfGuesses === null) {
  numberOfGuesses = '0';
}

let guessedCorrectly = localStorage.getItem('guessedCorrectlyFP');
if (guessedCorrectly === null) {
  guessedCorrectly = 'false';
}

renderGuess();
function renderGuess() {
  const guessedList = JSON.parse(localStorage.getItem('guessesListFP')) || []; // Updated key for freeplay
  const elementGrid = document.querySelector('.element-grid');
  elementGrid.innerHTML = '';

  // Retrieve the fade-in applied state from localStorage for freeplay
  const fadeInAppliedList = JSON.parse(localStorage.getItem('fadeInAppliedListFP')) || [];

  // Loop through the elements to render each grid
  for (let i = 0; i < 8; i++) {
    const elementDiv = document.createElement('div');
    elementDiv.classList.add('element');

    if (guessedList && guessedList.length > 0 && guessedList[i]) {
      elementDiv.classList.add('guessed-element');
      const guessedElement = guessedList[i];
      const atomicSignal = (guessedElement.atomicNumber === getMysteryElement().atomicNumber) ? '&#127881;' : (guessedElement.atomicNumber < getMysteryElement().atomicNumber) ? '⬆️' : '⬇️';
      const familyClass = (guessedElement.family === getMysteryElement().family) ? 'green' : 'family';

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
        const mysteryLetter = getMysteryElement().symbol.toLowerCase().charAt(index);
        if (guessedLetter === mysteryLetter) {
          span.style.color = 'rgb(83, 141, 78)';
        } else if (getMysteryElement().symbol.toLowerCase().includes(guessedLetter)) {
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
      if (guessedElement.name.toLowerCase() === getMysteryElement().name.toLowerCase()) {
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
  localStorage.setItem('fadeInAppliedListFP', JSON.stringify(fadeInAppliedList));
}

function processGuess() {
  const inputValue = inputElement.value.trim();
  const guessedElement = elements.find(element => element.name.toLowerCase() === inputValue.toLowerCase());

  if (guessedElement || inputValue === '') {
    inputElement.value = '';

    const guessesList = JSON.parse(localStorage.getItem('guessesListFP')) || []; // Updated key for freeplay
    const alreadyGuessed = guessesList.some(guess => guess.name.toLowerCase() === guessedElement.name.toLowerCase());

    if (alreadyGuessed) {
      alreadyGuessedPopup();
      return;
    }

    guessesList.push({
      name: guessedElement.name,
      atomicNumber: guessedElement.atomicNumber,
      family: guessedElement.family,
      hint: guessedElement.hint,
      symbol: guessedElement.symbol
    });

    let numberOfGuesses = +localStorage.getItem('numberOfGuessesFP') || 0; // Updated key for freeplay
    numberOfGuesses += 1;

    localStorage.setItem('guessesListFP', JSON.stringify(guessesList));
    localStorage.setItem('numberOfGuessesFP', numberOfGuesses);
    removeAutocompleteDropdown();
    renderGuess();

    if (numberOfGuesses <= 8 && guessedElement.name.toLowerCase() === getMysteryElement().name.toLowerCase()) {
      localStorage.setItem('totalGamesFP', +localStorage.getItem('totalGamesFP') + 1 || 1);
      localStorage.setItem('totalWinsFP', +localStorage.getItem('totalWinsFP') + 1 || 1);
      localStorage.setItem('currentStreakFP', +localStorage.getItem('currentStreakFP') + 1 || 1);
      localStorage.setItem('maxWinStreakFP', Math.max(+localStorage.getItem("currentStreakFP"), +localStorage.getItem("maxWinStreakFP") || 0));

      localStorage.setItem('guessedCorrectlyFP', 'true');
      confetti({
        particleCount: 150,
        spread: 200
      });
      displayResults();
    } else if (numberOfGuesses >= 8) {
      localStorage.setItem('totalGamesFP', +localStorage.getItem('totalGamesFP') + 1 || 1);
      localStorage.setItem('currentStreakFP', 0);
      
      localStorage.setItem('guessedCorrectlyFP', 'false');
      displayResults();
    } else {
      localStorage.setItem('guessedCorrectlyFP', 'false');
    }
  } else {
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

function displayResults() {
  inputElement.disabled = true;
  guessButtonElement.disabled = true;

  let revealAnswerElement = document.querySelector('.js-reveal-answer');

  let correctGuessContainer = document.querySelector('.correct-guess-container');
  let revealAnswerContainer = document.querySelector('.reveal-answer-container');

  if (!revealAnswerElement) {
    revealAnswerElement = document.createElement('div');
    revealAnswerElement.className = 'js-reveal-answer';
    revealAnswerContainer.appendChild(revealAnswerElement); // Append to the appropriate container
  }

  guessedCorrectly = localStorage.getItem('guessedCorrectlyFP');

  if (guessedCorrectly === 'false' || !guessedCorrectly) {
    revealAnswerElement.innerHTML = `<p class="reveal-answer">Element: ${getMysteryElement().name}</p>`;
  }

  // Create or retrieve the restart button
  let shareButtonElement = document.querySelector('.js-share-button');

  if (!shareButtonElement) {
    shareButtonElement = document.createElement('div');
    shareButtonElement.className = 'js-share-button';
    correctGuessContainer.appendChild(shareButtonElement); // Append to the appropriate container
  }

  if (shareButtonElement) {
    shareButtonElement.innerHTML = `<button class="share-button">New Game</button>`;
    shareButtonElement.addEventListener('click', restartGame);
  }
}

// GIVING UP
if (localStorage.getItem('givenUpFP') === null) {
  localStorage.setItem('givenUpFP', 'false');
}

let givenUp = JSON.parse(localStorage.getItem('givenUpFP'));
const hintButton = document.querySelector('.js-hint-button');

hintButton.addEventListener('click', () => {
  localStorage.setItem('givenUpFP', 'true');
  
  givenUp = true;
});

// RESETTING GAME
function restartGame() {
  localStorage.removeItem('guessedCorrectlyFP');
  localStorage.removeItem('mysteryElementFP');
  localStorage.removeItem('guessesListFP');

  localStorage.setItem('guessedCorrectlyFP', 'false');
  localStorage.setItem('fadeInAppliedListFP', JSON.stringify([]));

  localStorage.setItem('givenUpFP', 'false'); // Set to false on new game

  inputElement.disabled = false;
  guessButtonElement.disabled = false;

  numberOfGuesses = 0;
  localStorage.setItem('numberOfGuessesFP', numberOfGuesses);

  window.location.reload();
}

// SETTING RANDOM ELEMENT
function selectMysteryElementFP() {
  let mysteryElement = localStorage.getItem("mysteryElementFP");

  if (!mysteryElement) {
    const randomIndex = Math.floor(Math.random() * elements.length);
    mysteryElement = elements[randomIndex];
    localStorage.setItem("mysteryElementFP", JSON.stringify(mysteryElement));
  }
  
  return mysteryElement;
}

function getMysteryElement() {
  return JSON.parse(localStorage.getItem('mysteryElementFP'));
}

window.onload = function() {
  inputElement.focus();
  selectMysteryElementFP();

  if (numberOfGuesses >= 8 || (numberOfGuesses <= 8 && guessedCorrectly === 'true') || givenUp){
    displayResults();
  }
};

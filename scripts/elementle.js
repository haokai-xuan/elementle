const options = { 
  year: 'numeric', 
  month: '2-digit', 
  day: '2-digit', 
  hour: '2-digit', 
  minute: '2-digit', 
  second: '2-digit', 
  hour12: false 
};


const defaultUsedElements = JSON.parse(localStorage.getItem('defaultUsedElements')) || []; // Load defaultUsedElements from localStorage


const changeModeEl = document.querySelector('.js-change-mode-button');
changeModeEl.addEventListener('click', () => {
  window.location.href = '/free-play.html';
});

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
  // Change the content of the hint container when the button is clicked
  event.preventDefault();
  hintContainer.innerHTML = `${getMysteryElement().hint}`;
});

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
    <br/>
    <ul>
      <li>New game available at 00:00 local time.</li>
      <li>Indications are provided after each guess:
        <ul>
          <li><span>⬆️</span> means the mystery element number is higher.</li>
          <li><span>⬇️</span> means the mystery element number is lower.</li>
          <li><span style="color: rgb(83, 141, 78)">Green symbol letter</span> means the letter is correct and in the right spot.</li>
          <li><span style="color: rgb(181, 159, 59)">Yellow symbol letter</span> means the letter is correct but in the wrong spot.</li>
          <li><span style="color: rgb(83, 141, 78)">Green family name</span> means the element belongs to the correct family.</li>
        </ul>
      </li>
      <li>Click HINT if you're stuck.</li>
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

setMysteryElementOfTheDay();


renderGuess();
function renderGuess() {
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
      hint: guessedElement.hint,
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
      localStorage.setItem('maxWinStreak', (localStorage.getItem("currentStreak") > localStorage.getItem("maxWinStreak")) ? localStorage.getItem("currentStreak"): localStorage.getItem("maxWinStreak"));

      localStorage.setItem('guessedCorrectly', 'true');
      confetti({
        particleCount: 150,
        spread: 200
      });
      createPopup('Well done!');
      displayResults();
    } else if (numberOfGuesses >= 8) {
      trackGuessDistribution(0);

      localStorage.setItem('totalGames', +localStorage.getItem('totalGames') + 1);
      localStorage.setItem('currentStreak', 0);
      
      localStorage.setItem('guessedCorrectly', 'false');
      displayResults();
      createPopup('Thanks for playing!');
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


function selectMysteryElement() {
  fetch("https://haokai.pythonanywhere.com/")
      .then(response => response.json()) // Parse the JSON response
      .then((data) => {
          const currentDate = new Date();
          const isoDate = currentDate.toLocaleDateString();  // Get the current date in YYYYMMDD format

          const [month, day, year] = isoDate.split('/'); // Split the date by '/'
          const formattedDate = `${year}${month.padStart(2, '0')}${day.padStart(2, '0')}`;
          
          // Get the mystery element for the current date
          const mysteryElement = data[formattedDate];

          // Store the mystery element and the date in localStorage
          localStorage.setItem('mysteryElement', JSON.stringify(mysteryElement)); // Store the mystery element as a string
          localStorage.setItem('mysteryElementDate', currentDate.toLocaleDateString('en-US')); // Store the date as MM/DD/YYYY format
      })
      .catch(error => {
          console.log("Error fetching mystery element:", error);
      });
}


function getStoredMysteryElement() {
  const storedDate = localStorage.getItem('mysteryElementDate');
  const currentDate = new Date().toLocaleDateString('en-US', options).slice(0, 10); // store date as MM/DD/YYYY format
  if (storedDate === currentDate) {
    // mystery element was selected today, return it
    return JSON.parse(localStorage.getItem('mysteryElement'));
  } else {
    // mystery element was not selected, return null
    return null;
  }
}

function updateLastPlayedDate() {
  localStorage.setItem('lastPlayedDate', new Date().toLocaleDateString('en-US', options).slice(0, 10));
}

function getLastPlayedDate() {
  return localStorage.getItem('lastPlayedDate');
}

function resetStreakIfNeeded() {
  const lastPlayedDate = getLastPlayedDate();
  if (lastPlayedDate) {
    const lastPlayed = new Date(lastPlayedDate);
    const currentDate = new Date();
    const dayBeforeYesterday = new Date();
    dayBeforeYesterday.setDate(currentDate.getDate() - 2);

    if (lastPlayed.toDateString() === dayBeforeYesterday.toDateString()) {
      localStorage.setItem('currentStreak', 0);
    }
  }
}


function setMysteryElementOfTheDay() {
  resetStreakIfNeeded(); // Check and reset the streak if needed

  let storedMysteryElement = getStoredMysteryElement();
  const storedDate = localStorage.getItem('mysteryElementDate');
  const currentDate = new Date().toLocaleDateString('en-US', options).slice(0, 10); // store date as MM/DD/YYYY format
  
  if (!storedMysteryElement || storedDate !== currentDate) {
    selectMysteryElement();
    numberOfGuesses = 0;

    inputElement.disabled = false;
    guessButtonElement.disabled = false;
    localStorage.setItem('guessedCorrectly', 'false');
    localStorage.setItem('numberOfGuesses', '0');
    localStorage.setItem('guessesList', JSON.stringify([]));
    localStorage.setItem('fadeInAppliedList', JSON.stringify([]));
    guessesList.length = 0;
    guessedCorrectly = false;

    document.querySelector('.js-reveal-answer').remove();
    document.querySelector('.js-additional-info').remove();
    document.querySelector('.js-share-button').remove();

    renderGuess();
  }
  inputElement.focus();
}



function getMysteryElement() {
  return JSON.parse(localStorage.getItem('mysteryElement'));
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

window.onload = function() {
  inputElement.focus();
  setMysteryElementOfTheDay();

  if (numberOfGuesses >= 8 || (numberOfGuesses <= 8 && guessedCorrectly === 'true')){
    displayResults();
  }
};

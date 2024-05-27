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

shareButtonElement.addEventListener('click', () => {
  guessedCorrectly = localStorage.getItem('guessedCorrectly');
  numberOfGuesses = localStorage.getItem('numberOfGuesses');
  if (guessedCorrectly === 'true') {
    navigator.clipboard.writeText(`#Elementle 🧪\n${new Date().toISOString().slice(0, 10)}\n${numberOfGuesses}/8 (100%)\nhttps://elementlegame.com`);
  }
  else {
    navigator.clipboard.writeText(`#Elementle 🧪\n${new Date().toISOString().slice(0, 10)}\nX/8\nhttps://elementlegame.com`);
  }
  createPopup('Copied results to clipboard');
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
  document.querySelector('.js-overlay').style.display = 'block';

  const totalGames = localStorage.getItem('totalGames') || 0;
  const totalWins = localStorage.getItem('totalWins') || 0;
  const winRate = totalGames > 0 ? ((totalWins / totalGames) * 100).toFixed(2) : 0;
  const currentStreak = localStorage.getItem('currentStreak') || 0;
  const winStreak = localStorage.getItem('winStreak') || 0;

  const overlay = document.querySelector('.js-overlay');
  overlay.innerHTML = `
    <div class="stats-container">
      <h2>Game Statistics</h2>
      <p>Total Games Played: ${totalGames}</p>
      <p>Total Wins: ${totalWins}</p>
      <p>Win Rate: ${winRate}%</p>
      <p>Current Streak: ${currentStreak}</p>
      <p>Win Streak: ${winStreak}</p>
      <button class="back-button">Back</button>
    </div>
  `;

  
  document.querySelector('.back-button').addEventListener('click', (event) => {
    event.preventDefault();
    overlay.style.display = 'none';
  });


  overlay.style.display = 'block';
}

setMysteryElementOfTheDay();


renderGuess();
function renderGuess() {
  const guessedList = JSON.parse(localStorage.getItem('guessesList'));

  const elementGrid = document.querySelector('.element-grid');
  elementGrid.innerHTML = '';

  // Loop through the elements to render each grid
  for (let i = 0; i < 8; i++) {
    const elementDiv = document.createElement('div');
    elementDiv.classList.add('element');

    if (guessedList && guessedList.length > 0 && guessedList[i]) {
      elementDiv.classList.add('guessed-element');
      const guessedElement = guessedList[i];
      const atomicSignal = (guessedElement.atomicNumber === getMysteryElement().atomicNumber) ? '&#127881;' : (guessedElement.atomicNumber < getMysteryElement().atomicNumber) ? '&#8679;' : '&#8681;';
      const familyClass = (guessedElement.family === getMysteryElement().family) ? 'green' : 'family';

      // Render the guessed element information
      const atomicNumberSpan = document.createElement('span');
      atomicNumberSpan.classList.add('atomic-number');
      atomicNumberSpan.innerHTML = guessedElement.atomicNumber + ` ${atomicSignal}`;
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
      elementDiv.appendChild(symbolSpan);

      const nameSpan = document.createElement('span');
      nameSpan.classList.add('name');
      nameSpan.textContent = guessedElement.name;
      if (guessedElement.name.toLowerCase() === getMysteryElement().name.toLowerCase()) {
        nameSpan.classList.add('green');
        atomicNumberSpan.classList.add('green');
      }
      elementDiv.appendChild(nameSpan);

      const familySpan = document.createElement('span');
      familySpan.classList.add('family');
      familySpan.textContent = guessedElement.family;
      familySpan.classList.add(familyClass);
      elementDiv.appendChild(familySpan);
    }
    else {
      // Render empty boxes for elements that have not been guessed yet
      const emptyDiv = document.createElement('div');
      emptyDiv.classList.add('empty-box');
      elementDiv.appendChild(emptyDiv);
    }

    // Append the grid to the element grid container
    elementGrid.appendChild(elementDiv);
  }
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
      localStorage.setItem('totalGames', +localStorage.getItem('totalGames') + 1);
      localStorage.setItem('totalWins', +localStorage.getItem('totalWins') + 1);
      localStorage.setItem('currentStreak', +localStorage.getItem('currentStreak') + 1);
      const winStreak = +localStorage.getItem('winStreak') + 1;
      localStorage.setItem('winStreak', winStreak);
      if (winStreak > +localStorage.getItem('maxWinStreak')) {
        localStorage.setItem('maxWinStreak', winStreak);
      }

      localStorage.setItem('guessedCorrectly', 'true');
      confetti({
        particleCount: 150,
        spread: 200
      });
      createPopup('Well done!');
      displayResults();
    } else if (numberOfGuesses >= 8) {
      localStorage.setItem('totalGames', +localStorage.getItem('totalGames') + 1);
      localStorage.setItem('currentStreak', 0);
      localStorage.setItem('winStreak', 0);
      
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
  // Set a fixed seed value for the PRNG
  const currentDate = new Date().toISOString().slice(0, 10);

  const cleanedDate = currentDate.replace(/-/g, '');

  const seed = parseInt(cleanedDate, 10); // You can choose any integer value as the seed

  // Initialize the PRNG with the seed
  const randomGenerator = new Math.seedrandom(seed);

  // Generate a random index using the PRNG
  const randomIndex = Math.floor(randomGenerator() * elements.length);

  // Return the element at the random index
  return elements[randomIndex];
}


function storeMysteryElement(mysteryElement) {
  localStorage.setItem('mysteryElement', JSON.stringify(mysteryElement));
  localStorage.setItem('mysteryElementDate', new Date().toISOString().slice(0, 10)); // store date as YYYY-MM-DD format
}

function getStoredMysteryElement() {
  const storedDate = localStorage.getItem('mysteryElementDate');
  const currentDate = new Date().toISOString().slice(0, 10); // get date in YYYY-MM-DD format
  if (storedDate === currentDate) {
    // mystery element was selected today, return it
    return JSON.parse(localStorage.getItem('mysteryElement'));
  } else {
    // mystery element was not selected, return null
    return null;
  }
}

function setMysteryElementOfTheDay() {
  let storedMysteryElement = getStoredMysteryElement();
  const storedDate = localStorage.getItem('mysteryElementDate');
  const currentDate = new Date().toISOString().slice(0, 10); // get current date in YYYY-MM-DD format
  
  if (!storedMysteryElement || storedDate !== currentDate) {
    // if no mystery element is stored for today or the stored mystery element is not from today
    storedMysteryElement = selectMysteryElement();
    storeMysteryElement(storedMysteryElement);
    numberOfGuesses = 0;

    inputElement.disabled = false;
    guessButtonElement.disabled = false;
    localStorage.setItem('guessedCorrectly', 'false');
    localStorage.setItem('numberOfGuesses', '0');
    localStorage.setItem('guessesList', JSON.stringify([]));
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
    shareButtonElement.innerHTML = `<button class="share-button"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-share" viewBox="0 0 16 16">
  <path d="M13.5 1a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3M11 2.5a2.5 2.5 0 1 1 .603 1.628l-6.718 3.12a2.5 2.5 0 0 1 0 1.504l6.718 3.12a2.5 2.5 0 1 1-.488.876l-6.718-3.12a2.5 2.5 0 1 1 0-3.256l6.718-3.12A2.5 2.5 0 0 1 11 2.5m-8.5 4a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3m11 5.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3"/>
  </svg> &nbsp; Share</button>`;
  }

  guessedCorrectly = localStorage.getItem('guessedCorrectly');

  if (guessedCorrectly === 'false') {
    revealAnswerElement.innerHTML = `<p class="reveal-answer">Element: ${getMysteryElement().name}</p>`;
  }
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

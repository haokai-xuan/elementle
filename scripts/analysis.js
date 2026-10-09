(() => {
  const elements = new Map(JSON.parse(document.getElementById('analysis-elements').textContent).map(e => [e.number, e]));
  const $ = id => document.getElementById(id);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const states = { idle:3, thinking:3, explain:3, encourage:2, celebrate:3, confused:2 };
  const frames = {};
  let state = '', frame = 0, animation, idleTimer, result, turn = 0, before = false, requestId = 0;
  for (const [name, count] of Object.entries(states)) {
    frames[name] = Array.from({length:count}, (_,i) => {
      const img = new Image(); img.src = `/images/elbot_frames/${name}_0${i+1}.png`; return img;
    });
  }
  function animateBot(next) {
    if (state === next && animation) return;
    state = next; frame = 0; clearInterval(animation);
    $('bot-frame').src = frames[state][0].src;
    if (!reduced.matches && !document.hidden) animation = setInterval(() => {
      frame = (frame + 1) % frames[state].length;
      $('bot-frame').src = frames[state][frame].src;
    }, state === 'idle' ? 650 : 420);
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) { clearInterval(animation); animation = null; } else animateBot(state); });
  reduced.addEventListener('change', () => { clearInterval(animation); animation = null; animateBot(state); });
  function speak(title, message, mood) {
    clearTimeout(idleTimer);
    $('bot-title').textContent = title; $('bot-message').textContent = message;
    animateBot(mood);
    if (mood !== 'thinking') idleTimer = setTimeout(() => animateBot('idle'), 8500);
  }
  function make(tag, cls, text) { const node = document.createElement(tag); node.className = cls; node.textContent = text; return node; }
  let helpId = 0;
  const explanations = {
    feedback: 'Feedback is the clue from each guess: letter colors, the atomic-number arrow, and whether the family matches. Together they rule out impossible answers.',
    rating: 'Your overall game performance: a blend of how efficiently you solved and how useful your guesses were, with a small penalty for hints.',
    efficiency: 'How few guesses you needed compared with the typical difficulty of this element. Faster solves score higher; an unsolved game scores zero.',
    information: 'How consistently your guesses helped narrow the possible answers, compared with the most informative choices available at each turn.',
    independence: 'How much you relied on a hint. Solving without one earns full marks; using one later has less impact.',
    quality: 'How informative this guess was compared with the best available guess, using only the clues you knew before this turn.',
    bits: 'Bits measure how much uncertainty a guess is expected to remove. One bit roughly halves the possibilities on average; more bits means more useful clues.'
  };
  function help(key, label) {
    const tip = make('div', 'metric-help', '');
    const button = make('button', 'help-toggle', '?'); button.type = 'button';
    const copy = make('span', 'help-copy', explanations[key]); copy.id = 'analysis-help-' + ++helpId;
    copy.setAttribute('role', 'tooltip');
    button.setAttribute('aria-label', label === 'bits' ? 'What are bits?' : `What is ${label}?`);
    button.setAttribute('aria-describedby', copy.id); button.setAttribute('aria-expanded', 'false');
    function positionHelp() {
      const bounds = tip.getBoundingClientRect();
      const width = Math.min(240, window.innerWidth * .75);
      const rightEdge = Math.min(window.innerWidth - 14, Math.max(14 + width, bounds.right));
      copy.style.setProperty('left', `${rightEdge - width - bounds.left}px`);
      copy.style.setProperty('right', 'auto');
    }
    tip.addEventListener('mouseenter', positionHelp);
    button.addEventListener('focus', positionHelp);
    let open = false;
    button.addEventListener('click', () => { positionHelp(); open = !open; tip.classList.toggle('help-open', open); button.setAttribute('aria-expanded', String(open)); });
    button.addEventListener('keydown', event => { if (event.key === 'Escape') { open = false; tip.classList.toggle('help-open', false); button.setAttribute('aria-expanded', 'false'); button.blur(); } });
    tip.append(button, copy); return tip;
  }
  $('feedback-help').append(help('feedback', 'feedback'));
  function metric(text, key, label) {
    const box = make('div', 'step-metric', ''); box.append(make('span', '', text));
    if (key) box.append(help(key, label));
    return box;
  }
  function render() {
    const step = result.steps[turn], guess = elements.get(step.guess), optimal = elements.get(step.optimal);
    const set = new Set(before ? step.before : step.after);
    $('step-label').textContent = `Guess ${turn+1} of ${result.steps.length} · ${before ? 'before feedback' : 'after feedback'}`;
    $('candidate-count').textContent = `${set.size} possible ${set.size === 1 ? 'answer' : 'answers'}`;
    $('table-phase').textContent = before ? 'Before this guess' : 'After this guess';
    $('table-remaining').textContent = set.size;
    $('step-prev').disabled = turn === 0; $('step-next').disabled = turn === result.steps.length-1;
    $('toggle-feedback').textContent = before ? 'Show after this guess' : 'Show before this guess';
    document.querySelectorAll('.periodic-cell').forEach(cell => {
      const n = Number(cell.dataset.number), eliminated = !set.has(n);
      cell.classList.toggle('eliminated', eliminated);
      cell.classList.toggle('optimal', n === step.optimal);
      cell.classList.toggle('actual', n === step.guess);
      cell.setAttribute('aria-label', `${elements.get(n).name}: ${eliminated ? 'eliminated' : 'possible answer'}${n === step.optimal ? ', suggested guess' : ''}${n === step.guess ? ', your guess' : ''}`);
    });
    document.querySelectorAll('.guess-turn').forEach((button, i) => {
      button.classList.toggle('selected', i === turn);
      if (i === turn) button.setAttribute('aria-current', 'step'); else button.removeAttribute('aria-current');
      button.classList.toggle('future', i > turn);
    });
    $('step-metrics').replaceChildren(
      metric(`Guess quality: ${step.quality}/100`, 'quality', 'guess quality'),
      metric(step.before.length === 1 ? 'Answer already known' : `Expected: ${step.expectedBits} bits`, 'bits', 'bits'),
      metric(`Eliminated: ${step.before.length-step.after.length}`));
    let title, message, mood;
    if (step.correct) {
      title = 'Discovery complete!'; mood = 'celebrate';
      message = step.before.length === 1 ? `You followed the clues to ${guess.name}, the only remaining answer.` : `${guess.name} was the answer. Your guess had ${step.quality}/100 information quality before you saw the result.`;
    } else if (step.before.length === 1) {
      title = 'The clues already gave the answer.'; mood = 'confused';
      message = `${optimal.name} (${optimal.symbol}, ${optimal.number}) was the only possible answer before this turn. ${guess.name} was already ruled out, so this guess scored 0/100. Guess ${optimal.name} to finish; no further information is needed.`;
    } else if (step.quality < 45) {
      title = 'Let’s rethink that move.'; mood = 'confused';
      message = `${guess.name} scored ${step.quality}/100 for information. ${step.possible ? '' : 'It was already ruled out as an answer. '}${optimal.name} (${optimal.symbol}, ${optimal.number}) would offer ${step.optimalBits} expected bits, versus ${step.expectedBits}.`;
    } else if (step.quality >= 90) {
      title = 'A sharp choice.'; mood = 'explain';
      message = `${guess.name} scored ${step.quality}/100, narrowing ${step.before.length} answers to ${step.after.length}. ${step.guess === step.optimal ? 'That was my optimal guess, too.' : `${optimal.name} (${optimal.symbol}, ${optimal.number}) was my suggested guess at ${step.optimalBits} expected bits.`}`;
    } else {
      title = 'You’re gathering useful clues.'; mood = 'encourage';
      message = `${guess.name} scored ${step.quality}/100 and left ${step.after.length} possible answers. Try ${optimal.name} (${optimal.symbol}, ${optimal.number}) here for ${step.optimalBits} expected bits, versus ${step.expectedBits}.`;
    }
    if (step.correct) message += step.guess === step.optimal ? ' That was my optimal guess, too.' : ` My suggested guess before this turn was ${optimal.name} (${optimal.symbol}, ${optimal.number}), at ${step.optimalBits} expected bits.`;
    if (!step.before.includes(step.optimal)) message += ' My suggestion is an information probe, even though it cannot be the answer.';
    if (step.hintAvailable) message += ' Your hint was available at this turn.';
    speak(title, message, mood);
  }
  function select(index) { turn = index; before = false; render(); }
  $('step-prev').addEventListener('click', () => { if (turn > 0) select(turn-1); });
  $('step-next').addEventListener('click', () => { if (turn < result.steps.length-1) select(turn+1); });
  $('toggle-feedback').addEventListener('click', () => { before = !before; render(); });
  document.addEventListener('keydown', event => {
    if (!result || ['INPUT','TEXTAREA','SELECT'].includes(event.target.tagName) || event.altKey || event.metaKey || event.ctrlKey) return;
    if (event.key === 'ArrowLeft' && turn > 0) { event.preventDefault(); select(turn-1); }
    if (event.key === 'ArrowRight' && turn < result.steps.length-1) { event.preventDefault(); select(turn+1); }
  });
  function display(data) {
    result = data; turn = 0; before = false;
    const labels = { rating:'Game Rating', efficiency:'Guess efficiency', information:'Information gain', independence:'Independence' };
    $('analysis-scores').replaceChildren(...Object.entries(labels).map(([key,label]) => {
      const card = make('div', 'score-card' + (key === 'rating' ? ' score-primary' : ''), '');
      const value = make('strong', '', String(data.scores[key])); value.append(make('small', '', ' / 100'));
      card.append(make('span', '', label), value, help(key, label.toLowerCase()));
      if (key === 'rating') {
        const hue = Math.max(0, Math.min(100, Number(data.scores[key]) || 0)) * 1.2;
        card.style.setProperty('--rating-color', `hsl(${hue} 60% 72%)`);
        card.style.setProperty('--rating-border', `hsl(${hue} 35% 45%)`);
        card.style.setProperty('--rating-surface', `hsl(${hue} 26% 19%)`);
      }
      return card;
    }));
    $('analysis-guesses').replaceChildren(...data.steps.map((step,index) => {
      const e = elements.get(step.guess), li = document.createElement('li'), button = make('button', 'guess-turn', '');
      button.type = 'button'; button.setAttribute('aria-label', `Guess ${index+1}: ${e.name}. ${step.quality} out of 100 information quality.`);
      const symbol = make('span','guess-symbol','');
      Array.from(e.symbol).forEach((letter,i) => symbol.append(make('span', `letter-${step.feedback[i]}`, letter)));
      const detail = make('span','guess-detail',''); detail.append(make('strong','',e.name), make('small',step.feedback[3] === 'same' ? 'letter-green' : '',e.family));
      const direction = step.feedback[2] === 'same' ? '✓' : step.feedback[2] === 'up' ? '↑' : '↓';
      button.append(make('span','guess-index',`${index+1}`), symbol, detail, make('span','guess-direction',`${e.number} ${direction}`));
      button.addEventListener('click', () => select(index)); li.append(button); return li;
    }));
    const answer = elements.get(data.answer);
    $('analysis-result').textContent = `${data.won ? 'Solved' : 'Answer'}: ${answer.name} (${answer.symbol}) · ${data.steps.length}/8 guesses`;
    $('analysis-scores').hidden = false;
    $('analysis-content').hidden = false; render();
  }
  async function load() {
    const id = ++requestId; $('analysis-retry').hidden = true;
    speak('Connecting the clues…', 'I’m comparing your decisions with every available guess.', 'thinking');
    try {
      const date = new URLSearchParams(location.search).get('date');
      const token = localStorage.getItem('elementle_token');
      let body;
      if (token) body = {localDate:date};
      else {
        const saved = JSON.parse(sessionStorage.getItem('elementle_analysis') || 'null');
        if (saved && saved.localDate === date) body = saved;
        else if (localStorage.getItem('gameDate') === date) body = {
          localDate:date, guesses:JSON.parse(localStorage.getItem('guessesList') || '[]').map(e => e.atomicNumber),
          hintUsed:localStorage.getItem('hintUsed:' + date) === 'true', hintAt:Number(localStorage.getItem('hintUsedAtGuess:' + date) || 0)
        };
        if (!body) throw new Error('Finish a daily game, then press Game analysis to bring your guesses here.');
      }
      const response = await fetch('/api/game/analysis', {method:'POST', headers:{'Content-Type':'application/json', ...(token ? {Authorization:'Bearer '+token} : {})}, body:JSON.stringify(body), signal:AbortSignal.timeout(25000)});
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Analysis is unavailable. Please retry.');
      if (id === requestId) display(data);
    } catch (error) {
      if (id !== requestId) return;
      speak('A small lab interruption.', error.name === 'TimeoutError' ? 'The analysis took too long. Please retry.' : error.message, 'confused');
      $('analysis-retry').hidden = false;
    }
  }
  $('analysis-retry').addEventListener('click', load);
  load();
})();

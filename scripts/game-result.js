/* Daily results are available to every account; elBot retains its own Lab access check. */
(() => {
  // Milliseconds from game completion; saving the result must also finish.
  const RESULT_DELAY_MS = 1200;
  let dialog;
  let generation = 0;
  let frame;
  const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const number = value => Number(value).toLocaleString(window.ElementleI18n?.locale, {maximumFractionDigits: 2});
  function close() {
    generation++;
    cancelAnimationFrame(frame);
    if (!dialog?.open) return;
    const current = dialog;
    current.classList.add('closing');
    setTimeout(() => { current.close(); current.remove(); }, reducedMotion() ? 0 : 180);
  }
  function show(result) {
    generation++;
    cancelAnimationFrame(frame);
    if (dialog) { if (dialog.open) dialog.close(); dialog.remove(); }
    dialog = document.createElement('dialog');
    dialog.className = 'game-result-dialog';
    dialog.setAttribute('aria-labelledby', 'game-result-title');
    dialog.innerHTML = `<div class="game-result-content">
      <p class="game-result-eyebrow">Daily Elementle</p>
      <h2 id="game-result-title"></h2><p class="game-result-detail"></p>
      <div class="game-result-elo"><span class="game-result-elo-label">elELO</span>
        <strong class="game-result-rating"></strong>
        <span class="game-result-change"><span class="game-result-arrow" aria-hidden="true"></span><span class="game-result-delta"></span></span>
        <p class="game-result-rating-note"></p>
      </div>
      <a class="game-result-view" href="#" hidden>View guesses</a>
      <a class="game-result-analysis" href="#"><img src="/images/elbot_frames/idle_01.png" width="28" height="28" alt="">Analyze with elBot</a>
      <button type="button" class="game-result-close">Close</button>
    </div>`;
    const node = selector => dialog.querySelector(selector);
    node('#game-result-title').textContent = result.title || (result.won ? 'Element solved!' : 'Good try!');
    const date = String(result.localDate || '').replace(/-/g, '');
    const formattedDate = /^\d{8}$/.test(date) ? new Date(+date.slice(0,4), +date.slice(4,6)-1, +date.slice(6,8)).toLocaleDateString(window.ElementleI18n?.locale, {month:'long',day:'numeric',year:'numeric'}) : '';
    node('.game-result-detail').textContent = result.guesses ? `${result.won ? 'Solved in' : 'Used'} ${result.guesses} / 8 guesses · ${formattedDate}` : formattedDate;
    renderElo(dialog, result);
    const analysis = node('.game-result-analysis');
    analysis.href = '/analysis?date=' + date;
    analysis.hidden = !!result.historical;
    const view = node('.game-result-view');
    view.hidden = !result.historical;
    view.href = '/game-history?date=' + date;
    if (result.onAnalysis) analysis.addEventListener('click', event => { event.preventDefault(); result.onAnalysis(); });
    node('.game-result-close').addEventListener('click', close);
    dialog.addEventListener('cancel', event => {event.preventDefault(); close();});
    document.body.append(dialog);
    dialog.showModal();
    node('.game-result-close').focus();
  }
  function renderElo(root, result) {
    const node = selector => root.querySelector(selector);
    const elo = result.elo;
    const before = elo?.oldRating ?? elo?.before;
    const rated = elo && [before, elo.rating, elo.change].every(value => typeof value === 'number' && Number.isFinite(value));
    if (rated) {
      const change = elo.change;
      const changeNode = node('.game-result-change');
      changeNode.classList.add(change > 0 ? 'gain' : change < 0 ? 'loss' : 'unchanged');
      node('.game-result-arrow').textContent = change > 0 ? '↑' : change < 0 ? '↓' : '→';
      changeNode.setAttribute('aria-label', `elELO ${change > 0 ? 'gained' : change < 0 ? 'lost' : 'unchanged'}: ${number(Math.abs(change))}`);
      node('.game-result-rating-note').textContent = `Previous elELO: ${number(before)}`;
      const ratingNode = node('.game-result-rating');
      const deltaNode = node('.game-result-delta');
      let start;
      const paint = progress => {
        const eased = 1 - Math.pow(1 - progress, 3);
        ratingNode.textContent = number(before + (elo.rating - before) * eased);
        deltaNode.textContent = (change > 0 ? '+' : change < 0 ? '−' : '') + number(Math.abs(change) * eased);
      };
      paint(0);
      const animate = time => {
        start ??= time;
        const progress = reducedMotion() ? 1 : Math.min((time - start) / 1100, 1);
        paint(progress);
        if (progress < 1) frame = requestAnimationFrame(animate);
      };
      frame = requestAnimationFrame(animate);
    } else {
      node('.game-result-rating').textContent = '—';
      node('.game-result-change').hidden = true;
      const note = node('.game-result-rating-note');
      note.textContent = result.guest ? 'Sign in to track elELO and save daily results across devices.' : result.historical ? 'No elELO result was recorded for this game.' : 'Your elELO result is unavailable. Check your saved result in the streak calendar once the game syncs.';
      if (result.guest) {
        const link = document.createElement('a'); link.href = '/account'; link.textContent = 'Sign in';
        note.append(document.createElement('br'), link);
      }
    }
  }
  function openHistory(result) {
    if (!localStorage.getItem('elementle_token')) return;
    show({...result, historical:true});
  }
  async function schedule(result, response, valid = () => true) {
    const id = ++generation;
    const [data] = await Promise.all([
      Promise.resolve(response).catch(() => null),
      new Promise(resolve => setTimeout(resolve, RESULT_DELAY_MS))
    ]);
    if (id !== generation || !valid()) return;
    show({...result, elo: data?.elELO});
  }
  window.addEventListener('elementle:auth-change', close);
  window.addEventListener('pagehide', close);
  window.ElementleGameResult = {show, openHistory, renderElo, schedule, close};
})();

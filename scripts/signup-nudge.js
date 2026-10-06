(function () {
  const card = document.querySelector('.signup-nudge');
  if (!card) return;
  const NEXT_PROMPT_KEY = 'elementle_signup_nudge_after';
  const DAY = 24 * 60 * 60 * 1000;
  let shown = false;
  let pending = null;

  function eligible() {
    try {
      if (localStorage.getItem('elementle_token')) return false;
      const nextPrompt = Number(localStorage.getItem(NEXT_PROMPT_KEY));
      return !Number.isFinite(nextPrompt) || nextPrompt <= Date.now();
    } catch {
      return false;
    }
  }

  function snooze(days) {
    try {
      localStorage.setItem(NEXT_PROMPT_KEY, String(Date.now() + days * DAY));
    } catch {
      // Storage failures must never interfere with the game.
    }
  }

  function dismiss() {
    snooze(30);
    card.close();
  }

  card.querySelector('.signup-nudge-dismiss').addEventListener('click', dismiss);
  card.querySelector('.signup-nudge-later').addEventListener('click', dismiss);
  card.querySelector('.signup-nudge-link').addEventListener('click', () => snooze(30));
  card.addEventListener('cancel', event => {
    event.preventDefault();
    dismiss();
  });
  card.addEventListener('click', event => {
    const bounds = card.getBoundingClientRect();
    if (event.target === card && (event.clientX < bounds.left || event.clientX > bounds.right ||
        event.clientY < bounds.top || event.clientY > bounds.bottom)) dismiss();
  });
  card.addEventListener('close', () => {
    document.querySelector('.share-button')?.focus();
  });

  window.addEventListener('elementle:game-complete', () => {
    if (shown || pending !== null || !eligible()) return;
    // Let players see their result before inviting them to join.
    pending = setTimeout(() => {
      pending = null;
      if (!eligible()) return;
      shown = true;
      card.showModal();
      snooze(7);
    }, 1800);
  });

  window.addEventListener('storage', event => {
    if (event.key === 'elementle_token' || event.key === NEXT_PROMPT_KEY || event.key === null) {
      clearTimeout(pending);
      pending = null;
      if (card.open) card.close();
    }
  });
})();

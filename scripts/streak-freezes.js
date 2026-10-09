(function () {
  let queue = [], active = false;
  function notice(title, detail, kind = 'result') {
    queue.push({ title, detail, kind });
    showNext();
  }
  function showNext() {
    if (active || !queue.length) return;
    active = true;
    const { title, detail, kind } = queue.shift();
    const toast = document.createElement('div');
    toast.className = 'result-notice notice-' + kind;
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    const icon = document.createElement('span');
    icon.className = 'result-notice-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = kind === 'freeze' ? '❄' : kind === 'win' ? '✓' : kind === 'loss' ? '◇' : '⚛';
    const copy = document.createElement('div');
    const heading = document.createElement('strong'); heading.textContent = title;
    const caption = document.createElement('span'); caption.textContent = detail;
    copy.append(heading, caption);
    const close = document.createElement('button'); close.textContent = '×';
    close.setAttribute('aria-label', 'Dismiss notification');
    toast.append(icon, copy, close);
    document.body.append(toast);
    let timer;
    function dismiss() {
      clearTimeout(timer);
      toast.remove(); active = false; showNext();
    }
    close.onclick = dismiss;
    timer = setTimeout(dismiss, 6000);
  }
  function consume(data) {
    const freeze = data?.streakFreezes;
    if (!freeze) return;
    if (freeze.used > 0) notice(freeze.used === 1 ? 'Streak freeze used' : freeze.used + ' streak freezes used',
      'Your streak is protected. ' + freeze.available + ' / ' + freeze.capacity + ' freezes remaining.', 'freeze');
    if (freeze.earned) notice('Streak freeze earned',
      'Ten daily solves! You now have ' + freeze.available + ' / ' + freeze.capacity + ' freezes.', 'freeze');
  }
  async function refreshAccount() {
    const token = localStorage.getItem('elementle_token');
    if (!token) return;
    // Stats and the main game reconcile through their own requests.
    if (!document.querySelector('.js-account-page')) return;
    const now = new Date();
    const day = now.getFullYear()*10000 + (now.getMonth()+1)*100 + now.getDate();
    try {
      const response = await fetch('/api/user/stats?localDate=' + day, { cache:'no-store', headers: { Authorization:'Bearer ' + token } });
      if (response.ok && token === localStorage.getItem('elementle_token')) consume(await response.json());
    } catch {}
  }
  window.ElementleFreezes = { notice, consume };
  window.addEventListener('elementle:auth-change', refreshAccount);
  refreshAccount();
})();

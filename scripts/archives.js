(function () {
  const panel = document.querySelector('#lab-archives');
  if (!panel) return;
  const progressStore = window.ElementleArchiveProgress;
  const status = document.querySelector('#archive-status');
  let data = progressStore.read().snapshot || { dates: [], progress: {} };
  let month = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const first = new Date(2026, 6, 1);
  let requestId = 0;
  let availabilityVerified = false;
  function render() {
    const today = new Date();
    const todayInt = String(today.getFullYear()*10000 + (today.getMonth()+1)*100 + today.getDate());
    const last = new Date(today.getFullYear(), today.getMonth(), 1);
    const current = progressStore.merge(data);
    const available = new Set(current.dates.map(String));
    document.querySelector('#archive-month').textContent = month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    document.querySelector('#archive-prev').disabled = month <= first;
    document.querySelector('#archive-next').disabled = month >= last;
    const grid = document.querySelector('#archive-days'); grid.replaceChildren();
    for (let n = 0; n < month.getDay(); n++) grid.append(document.createElement('span'));
    const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    for (let n = 1; n <= days; n++) {
      const date = String(month.getFullYear() * 10000 + (month.getMonth()+1)*100 + n);
      const button = document.createElement('button');
      const isToday = date === todayInt;
      const progress = !isToday && current.progress[date];
      const symbol = isToday ? '◦' : progress === 'complete' ? '✓' : progress ? '•' : '';
      button.innerHTML = '<span class="day-number">' + n + '</span><span class="day-symbol" aria-hidden="true">' + symbol + '</span>';
      button.setAttribute('data-date', date);
      button.disabled = !isToday && (!availabilityVerified || !available.has(date) ||
        (current.archiveCutoff && Number(date) >= current.archiveCutoff) || date > todayInt || date < '20260721');
      button.className = isToday ? 'today' : progress || '';
      if (isToday) button.setAttribute('aria-current', 'date');
      button.setAttribute('aria-label', `${month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })} ${n}${isToday ? ', today — daily puzzle' : ''}${progress ? ', ' + progress : ''}`);
      button.addEventListener('click', () => { if (button.disabled) return; location.href = isToday ? '/' : '/?mode=archive&date=' + date; });
      grid.append(button);
    }
    const weeks = Math.ceil((month.getDay() + days) / 7);
    grid.setAttribute('data-weeks', String(weeks));
    while (grid.children.length < weeks * 7) grid.append(document.createElement('span'));
  }
  async function refresh() {
    const id = ++requestId;
    availabilityVerified = false;
    // Restore the newest local markers first, including when restored from the back/forward cache.
    data = progressStore.read().snapshot || { dates: [], progress: {} };
    if (data.dates.length) status.textContent = '';
    render();
    try {
      const today = new Date();
      const date = today.getFullYear()*10000 + (today.getMonth()+1)*100 + today.getDate();
      const token = localStorage.getItem('elementle_token');
      const response = await fetch('/api/practice/archives?localDate=' + date, {
        cache: 'no-store',
        headers: { 'X-Guest-ID': localStorage.getItem('elementle_guest_id'), ...(token ? { Authorization: 'Bearer ' + token } : {}) }
      });
      const snapshot = await response.json();
      if (id !== requestId) return;
      window.ElementleLab?.checkResponse?.(response);
      if (response.status === 401 || response.status === 402) {
        const link = document.createElement('a');
        link.href = '/lab';
        link.textContent = 'Unlock archives with Elementle Lab · Start a 7-day free trial →';
        link.style.color = '#8ec987';
        status.replaceChildren(link);
        return;
      }
      if (!response.ok) throw new Error(snapshot.error || 'Unable to load archives');
      data = snapshot;
      availabilityVerified = true;
      progressStore.cache(snapshot);
      render();
      status.textContent = '';
    } catch (error) { if (id === requestId) status.textContent = error.message; }
  }
  function changeMonth(offset) {
    month = new Date(month.getFullYear(), month.getMonth() + offset, 1);
    render();
  }
  document.querySelector('#archive-prev').onclick = () => changeMonth(-1);
  document.querySelector('#archive-next').onclick = () => changeMonth(1);
  window.addEventListener('pageshow', event => { if (event.persisted) refresh(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
  window.addEventListener('focus', refresh);
  window.addEventListener('elementle:archive-progress', render);
  window.addEventListener('storage', event => {
    if (event.key === 'elementle_token' || event.key === 'elementle_guest_id' || event.key?.startsWith(progressStore.prefix)) refresh();
  });
  refresh();
})();

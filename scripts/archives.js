(function () {
  const ARCHIVE_START_DATE = '20260725';
  const panel = document.querySelector('#lab-archives');
  if (!panel) return;
  const progressStore = window.ElementleArchiveProgress;
  const status = document.querySelector('#archive-status');
  let data = progressStore.read().snapshot || { dates: [], progress: {} };
  let month = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const first = new Date(2026, 6, 1);
  let requestId = 0;
  let availabilityVerified = false, usableSnapshot = false, verificationState = 'checking';
  let inFlight = null;
  function usableCache(entry) {
    return Boolean(entry.snapshot && entry.snapshotAt && Date.now()-entry.snapshotAt >= 0 && Date.now()-entry.snapshotAt < 300000 && new Date(entry.snapshotAt).toDateString() === new Date().toDateString());
  }
  async function fetchSnapshot(date, token) {
    const owner = token || localStorage.getItem('elementle_guest_id');
    const key = owner + ':' + date;
    if (inFlight?.key === key) return inFlight.promise;
    const promise = fetch('/api/practice/archives?localDate=' + date, {
      cache:'no-store',
      headers:{'X-Guest-ID':localStorage.getItem('elementle_guest_id'),...(token?{Authorization:'Bearer '+token}:{})},
      signal:typeof AbortSignal !== 'undefined' ? AbortSignal.timeout(12000) : undefined
    }).then(async response => ({response,snapshot:await response.json()}));
    inFlight={key,promise};
    try {return await promise;} finally {if(inFlight?.promise===promise)inFlight=null;}
  }
  function render() {
    const today = new Date();
    const todayInt = String(today.getFullYear()*10000 + (today.getMonth()+1)*100 + today.getDate());
    const last = new Date(today.getFullYear(), today.getMonth(), 1);
    const current = progressStore.merge(data);
    const available = new Set(current.dates.map(String));
    document.querySelector('#archive-month').textContent = month.toLocaleDateString(window.ElementleI18n?.locale, { month: 'long', year: 'numeric' });
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
      const candidate = date < todayInt && date >= ARCHIVE_START_DATE;
      const confirmedDate = available.has(date) && !(current.archiveCutoff && Number(date) >= current.archiveCutoff);
      const playable = candidate && confirmedDate && (availabilityVerified || usableSnapshot);
      const checking = candidate && !playable && !availabilityVerified && verificationState === 'checking';
      const unverified = candidate && !playable && verificationState === 'error';
      button.disabled = !isToday && !playable;
      button.className = isToday ? 'today' : [progress || '',playable?'archive-available':'',checking?'archive-checking':'',unverified?'archive-unverified':''].filter(Boolean).join(' ');
      button.title = isToday ? 'Play today’s daily puzzle' : playable ? 'Play archived puzzle' : date < ARCHIVE_START_DATE ? 'Archives start July 25, 2026' : date > todayInt ? 'Future date' : checking ? 'Checking archive availability…' : unverified ? 'Availability could not be checked. Retry below.' : current.archiveCutoff && Number(date) >= current.archiveCutoff ? 'This day has not ended in every timezone yet' : 'No saved archive puzzle for this date';
      if (isToday) button.setAttribute('aria-current', 'date');
      button.setAttribute('aria-label', `${month.toLocaleDateString(window.ElementleI18n?.locale, { month: 'long', year: 'numeric' })} ${n}${isToday ? ', today — daily puzzle' : ''}${progress ? ', ' + progress : ''}, ${button.title}`);
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
    verificationState = 'checking';
    const entry = progressStore.read();
    usableSnapshot = usableCache(entry);
    panel.setAttribute('aria-busy','true');
    status.classList?.add('stats-loading-indicator');
    // Restore the newest local markers first, including when restored from the back/forward cache.
    data = progressStore.read().snapshot || { dates: [], progress: {} };
    status.textContent = usableSnapshot ? 'Updating archive availability…' : 'Checking archive availability…';
    render();
    try {
      if (id !== requestId) return;
      const cached = progressStore.read();
      if (usableCache(cached)) {
        data = cached.snapshot;
        availabilityVerified = true;
        verificationState='ready';
        render();
        status.textContent = '';
        return;
      }
      const today = new Date();
      const date = today.getFullYear()*10000 + (today.getMonth()+1)*100 + today.getDate();
      const token = localStorage.getItem('elementle_token');
      const {response,snapshot} = await fetchSnapshot(date, token);
      if (id !== requestId) return;
      if (!response.ok) throw new Error(snapshot.error || 'Unable to load archives');
      data = snapshot;
      availabilityVerified = true;
      verificationState='ready';
      usableSnapshot=true;
      progressStore.cache(snapshot);
      render();
      status.textContent = '';
    } catch (error) {
      if (id === requestId) {
        verificationState='error';render();
        status.textContent=usableSnapshot?'Showing recently checked archives. Update failed. ': 'Could not check archive availability. ';
        const retry=document.createElement('button');retry.type='button';retry.className='archive-retry';retry.textContent='Retry';retry.addEventListener('click',refresh);status.append(retry);
      }
    } finally {
      if (id === requestId) {status.classList?.remove('stats-loading-indicator');panel.setAttribute('aria-busy','false');window.dispatchEvent(new Event('elementle:archives-ready'));}
    }
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
  window.addEventListener('hashchange', () => {if(location.hash === '#lab-archives')refresh();});
  window.addEventListener('elementle:auth-change', refresh);
  window.addEventListener('elementle:archive-progress', render);
  window.addEventListener('storage', event => {
    if (event.key === 'elementle_token' || event.key === 'elementle_guest_id' || event.key?.startsWith(progressStore.prefix)) refresh();
  });
  refresh();
})();

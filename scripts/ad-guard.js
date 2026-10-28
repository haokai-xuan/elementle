// Embedded before the static Mediavine tag. Membership checks happen after DOM
// readiness; unknown signed-in visitors start with all ads disabled.
(() => {
  const state = document.querySelector('meta[name="elementle-ad-state"]');
  const KEY = 'elementle_ad_session_v1', TRANSITION = 'elementle_ad_migration_v1';
  let token = null, saved = null, storageAvailable = true;
  try {
    token = localStorage.getItem('elementle_token');
    saved = JSON.parse(localStorage.getItem(KEY) || 'null');
  } catch { storageAvailable = false; }
  const expiry = Number(state?.dataset.sessionExpires || 0);
  const verified = state?.dataset.sessionVerified === '1' && expiry > Date.now();
  const matches = storageAvailable && (token
    ? saved?.token === token && saved.id === state?.dataset.sessionId
    : state?.content === 'guest');
  const allowed = matches && (!token || (verified && state?.content === 'free' && saved?.isLab === false));
  function block() {
    let settings = document.getElementById('mediavine-settings');
    if (!settings) {
      settings = document.createElement('meta');
      settings.id = 'mediavine-settings';
      document.head.append(settings);
    }
    settings.setAttribute('data-blocklist-all', '1');
  }
  if (!allowed) block();
  const enabled = !document.getElementById('mediavine-settings');
  const consistent = state?.content !== 'free' || allowed;
  let pending = Promise.resolve(), syncedToken = matches && consistent && (verified || !token) ? token : undefined;
  let expiresAt = verified && matches ? expiry : 0, timer = null, latest = null;
  const api = { enabled, state: state?.content, sync };
  window.ElementleAds = api;
  function schedule(delay) {
    if (!window.setTimeout) return;
    window.clearTimeout(timer);
    timer = window.setTimeout(() => refresh(), Math.max(1000, delay));
  }
  function sync(force = false) {
    const task = pending.catch(() => {}).then(async () => {
      const auth = localStorage.getItem('elementle_token');
      if (!force && auth === syncedToken && (!auth || expiresAt > Date.now())) return auth;
      const response = await fetch('/api/ad-session', {
        method: auth ? 'POST' : 'DELETE', credentials: 'same-origin', cache: 'no-store',
        headers: auth ? { Authorization: 'Bearer ' + auth } : {},
        signal: typeof AbortSignal !== 'undefined' ? AbortSignal.timeout(15000) : undefined
      });
      if (!response.ok) { expiresAt = 0; throw new Error('Unable to synchronize advertising membership'); }
      if (auth) {
        const data = await response.json();
        if (!/^[a-f0-9]{64}$/.test(data.sessionId) || typeof data.isLab !== 'boolean' || !Number.isFinite(data.expiresAt)) throw new Error('Invalid advertising session');
        // Discard a result for an account that changed while the request was in flight.
        if (auth !== localStorage.getItem('elementle_token')) { syncedToken = undefined; expiresAt = 0; return auth; }
        localStorage.setItem(KEY, JSON.stringify({ token: auth, id: data.sessionId, isLab: data.isLab }));
        expiresAt = data.expiresAt;
        latest = data;
        api.state = data.isLab ? 'blocked' : 'free';
        schedule(expiresAt - Date.now());
      } else {
        localStorage.removeItem(KEY);
        latest = null;
        api.state = 'guest';
      }
      syncedToken = auth;
      return auth;
    });
    pending = task;
    return task;
  }
  function reloadOnce(auth, desired) {
    // If cookies are blocked, the next page remains ad-free without a reload loop.
    try {
      const key = JSON.stringify([auth, desired]);
      if (sessionStorage.getItem(TRANSITION) === key) return;
      sessionStorage.setItem(TRANSITION, key);
      location.reload();
    } catch { /* Storage unavailable: leave the page ad-free. */ }
  }
  function refresh(force = false) {
    if (!storageAvailable) return;
    sync(force).then(auth => {
      if (auth !== localStorage.getItem('elementle_token')) return;
      const desired = !auth || (latest && !latest.isLab && latest.expiresAt > Date.now());
      if (Boolean(desired) !== enabled) {
        if (!desired) block();
        // Reusing the already-executed wrapper is not a documented Mediavine API.
        // One reload applies the new settings to the normal static wrapper.
        reloadOnce(auth, Boolean(desired));
      }
    }).catch(() => {
      syncedToken = undefined; expiresAt = 0; latest = null; api.state = 'blocked';
      // Even if a network failure prevents receiving the replacement cookie,
      // the next page must not trust its previous cached-free browser marker.
      try { localStorage.removeItem(KEY); } catch {}
      block();
      if (enabled) reloadOnce(token, false);
      schedule(30000);
    });
  }
  try { if (allowed || (matches && verified && state?.content === 'blocked')) sessionStorage.removeItem(TRANSITION); } catch {}
  function ready() {
    if (!matches || (token && (!verified || !consistent))) refresh();
    else if (token) schedule(expiry - Date.now());
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready, { once: true });
  else ready();
  window.addEventListener('pageshow', event => { if (event.persisted) location.reload(); });
  window.addEventListener('focus', () => {
    if (token && expiresAt <= Date.now()) refresh();
  });
  window.addEventListener('elementle:lab-change', event => {
    // A verified upgrade or Stripe return must supersede a cached free status.
    if (event.detail?.isLab && enabled) { block(); refresh(true); }
  });
  window.addEventListener('storage', event => {
    if (event.key === 'elementle_lab_revision') refresh(true);
  });
})();

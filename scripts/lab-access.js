(() => {
  let sequence = 0, adsLoaded = Boolean(window.ElementleAds?.enabled), gate = null, previousFocus = null;
  const lockedNodes = new Map();
  const token = () => localStorage.getItem('elementle_token');
  const CACHE_KEY = 'elementle_lab_status_v1', CACHE_MS = 30000;
  let pending = null;
  const api = { status: null, ready: null, loading: false, refresh, checkResponse, consumeGame, requireLogin };
  function clearCache() {
    try { sessionStorage.removeItem(CACHE_KEY); } catch {}
  }
  function cachedStatus(auth, allowStale = false) {
    try {
      const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY) || 'null');
      if (window.ElementleAds?.state === 'free' && cached?.status?.isLab) return null;
      if (cached?.auth !== auth || typeof cached.status?.isLab !== 'boolean' || (billingPage && cached.status.accessOnly)) return null;
      const now = Date.now(), status = cached.status;
      const end = status.status === 'past_due' ? status.paymentGraceUntil : status.status === 'trialing' ? status.trialEnd : status.currentPeriodEnd;
      if (status.isLab && end && end * 1000 <= now) return null;
      const checkedAt = cached.checkedAt ?? cached.expires - CACHE_MS;
      if (cached.expires > now || (allowStale && now >= checkedAt && now - checkedAt < 300000)) return status;
    } catch {}
    return null;
  }
  function saveStatus(auth, status) {
    let expires = Date.now() + CACHE_MS;
    const end = status.status === 'past_due' ? status.paymentGraceUntil : status.status === 'trialing' ? status.trialEnd : status.currentPeriodEnd;
    if (status.isLab && end) expires = Math.min(expires, end * 1000);
    try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({auth, status, expires, checkedAt:Date.now()})); } catch {}
  }
  function useLocalStatus() {
    if (pending) return pending.promise;
    const auth = token();
    api.status = auth ? cachedStatus(auth) : {isLab:false,status:'none',trialEligible:true,canManage:false};
    document.documentElement.dataset.lab = api.status ? (api.status.isLab ? 'active' : 'free') : 'unknown';
    api.ready = Promise.resolve(api.status);
    if (api.status) window.dispatchEvent(new CustomEvent('elementle:lab-change', {detail:api.status}));
    return api.ready;
  }
  function consumeGame(data) {
    const capacity = data?.streakFreezes?.capacity;
    const auth = token();
    if (!auth || ![1,2].includes(capacity) || pending) return;
    const isLab = capacity === 2;
    const status = api.status && api.status.isLab === isLab ? api.status : {isLab,status:isLab?'active':'none',accessOnly:true};
    api.status = status;
    saveStatus(auth, status);
    api.ready = Promise.resolve(status);
    document.documentElement.dataset.lab = isLab ? 'active' : 'free';
    window.dispatchEvent(new CustomEvent('elementle:lab-change', {detail:status}));
  }
  function checkIfNeeded(force = false) {
    return (dailyMain || passiveStats) && !gatedFeature() ? useLocalStatus() : refresh(force, !force);
  }
  function checkResponse(response) {
    if (response.status === 401 && !token()) { requireLogin(); return; }
    if (response.status !== 402) return;
    clearCache();
    api.status = null;
    document.documentElement.dataset.lab = 'unknown';
    refresh().then(updatePage).catch(updatePage);
    updatePage();
  }
  window.ElementleLab = api;
  const stylesheet = document.createElement('link');
  stylesheet.rel = 'stylesheet';
  stylesheet.href = '/styles/lab-access.css';
  document.head.append(stylesheet);
  function gatedFeature() {
    const mode = new URLSearchParams(location.search).get('mode');
    const path = location.pathname.replace(/\/+$/, '') || '/';
    if (path === '/vault' || path.startsWith('/vault/')) return 'vault';
    if (path === '/analysis') return 'analysis';
    if (path === '/game-history' && !token()) return 'account';
    if (['/', '/index.html'].includes(path) && ['archive', 'freeplay'].includes(mode)) return mode;
    return null;
  }
  function removeGate() {
    if (!gate) return;
    gate.remove();
    gate = null;
    for (const [node, inert] of lockedNodes) node.inert = inert;
    lockedNodes.clear();
    document.body.classList.remove('lab-access-locked');
    if (previousFocus?.isConnected && !previousFocus.closest('[inert]')) previousFocus.focus({ preventScroll: true });
    previousFocus = null;
  }
  function requireLogin(returnTo = location.pathname + location.search + location.hash) {
    if (token()) return false;
    showGate('account', 'login', returnTo);
    return true;
  }
  function showGate(feature, state = 'required', returnTo = location.pathname + location.search + location.hash) {
    if (state === 'required' && !token()) state = 'login';
    if (!gate) {
      previousFocus = document.activeElement;
      gate = document.createElement('div');
      gate.className = 'lab-access-gate';
      gate.innerHTML = `<section class="lab-access-box" role="dialog" aria-modal="true" aria-labelledby="lab-access-title" aria-describedby="lab-access-description" tabindex="-1">
        <img src="/images/lab_icon-216.webp" width="64" height="64" alt="">
        <p class="lab-access-eyebrow">ELEMENTLE LAB</p>
        <h2 id="lab-access-title"></h2><p id="lab-access-description"></p>
        <a class="lab-access-subscribe" href="/lab">Explore Elementle Lab →</a>
        <button class="lab-access-retry" type="button" hidden>Retry membership check</button>
        <a class="lab-access-back" href="/">Back to game</a>
      </section>`;
      for (const node of document.body.children) {
        if (node.tagName === 'SCRIPT') continue;
        lockedNodes.set(node, node.inert);
        node.inert = true;
      }
      document.body.append(gate);
      document.body.classList.add('lab-access-locked');
      gate.querySelector('.lab-access-retry').addEventListener('click', () => {
        showGate(feature, 'checking');
        refresh(true).then(updatePage).catch(updatePage);
      });
      gate.addEventListener('keydown', event => {
        if (event.key !== 'Tab') return;
        const controls = [...gate.querySelectorAll('a, button')].filter(node => !node.hidden && !node.disabled);
        const first = controls[0], last = controls.at(-1);
        if (event.shiftKey && (document.activeElement === first || document.activeElement === gate.querySelector('.lab-access-box'))) {
          event.preventDefault(); last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault(); first.focus();
        }
      });
      gate.querySelector('.lab-access-box').focus({ preventScroll: true });
    }
    const labels = { vault: 'The Vault', analysis: 'elBot game analysis', archive: 'Lab archives', freeplay: 'Freeplay' };
    gate.dataset.state = state;
    gate.querySelector('#lab-access-title').textContent = state === 'checking' ? 'Checking your Lab access…' : state === 'error' ? 'Unable to verify membership' : state === 'login' ? 'Sign in' : 'A Lab subscription is required';
    gate.querySelector('.lab-access-box').setAttribute('aria-busy', String(state === 'checking'));
    gate.querySelector('#lab-access-description').textContent = state === 'checking' ? 'Your membership will be verified in a moment.' : state === 'error' ? 'We couldn’t check your subscription. Retry to access this feature.' : state === 'login' ? 'Sign in to access this feature.' : `${labels[feature]}: included with Elementle Lab. Subscribe to unlock this feature and more.`;
    const action = gate.querySelector('.lab-access-subscribe');
    action.textContent = state === 'login' ? 'Log in' : 'Explore Elementle Lab →';
    action.href = state === 'login' ? '/account?returnTo=' + encodeURIComponent(returnTo) : '/lab?feature=' + encodeURIComponent(feature);
    action.hidden = !['required', 'login'].includes(state);
    gate.querySelector('.lab-access-retry').hidden = state !== 'error';
    const back = gate.querySelector('.lab-access-back');
    back.href = feature === 'archive' && location.pathname.startsWith('/stats') ? '/stats' : '/';
    back.textContent = back.href.endsWith('/stats') ? 'Back to stats' : 'Back to game';
  }
  function refresh(force = false, useCache = false) {
    const auth = token();
    // A forced Stripe refresh supersedes an ordinary database check.
    if (pending?.auth === auth && (!force || pending.force)) return pending.promise;
    const version = ++sequence;
    const cached = !force && useCache && auth ? cachedStatus(auth) : null;
    // Apply cached access before rendering. Recently checked access can remain
    // visible during revalidation; protected API requests still authorize it.
    if (useCache || force) {
      api.status = cached || (!force && !billingPage && auth ? cachedStatus(auth, true) : null);
      document.documentElement.dataset.lab = api.status ? (api.status.isLab ? 'active' : 'free') : 'unknown';
    }
    api.loading = Boolean(auth && !cached);
    window.dispatchEvent(new CustomEvent('elementle:lab-loading', {detail:{loading:api.loading}}));
    api.ready = (async () => {
      if (!auth) return { isLab: false, status: 'none', trialEligible: true, canManage: false };
      if (cached) return cached;
      const response = await fetch('/api/billing/status' + (force ? '?refresh=1' : ''), {
        headers: { Authorization: 'Bearer ' + auth }, cache: 'no-store',
        signal: typeof AbortSignal !== 'undefined' ? AbortSignal.timeout(force ? 45000 : 12000) : undefined
      });
      if (!response.ok) throw new Error('Unable to verify membership. Please retry.');
      return response.json();
    })().then(status => {
      if (version !== sequence) return api.ready;
      if (auth !== token()) return refresh();
      api.status = status;
      if (auth && !cached) saveStatus(auth, status); else if (!auth) clearCache();
      if (force && auth) {
        try { localStorage.setItem('elementle_lab_revision', Date.now() + ':' + Math.random()); } catch {}
      }
      document.documentElement.dataset.lab = status.isLab ? 'active' : 'free';
      window.dispatchEvent(new CustomEvent('elementle:lab-change', { detail: status }));
      return status;
    });
    const promise = api.ready;
    pending = { auth, force, promise };
    promise.then(() => {
      if (pending?.promise === promise) pending = null;
      if (version === sequence) { api.loading=false; window.dispatchEvent(new CustomEvent('elementle:lab-loading',{detail:{loading:false}})); }
    }, () => {
      if (pending?.promise === promise) pending = null;
      if (version === sequence) {
        clearCache();
        api.status = null;
        document.documentElement.dataset.lab = 'unknown';
        api.loading=false;
        window.dispatchEvent(new CustomEvent('elementle:lab-loading',{detail:{loading:false}}));
      }
    });
    // Consumers can report a failure; logged-in membership failures never load ads.
    api.ready.catch(() => {});
    if (!api.status && document.readyState !== 'loading') updatePage();
    return api.ready;
  }
  const dailyMain = ['/', '/index.html'].includes(location.pathname) && !gatedFeature();
  const passiveStats = ['/stats', '/stats.html'].includes(location.pathname.replace(/\/+$/, ''));
  const billingPage = ['/lab', '/account', '/account.html'].includes(location.pathname.replace(/\/+$/, ''));
  const returningFromStripe = new URLSearchParams(location.search).has('checkout') || new URLSearchParams(location.search).get('billing') === 'return';
  if (dailyMain || passiveStats) useLocalStatus(); else refresh(returningFromStripe, true);
  function updateBadge() {
    document.querySelectorAll('.js-lab-account-status').forEach(node => {
      node.textContent = api.status ? (api.status.isLab ? (api.status.status === 'trialing' ? 'Elementle Lab · Free trial' : 'Elementle Lab member') : 'Free account · Explore Elementle Lab') : 'Elementle Lab';
    });
  }
  async function updatePage() {
    if (!document.body) return;
    const feature = gatedFeature();
    if (!token() && (feature || gate?.dataset.state === 'login')) {
      if (feature) showGate(feature, 'login');
      return;
    }
    if (!feature) removeGate();
    else if (!api.status) showGate(feature, 'checking');
    try {
      const status = api.status || await api.ready;
      if (!status || status !== api.status || feature !== gatedFeature()) return;
      updateBadge();
      if (feature && !status.isLab) {
        showGate(feature);
        return;
      }
      removeGate();
      // Ad delivery is decided before the static wrapper executes. Never add a
      // second wrapper or remove subscriber blocklist settings in a running page.
    } catch {
      updateBadge();
      if (feature && feature === gatedFeature()) showGate(feature, 'error');
    }
  }
  window.addEventListener('elementle:auth-change', () => {
    clearCache();
    api.status = null;
    if (window.ElementleAuthNavigating) return;
    if (window.ElementleAds) {
      window.ElementleAds.sync().then(() => location.reload()).catch(() => location.reload());
      return;
    }
    if (adsLoaded) { location.reload(); return; }
    checkIfNeeded().then(updatePage).catch(() => {});
  });
  window.addEventListener('elementle:lab-change', () => {
    updateBadge();
    if (document.readyState !== 'loading') updatePage();
  });
  window.addEventListener('hashchange', () => { checkIfNeeded().then(updatePage).catch(updatePage); });
  window.addEventListener('pageshow', event => { if (event.persisted) checkIfNeeded(billingPage).then(updatePage).catch(updatePage); });
  window.addEventListener('focus', () => { checkIfNeeded().then(updatePage).catch(updatePage); });
  window.addEventListener('storage', event => {
    if (event.key === 'elementle_token') window.dispatchEvent(new CustomEvent('elementle:auth-change'));
    else if (event.key === 'elementle_lab_revision') { clearCache(); refresh().then(updatePage).catch(updatePage); }
  });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) checkIfNeeded().then(updatePage).catch(updatePage);
  });
  window.setInterval?.(() => {
    if (!dailyMain && !passiveStats && !document.hidden && token()) refresh(false, true).then(updatePage).catch(updatePage);
  }, CACHE_MS);
  document.addEventListener('DOMContentLoaded', updatePage);
})();

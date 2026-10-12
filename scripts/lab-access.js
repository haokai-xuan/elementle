(() => {
  let sequence = 0, adsLoaded = false, gate = null, previousFocus = null;
  const lockedNodes = new Map();
  const token = () => localStorage.getItem('elementle_token');
  const api = { status: null, ready: null, refresh };
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
    if (['/', '/index.html'].includes(path) && ['archive', 'freeplay'].includes(mode)) return mode;
    if (['/stats', '/stats.html'].includes(path) && location.hash === '#lab-archives') return 'archive';
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
  function showGate(feature, state = 'required') {
    if (!gate) {
      previousFocus = document.activeElement;
      gate = document.createElement('div');
      gate.className = 'lab-access-gate';
      gate.innerHTML = `<section class="lab-access-box" role="dialog" aria-modal="true" aria-labelledby="lab-access-title" aria-describedby="lab-access-description" tabindex="-1">
        <img src="/images/lab_icon.png" width="64" height="64" alt="">
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
    gate.querySelector('#lab-access-title').textContent = state === 'checking' ? 'Checking your Lab access…' : state === 'error' ? 'Unable to verify membership' : 'A Lab subscription is required';
    gate.querySelector('#lab-access-description').textContent = state === 'checking' ? 'Your membership will be verified in a moment.' : state === 'error' ? 'We couldn’t check your subscription. Retry to access this feature.' : `${labels[feature]} ${feature === 'archive' ? 'are' : 'is'} included with Elementle Lab. Subscribe to unlock this feature and more.`;
    gate.querySelector('.lab-access-subscribe').href = '/lab?feature=' + encodeURIComponent(feature);
    gate.querySelector('.lab-access-subscribe').hidden = state !== 'required';
    gate.querySelector('.lab-access-retry').hidden = state !== 'error';
    const back = gate.querySelector('.lab-access-back');
    back.href = feature === 'archive' && location.pathname.startsWith('/stats') ? '/stats' : '/';
    back.textContent = back.href.endsWith('/stats') ? 'Back to stats' : 'Back to game';
  }
  function refresh(force = false) {
    const version = ++sequence, auth = token();
    api.ready = (async () => {
      if (!auth) return { isLab: false, status: 'none', trialEligible: true, canManage: false };
      const response = await fetch('/api/billing/status' + (force ? '?refresh=1' : ''), {
        headers: { Authorization: 'Bearer ' + auth }, cache: 'no-store'
      });
      if (!response.ok) throw new Error('Unable to verify membership. Please retry.');
      return response.json();
    })().then(status => {
      if (version !== sequence) return api.ready;
      if (auth !== token()) return refresh();
      api.status = status;
      document.documentElement.dataset.lab = status.isLab ? 'active' : 'free';
      window.dispatchEvent(new CustomEvent('elementle:lab-change', { detail: status }));
      return status;
    });
    // Consumers can report a failure; logged-in membership failures never load ads.
    api.ready.catch(() => {});
    return api.ready;
  }
  refresh();
  function updateBadge() {
    document.querySelectorAll('.js-lab-account-status').forEach(node => {
      node.textContent = api.status ? (api.status.isLab ? (api.status.status === 'trialing' ? 'Elementle Lab · Free trial' : 'Elementle Lab member') : 'Free account · Explore Elementle Lab') : 'Elementle Lab';
    });
  }
  async function updatePage() {
    if (!document.body) return;
    const feature = gatedFeature();
    if (!feature) removeGate();
    else if (!api.status) showGate(feature, 'checking');
    try {
      const status = await api.ready;
      if (status !== api.status || feature !== gatedFeature()) return;
      updateBadge();
      if (feature && !status.isLab) {
        showGate(feature);
        return;
      }
      removeGate();
      if (status.isLab || adsLoaded || location.pathname === '/lab') return;
      adsLoaded = true;
      const script = document.createElement('script');
      script.src = 'https://scripts.mediavine.com/tags/80c3c057-e005-4c3f-a5a4-5b6e721e5808.js';
      script.async = true;
      script.dataset.noptimize = '1'; script.dataset.cfasync = 'false';
      document.head.append(script);
    } catch {
      updateBadge();
      if (feature && feature === gatedFeature()) showGate(feature, 'error');
    }
  }
  window.addEventListener('elementle:auth-change', () => {
    if (adsLoaded) { location.reload(); return; }
    refresh().then(updatePage).catch(() => {});
  });
  window.addEventListener('elementle:lab-change', () => {
    updateBadge();
    if (document.readyState !== 'loading') updatePage();
  });
  window.addEventListener('hashchange', updatePage);
  window.addEventListener('pageshow', event => { if (event.persisted) refresh().then(updatePage).catch(() => {}); });
  document.addEventListener('DOMContentLoaded', updatePage);
})();

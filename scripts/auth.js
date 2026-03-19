(function () {
  const AUTH_API = '/api/auth';
  const TOKEN_KEY = 'elementle_token';

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function setToken(token) {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  }

  function decodeJwtPayload(token) {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length < 2) return null;
    try {
      let b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      while (b64.length % 4) b64 += '=';
      const json = atob(b64);
      return JSON.parse(json);
    } catch {
      return null;
    }
  }

  function getUser() {
    const payload = decodeJwtPayload(getToken());
    if (!payload || !payload.username) return null;
    return { username: payload.username, email: payload.email || '' };
  }

  function updateProfileButton() {
    const user = getUser();
    document.querySelectorAll('.js-profile-avatar, .js-mobile-profile-avatar').forEach((avatar) => {
      if (user) {
        const initial = (user.username || '?').charAt(0).toUpperCase();
        avatar.innerHTML = `<span class="nav-profile-initial">${initial}</span>`;
        avatar.classList.add('nav-profile-initial-wrap');
      } else {
        avatar.innerHTML = '<i class="fa-regular fa-user"></i>';
        avatar.classList.remove('nav-profile-initial-wrap');
      }
    });
  }

  let authOverlayEl = null;

  function ensureAuthOverlay() {
    if (authOverlayEl) return authOverlayEl;
    authOverlayEl = document.createElement('div');
    authOverlayEl.className = 'overlay js-auth-overlay auth-overlay';
    authOverlayEl.setAttribute('aria-hidden', 'true');
    document.body.appendChild(authOverlayEl);
    return authOverlayEl;
  }

  function closeAuth() {
    const el = document.querySelector('.js-auth-overlay');
    if (!el) return;
    if (window.closeModal) {
      window.closeModal(el);
    } else {
      el.classList.remove('show');
      el.addEventListener('transitionend', function () {
        if (!el.classList.contains('show')) el.style.display = 'none';
      }, { once: true });
    }
  }

  function showAuth() {
    const el = ensureAuthOverlay();
    const user = getUser();
    el.style.display = 'flex';
    el.innerHTML = user ? renderAccountPanel(user) : renderAuthForms('login');
    requestAnimationFrame(() => {
      el.classList.add('show');
      if (typeof window.lockBodyScroll === 'function') window.lockBodyScroll();
      if (typeof window.setupFocusTrap === 'function') setTimeout(() => window.setupFocusTrap(el), 20);
    });
    bindAuthEvents(el, user);
  }

  function renderAccountPanel(user) {
    return `
      <div class="modal-card auth-modal">
        <h2 class="modal-title">Account</h2>
        <div class="auth-account-card">
          <div class="auth-account-avatar">${(user.username || '?').charAt(0).toUpperCase()}</div>
          <p class="auth-account-name">${escapeHtml(user.username)}</p>
          <p class="auth-account-email">${escapeHtml(user.email)}</p>
        </div>
        <button type="button" class="auth-btn auth-btn-outline js-auth-logout">Log out</button>
        <button type="button" class="modal-back-button js-auth-close">Close</button>
      </div>`;
  }

  function renderAuthForms(activeTab) {
    const loginActive = activeTab === 'login';
    return `
      <div class="modal-card auth-modal auth-modal-wide">
        <h2 class="modal-title auth-modal-brand">ELEME<span class="green-letter">N</span>TLE</h2>
        <div class="auth-tabs" role="tablist">
          <button type="button" class="auth-tab ${loginActive ? 'is-active' : ''}" data-tab="login" role="tab">Log in</button>
          <button type="button" class="auth-tab ${!loginActive ? 'is-active' : ''}" data-tab="signup" role="tab">Sign up</button>
        </div>
        <div class="auth-panels">
          <form class="auth-panel ${loginActive ? '' : 'is-hidden'}" data-panel="login" autocomplete="on">
            <label class="auth-label">Email</label>
            <input class="auth-input" type="email" name="email" required placeholder="you@example.com" autocomplete="email">
            <label class="auth-label">Password</label>
            <input class="auth-input" type="password" name="password" required placeholder="••••••••" autocomplete="current-password">
            <div class="auth-row-between">
              <p class="auth-error js-auth-error-login" role="alert"></p>
              <button type="button" class="auth-forgot-link js-auth-forgot">Forgot password?</button>
            </div>
            <button type="submit" class="auth-btn auth-btn-primary">Log in</button>
          </form>
          <form class="auth-panel ${loginActive ? 'is-hidden' : ''}" data-panel="signup" autocomplete="on">
            <label class="auth-label">Username</label>
            <input class="auth-input" type="text" name="username" required maxlength="50" placeholder="Choose a username" autocomplete="username">
            <label class="auth-label">Email</label>
            <input class="auth-input" type="email" name="email" required placeholder="you@example.com" autocomplete="email">
            <label class="auth-label">Password</label>
            <input class="auth-input" type="password" name="password" required minlength="6" placeholder="At least 6 characters" autocomplete="new-password">
            <p class="auth-error js-auth-error-signup" role="alert"></p>
            <button type="submit" class="auth-btn auth-btn-primary">Create account</button>
          </form>
          <form class="auth-panel is-hidden" data-panel="reset" autocomplete="off">
            <p class="auth-label">Reset password</p>
            <p class="auth-help-text">
              Enter your account email to request a reset link. We&rsquo;ll email you a link you can use to choose a new password.
            </p>
            <label class="auth-label">Email</label>
            <input class="auth-input" type="email" name="resetEmail" placeholder="you@example.com" autocomplete="email">
            <p class="auth-error js-auth-error-reset" role="alert"></p>
            <button type="button" class="auth-btn auth-btn-primary js-auth-reset-request">Send reset email</button>
          </form>
        </div>
        <button type="button" class="modal-back-button js-auth-close auth-close-muted">Cancel</button>
      </div>`;
  }

  function escapeHtml(s) {
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  function bindAuthEvents(root, loggedIn) {
    root.querySelectorAll('.js-auth-close').forEach((btn) => {
      btn.addEventListener('click', closeAuth);
    });
    root.addEventListener('click', (e) => {
      if (e.target === root) closeAuth();
    });

    if (loggedIn) {
      root.querySelector('.js-auth-logout')?.addEventListener('click', () => {
        setToken(null);
        localStorage.removeItem('guessesList');
        localStorage.removeItem('numberOfGuesses');
        localStorage.removeItem('guessedCorrectly');
        localStorage.removeItem('gameDate');
        localStorage.removeItem('fadeInAppliedList');
        localStorage.removeItem('totalGames');
        localStorage.removeItem('totalWins');
        localStorage.removeItem('currentStreak');
        localStorage.removeItem('maxWinStreak');
        localStorage.removeItem('guessDistribution');
        localStorage.removeItem('lastPlayedDate');
        updateProfileButton();
        closeAuth();
        window.location.reload();
      });
      return;
    }

    root.querySelectorAll('.auth-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        const name = tab.getAttribute('data-tab');
        root.querySelectorAll('.auth-tab').forEach((t) => t.classList.toggle('is-active', t === tab));
        root.querySelectorAll('.auth-panel').forEach((p) => {
          p.classList.toggle('is-hidden', p.getAttribute('data-panel') !== name);
        });
        root.querySelectorAll('.auth-error').forEach((e) => {
          e.textContent = '';
          e.classList.remove('auth-success');
        });
      });
    });

    const loginForm = root.querySelector('form[data-panel="login"]');
    const signupForm = root.querySelector('form[data-panel="signup"]');
    const resetForm = root.querySelector('form[data-panel="reset"]');

    loginForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const errEl = root.querySelector('.js-auth-error-login');
      const btn = loginForm.querySelector('button[type="submit"]');
      errEl.textContent = '';
      const fd = new FormData(loginForm);
      const body = { email: (fd.get('email') || '').trim(), password: fd.get('password') || '' };
      const originalText = btn?.textContent || 'Log in';
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="auth-spinner" aria-hidden="true"></span>Logging in…';
      }
      try {
        const res = await fetch(`${AUTH_API}/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          errEl.textContent = data.error || 'Login failed';
          if (btn) { btn.disabled = false; btn.textContent = originalText; }
          return;
        }
        if (data.token) {
          setToken(data.token);
          updateProfileButton();
          closeAuth();
          if (typeof window.clearEndOfGameUI === 'function') {
            window.clearEndOfGameUI();
          }
          if (typeof window.syncGameStateFromServer === 'function') {
            window.syncGameStateFromServer();
          }
        }
      } catch {
        errEl.textContent = 'Network error';
        if (btn) { btn.disabled = false; btn.textContent = originalText; }
      }
    });

    signupForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const errEl = root.querySelector('.js-auth-error-signup');
      const btn = signupForm.querySelector('button[type="submit"]');
      errEl.textContent = '';
      const fd = new FormData(signupForm);
      const body = {
        username: (fd.get('username') || '').trim(),
        email: (fd.get('email') || '').trim(),
        password: fd.get('password') || ''
      };
      const originalText = btn?.textContent || 'Create account';
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="auth-spinner" aria-hidden="true"></span>Creating account…';
      }
      try {
        const res = await fetch(`${AUTH_API}/signup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          errEl.textContent = data.error || 'Sign up failed';
          if (btn) { btn.disabled = false; btn.textContent = originalText; }
          return;
        }
        root.querySelectorAll('.auth-tab').forEach((t) =>
          t.classList.toggle('is-active', t.getAttribute('data-tab') === 'login')
        );
        root.querySelectorAll('.auth-panel').forEach((p) =>
          p.classList.toggle('is-hidden', p.getAttribute('data-panel') !== 'login')
        );
        signupForm.reset();
        loginForm.querySelector('[name="email"]').value = body.email;
        const loginErr = root.querySelector('.js-auth-error-login');
        loginErr.classList.add('auth-success');
        loginErr.textContent = data.message || 'Check your email to verify your account.';
        if (btn) { btn.disabled = false; btn.textContent = originalText; }
      } catch {
        errEl.textContent = 'Network error';
        if (btn) { btn.disabled = false; btn.textContent = originalText; }
      }
    });

    const forgotBtn = root.querySelector('.js-auth-forgot');
    const resetErrorEl = root.querySelector('.js-auth-error-reset');
    const resetRequestBtn = root.querySelector('.js-auth-reset-request');

    forgotBtn?.addEventListener('click', () => {
      root.querySelectorAll('.auth-tab').forEach((t) => t.classList.remove('is-active'));
      [loginForm, signupForm].forEach((f) => f?.classList.add('is-hidden'));
      resetForm?.classList.remove('is-hidden');
      root.querySelectorAll('.auth-error').forEach((e) => {
        e.textContent = '';
        e.classList.remove('auth-success');
      });
    });

    resetRequestBtn?.addEventListener('click', async () => {
      if (!resetForm) return;
      resetErrorEl.classList.remove('auth-success');
      resetErrorEl.textContent = '';
      const originalText = resetRequestBtn.textContent || 'Send reset email';
      resetRequestBtn.disabled = true;
      resetRequestBtn.innerHTML = '<span class="auth-spinner" aria-hidden="true"></span>Sending…';

      const fd = new FormData(resetForm);
      const email = (fd.get('resetEmail') || '').toString().trim();
      if (!email) {
        resetRequestBtn.disabled = false;
        resetRequestBtn.textContent = originalText;
        resetErrorEl.textContent = 'Enter your email first.';
        return;
      }
      try {
        const res = await fetch(`${AUTH_API}/request-password-reset`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          resetRequestBtn.disabled = false;
          resetRequestBtn.textContent = originalText;
          resetErrorEl.textContent = data.error || 'Could not request reset.';
          return;
        }
        const msg =
          data.message ||
          'If an account exists for that email, reset instructions have been sent.';
        resetRequestBtn.disabled = false;
        resetRequestBtn.textContent = originalText;
        resetErrorEl.classList.add('auth-success');
        resetErrorEl.textContent = msg;
      } catch {
        resetRequestBtn.disabled = false;
        resetRequestBtn.textContent = originalText;
        resetErrorEl.textContent = 'Network error';
      }
    });
  }

  document.querySelectorAll('.js-profile-button').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      if (typeof window.closeMobileNavMenu === 'function') window.closeMobileNavMenu();
      showAuth();
    });
  });

  updateProfileButton();

  const params = new URLSearchParams(window.location.search);
  if (params.get('verified') === '1') {
    history.replaceState(null, '', window.location.pathname);
    showAuth();
    const loginErr = document.querySelector('.js-auth-error-login');
    if (loginErr) {
      loginErr.classList.add('auth-success');
      loginErr.textContent = 'Email verified. You can now log in.';
    }
  }
})();

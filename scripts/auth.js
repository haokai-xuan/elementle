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
    return { username: payload.username, email: payload.email || '', provider: payload.auth_provider || 'password' };
  }

  function updateProfileButton() {
    const user = getUser();
    document.querySelectorAll('.js-profile-avatar, .js-mobile-profile-avatar').forEach((avatar) => {
      if (user) {
        const initial = (user.username || '?').charAt(0).toUpperCase();
        avatar.innerHTML = `<span class="nav-profile-initial">${escapeHtml(initial)}</span>`;
        avatar.classList.add('nav-profile-initial-wrap');
      } else {
        avatar.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" height="22px" viewBox="0 -960 960 960" width="22px" fill="currentColor" aria-hidden="true"><path d="M480-480q-66 0-113-47t-47-113q0-66 47-113t113-47q66 0 113 47t47 113q0 66-47 113t-113 47ZM160-160v-112q0-34 17.5-62.5T224-378q62-31 126-46.5T480-440q66 0 130 15.5T736-378q29 15 46.5 43.5T800-272v112H160Zm80-80h480v-32q0-11-5.5-20T700-306q-54-27-109-40.5T480-360q-56 0-111 13.5T260-306q-9 5-14.5 14t-5.5 20v32Zm240-320q33 0 56.5-23.5T560-640q0-33-23.5-56.5T480-720q-33 0-56.5 23.5T400-640q0 33 23.5 56.5T480-560Zm0-80Zm0 400Z"/></svg>';
        avatar.classList.remove('nav-profile-initial-wrap');
      }
    });
  }

  function showAuth(activeTab) {
    const root = document.querySelector('.js-account-page');
    if (!root) {
      window.location.href = '/account' + (activeTab === 'signup' ? '?tab=signup' : '');
      return;
    }
    const user = getUser();
    root.innerHTML = user ? renderAccountPanel(user) : renderAuthForms(activeTab === 'signup' ? 'signup' : 'login');
    bindAuthEvents(root, user);
  }

  function renderAccountPanel(user) {
    return `
      <div class="page-card auth-modal">
        <h1 class="modal-title">Account</h1>
        <div class="auth-account-card">
          <div class="auth-account-avatar">${escapeHtml((user.username || '?').charAt(0).toUpperCase())}</div>
          <p class="auth-account-name">${escapeHtml(user.username)}</p>
          <p class="auth-account-email">${escapeHtml(user.email)}</p>
        </div>
        ${user.provider !== 'password' ? '<p class="auth-help-text">Sign in with ' + escapeHtml(user.provider === 'google' ? 'Google' : user.provider) + '. This account has no Elementle password to reset.</p>' : ''}
        <button type="button" class="auth-btn auth-btn-outline js-auth-logout">Log out</button>
        <a class="modal-back-button" href="/">Back to game</a>
      </div>`;
  }

  function renderAuthForms(activeTab) {
    const loginActive = activeTab === 'login';
    return `
      <div class="page-card auth-modal auth-modal-wide">
        <h1 class="modal-title">Account</h1>
        <div class="auth-social-buttons" aria-label="Sign in or sign up with Google">
          <a class="auth-btn auth-btn-outline auth-provider-google" href="/api/auth/social/google/start"><svg class="auth-provider-logo" viewBox="0 0 48 48" aria-hidden="true" focusable="false"><path fill="#4285F4" d="M43.61 24.46c0-1.36-.12-2.66-.35-3.92H24v7.42h11a9.4 9.4 0 0 1-4.08 6.16v5h6.61c3.87-3.56 6.08-8.81 6.08-14.66Z"/><path fill="#34A853" d="M24 44c5.51 0 10.13-1.83 13.51-4.96l-6.61-5c-1.83 1.23-4.18 1.97-6.9 1.97-5.32 0-9.84-3.59-11.46-8.42H5.72v5.15A20 20 0 0 0 24 44Z"/><path fill="#FBBC05" d="M12.54 27.59a12 12 0 0 1 0-7.18v-5.15H5.72a20 20 0 0 0 0 17.48l6.82-5.15Z"/><path fill="#EA4335" d="M24 11.99c3 0 5.67 1.03 7.8 3.05l5.85-5.85A19.6 19.6 0 0 0 24 4 20 20 0 0 0 5.72 15.26l6.82 5.15C14.16 15.58 18.68 11.99 24 11.99Z"/></svg><span>Continue with Google</span></a>
        </div>
        <p class="auth-help-text">New here? Continue with Google, then verify your email. Social accounts have no Elementle password.</p>
        <p class="auth-error js-social-error" role="alert"></p>
        <p class="auth-divider">Or use email and password</p>
        <div class="auth-tabs" role="tablist">
          <button type="button" class="auth-tab ${loginActive ? 'is-active' : ''}" data-tab="login" role="tab">Log in</button>
          <button type="button" class="auth-tab ${!loginActive ? 'is-active' : ''}" data-tab="signup" role="tab">Sign up</button>
        </div>
        <div class="auth-panels">
          <form class="auth-panel ${loginActive ? '' : 'is-hidden'}" data-panel="login" autocomplete="on">
            <label class="auth-label" for="auth-emailOrUsername">Email or username</label>
            <input id="auth-emailOrUsername" class="auth-input" type="text" name="emailOrUsername" required placeholder="you@example.com or username" autocomplete="username">
            <label class="auth-label" for="auth-password">Password</label>
            <input id="auth-password" class="auth-input" type="password" name="password" required placeholder="••••••••" autocomplete="current-password">
            <div class="auth-row-between">
              <p class="auth-error js-auth-error-login" role="alert"></p>
              <button type="button" class="auth-forgot-link js-auth-forgot">Forgot password?</button>
            </div>
            <button type="submit" class="auth-btn auth-btn-primary">Log in</button>
          </form>
          <form class="auth-panel ${loginActive ? 'is-hidden' : ''}" data-panel="signup" autocomplete="on">
            <label class="auth-label" for="auth-username">Username</label>
            <input id="auth-username" class="auth-input" type="text" name="username" required maxlength="50" placeholder="Choose a username" autocomplete="username">
            <label class="auth-label" for="auth-email">Email</label>
            <input id="auth-email" class="auth-input" type="email" name="email" required placeholder="you@example.com" autocomplete="email">
            <label class="auth-label" for="auth-signup-password">Password</label>
            <input id="auth-signup-password" class="auth-input" type="password" name="password" required minlength="6" placeholder="At least 6 characters" autocomplete="new-password">
            <p class="auth-error js-auth-error-signup" role="alert"></p>
            <button type="submit" class="auth-btn auth-btn-primary">Create account</button>
          </form>
          <form class="auth-panel is-hidden" data-panel="reset" autocomplete="off">
            <p class="auth-label">Reset password</p>
            <p class="auth-help-text">
              For accounts created with a password, enter your account email to request a reset link. If you joined with Google, use that provider to sign in; password resets are unavailable for those accounts. We&rsquo;ll email you a link you can use to choose a new password.
            </p>
            <label class="auth-label" for="auth-resetEmail">Email</label>
            <input id="auth-resetEmail" class="auth-input" type="email" name="resetEmail" placeholder="you@example.com" autocomplete="email">
            <p class="auth-error js-auth-error-reset" role="alert"></p>
            <button type="button" class="auth-btn auth-btn-primary js-auth-reset-request">Send reset email</button>
          </form>
        </div>
        <a class="modal-back-button" href="/">Back to game</a>
      </div>`;
  }

  function escapeHtml(s) {
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  function looksLikeEmail(s) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
  }

  function bindAuthEvents(root, loggedIn) {
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
      const raw = (fd.get('emailOrUsername') || '').trim();
      const password = fd.get('password') || '';
      // Flask login: email is lowercased server-side; username is case-sensitive (matches DB).
      const body = looksLikeEmail(raw)
        ? { email: raw.toLowerCase(), password }
        : { username: raw, password };
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
          errEl.classList.remove('auth-success');
          errEl.textContent = data.error || 'Login failed';
          if (btn) { btn.disabled = false; btn.textContent = originalText; }
          return;
        }
        if (data.token) {
          setToken(data.token);
          updateProfileButton();
          showAuth();
        }
      } catch {
        errEl.classList.remove('auth-success');
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
          errEl.classList.remove('auth-success');
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
        const loginInput = loginForm.querySelector('[name="emailOrUsername"]');
        if (loginInput && body.email) loginInput.value = body.email;
        const loginErr = root.querySelector('.js-auth-error-login');
        loginErr.classList.add('auth-success');
        loginErr.textContent = data.message || 'Check your email to verify your account.';
        if (btn) { btn.disabled = false; btn.textContent = originalText; }
      } catch {
        errEl.classList.remove('auth-success');
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
        resetErrorEl.classList.remove('auth-success');
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
          resetErrorEl.classList.remove('auth-success');
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
        resetErrorEl.classList.remove('auth-success');
        resetErrorEl.textContent = 'Network error';
      }
    });
  }

  updateProfileButton();

  const params = new URLSearchParams(window.location.search);
  if (document.querySelector('.js-account-page')) showAuth(params.get('tab'));
  if (params.get('verified') === '1') {
    if (!document.querySelector('.js-account-page')) {
      window.location.replace('/account?verified=1');
      return;
    }
    history.replaceState(null, '', window.location.pathname);
    showAuth();
    const loginErr = document.querySelector('.js-auth-error-login');
    if (loginErr) {
      loginErr.classList.add('auth-success');
      loginErr.textContent = 'Email verified. Sign in using the same method you used to create your account.';
    }
  }

  async function finishSocialSignIn() {
    history.replaceState(null, '', window.location.pathname);
    const root = document.querySelector('.js-account-page');
    if (!root) return;
    try {
      const response = await fetch('/api/auth/social/result', { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok || result.error) throw new Error(result.error || 'Sign-in failed.');
      if (result.token) {
        setToken(result.token);
        updateProfileButton();
        showAuth();
        return;
      }
      if (!result.ticket || result.provider !== 'google') throw new Error('Please start sign-in again.');
      const providerName = 'Google';
      root.innerHTML = `
        <div class="page-card auth-modal auth-modal-wide">
          <h1 class="modal-title">Finish signing up with ${providerName}</h1>
          <p class="auth-help-text">Choose your username. We’ll send a verification link to your Google email before activating your account. You’ll sign in with ${providerName} and won’t have an Elementle password to reset.</p>
          <form class="auth-panel js-social-signup">
            <label class="auth-label" for="social-username">Username</label>
            <input class="auth-input" id="social-username" name="username" autocomplete="username" required maxlength="50">
            <p class="auth-help-text">Google email: <strong>${escapeHtml(result.email || '')}</strong></p>
            <p class="auth-error js-social-error" role="alert"></p>
            <button class="auth-btn auth-btn-primary" type="submit">Send verification email</button>
          </form>
          <a class="modal-back-button" href="/account">Back to sign in</a>
        </div>`;
      const form = root.querySelector('form');
      form.addEventListener('submit', async event => {
        event.preventDefault();
        const button = form.querySelector('button');
        const message = form.querySelector('.js-social-error');
        button.disabled = true;
        message.textContent = '';
        try {
          const response = await fetch(`/api/auth/social/${result.provider}/complete`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ticket: result.ticket, username: form.elements.username.value })
          });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || 'Could not complete signup.');
          message.classList.add('auth-success');
          message.textContent = data.message;
          button.textContent = 'Verification email sent';
        } catch (error) {
          message.textContent = error.message || 'Network error. Please try again.';
          button.disabled = false;
        }
      });
    } catch (error) {
      showAuth();
      const message = root.querySelector('.js-social-error');
      if (message) message.textContent = error.message || 'Sign-in failed. Please try again.';
    }
  }
  if (params.get('social') === '1') finishSocialSignIn();
  if (params.get('social_error') === '1') {
    history.replaceState(null, '', window.location.pathname);
    const message = document.querySelector('.js-social-error');
    if (message) message.textContent = 'Could not reach the sign-in service. Please try again.';
  }

  window.getAuthUser = getUser;
})();

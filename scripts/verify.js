(function () {
  const AUTH_API = '/api/auth';

  function getTokenFromURL() {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('token');
    return t ? t.trim() : '';
  }

  const token = getTokenFromURL();
  const statusEl = document.querySelector('.js-verify-status');
  const errorEl = document.querySelector('.js-verify-error');
  const backBtn = document.querySelector('.js-verify-back');

  function showStatus(msg) {
    if (statusEl) statusEl.textContent = msg || '';
  }

  function showError(msg) {
    if (errorEl) {
      errorEl.textContent = msg || '';
      errorEl.classList.remove('auth-success');
    }
  }

  function showSuccess(msg) {
    if (errorEl) {
      errorEl.textContent = msg || '';
      errorEl.classList.add('auth-success');
    }
  }

  function showBackButton() {
    if (backBtn) backBtn.style.display = 'block';
  }

  async function verifyToken() {
    if (!token) {
      showStatus('');
      showError('Invalid or expired verification link.');
      showBackButton();
      return;
    }

    try {
      const res = await fetch(`${AUTH_API}/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        showStatus('');
        showError(data.error || 'Verification failed.');
        showBackButton();
        return;
      }

      showStatus('');
      showSuccess(data.message || 'Email verified. You can now log in.');
      showBackButton();

      setTimeout(() => {
        window.location.href = '/?verified=1';
      }, 1500);
    } catch {
      showStatus('');
      showError('Network error. Please try again.');
      showBackButton();
    }
  }

  backBtn?.addEventListener('click', () => {
    window.location.href = '/';
  });

  verifyToken();
})();

(function () {
  const AUTH_API = '/api/auth';

  function getTokenFromURL() {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('token');
    return t ? t.trim() : '';
  }

  function showError(msg, isSuccess) {
    const el = document.querySelector('.js-reset-error');
    if (!el) return;
    el.textContent = msg || '';
    el.classList.toggle('auth-success', !!isSuccess);
  }

  const token = getTokenFromURL();
  const form = document.getElementById('reset-form');
  const backBtn = document.getElementById('reset-back');

  if (!token) {
    if (form) {
      form.querySelector('button[type=\"submit\"]').disabled = true;
    }
    showError('Invalid or expired reset link.');
  }

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    showError('');
    const fd = new FormData(form);
    const password = (fd.get('password') || '').toString();
    const btn = form.querySelector('button[type="submit"]');

    if (!token) {
      showError('Invalid or expired reset link.');
      return;
    }
    if (!password || password.length < 6) {
      showError('Password must be at least 6 characters.');
      return;
    }

    const originalText = btn?.textContent || 'Update password';
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span class="auth-spinner" aria-hidden="true"></span>Updating…';
    }

    try {
      const res = await fetch(`${AUTH_API}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (btn) { btn.disabled = false; btn.textContent = originalText; }
        showError(data.error || 'Could not reset password.');
        return;
      }
      showError(
        data.message || 'Password updated. You can log in with your new password.',
        true
      );
      if (btn) {
        btn.disabled = true;
        btn.textContent = 'Update password';
      }
    } catch {
      if (btn) { btn.disabled = false; btn.textContent = originalText; }
      showError('Network error. Please try again.');
    }
  });

  backBtn?.addEventListener('click', () => {
    window.location.href = '/';
  });
})();


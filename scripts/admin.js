(() => {
  const $ = id => document.getElementById(id);
  const date = value => value ? new Date(value * 1000).toLocaleString() : 'Lifetime access';
  let users = [], offset = 0, hasMore = false, selected = null, action = 'grant', loading = false;
  const token = () => localStorage.getItem('elementle_token');
  async function api(path, body) {
    const response = await fetch('/api/admin/' + path, {method:body ? 'POST' : 'GET', cache:'no-store', headers:{Authorization:'Bearer ' + token(), ...(body ? {'Content-Type':'application/json'} : {})}, ...(body ? {body:JSON.stringify(body)} : {})});
    const data = await response.json();
    if (response.status === 401 || response.status === 403) document.body.hidden = true;
    if (!response.ok) throw new Error(data.error || 'Unable to complete the request.');
    return data;
  }
  function node(tag, text, className) {
    const el = document.createElement(tag); el.textContent = text;
    if (className) el.className = className;
    return el;
  }
  function button(text, handler) {
    const el = node('button', text); el.type = 'button'; el.addEventListener('click', handler); return el;
  }
  function render() {
    const root = $('admin-users'); root.replaceChildren();
    if (!users.length) root.append(node('p', 'No matching accounts. Ask the user to register and verify their email first.'));
    for (const user of users) {
      const card = node('article', '', 'admin-user');
      card.append(node('h2', user.username), node('p', user.email));
      const access = user.complimentaryActive ? 'Complimentary · ' + (user.complimentaryExpiresAt ? 'ends ' + date(user.complimentaryExpiresAt) : 'lifetime access') : user.isLab ? 'Lab · ' + user.status + ' · ' + (user.plan || 'subscription') : 'Free account';
      card.append(node('p', access, 'admin-badge'));
      if (user.complimentaryGrantedAt) card.append(node('p', 'Grant: ' + date(user.complimentaryGrantedAt) + (user.complimentaryEnded ? ' · Ended' : ''), 'admin-meta'));
      if (user.hasSubscription) card.append(node('p', 'Subscription: ' + user.status + (user.nextBillingDate ? ' · next billing ' + date(user.nextBillingDate) : ''), 'admin-meta'));
      card.append(node('p', 'Last Lab activity: ' + (user.lastLabActive ? date(user.lastLabActive) : 'None recorded') + ' · Lab requests (30 days): ' + user.labRequests30d + ' · Last daily completed: ' + (user.lastDailyPlayed || 'None'), 'admin-meta'));
      const actions = node('div', '', 'admin-actions');
      actions.append(button(user.complimentaryActive ? 'Change / extend access' : 'Grant access', () => open(user, 'grant')));
      if (user.complimentaryActive) actions.append(button('Revoke grant', () => open(user, 'revoke')));
      actions.append(button('History', () => history(user)));
      card.append(actions); root.append(card);
    }
    $('admin-prev').disabled = offset === 0; $('admin-next').disabled = !hasMore;
    $('admin-page').textContent = 'Page ' + (offset / 50 + 1);
  }
  async function load() {
    if (loading) return;
    loading = true; $('admin-status').textContent = 'Loading accounts…';
    $('admin-search').querySelector('button').disabled = true;
    $('admin-prev').disabled = $('admin-next').disabled = true;
    try {
      const query = new URLSearchParams({q:$('admin-query').value.trim(), filter:$('admin-filter').value, offset:String(offset)});
      const data = await api('users?' + query); users = data.users; hasMore = data.hasMore;
      render(); $('admin-status').textContent = users.length + (users.length === 1 ? ' account shown.' : ' accounts shown.');
    } catch (error) { $('admin-status').textContent = error.message; $('admin-users').replaceChildren(); }
    finally { loading = false; $('admin-search').querySelector('button').disabled = false; }
  }
  function open(user, nextAction) {
    selected = user; action = nextAction;
    $('access-title').textContent = action === 'revoke' ? 'Revoke complimentary access' : 'Complimentary Lab access';
    $('access-user').textContent = user.username + ' · ' + user.email;
    $('access-current').textContent = action === 'revoke' ? (user.paidAccess ? 'Their paid membership will continue to provide Lab access.' : 'Their Lab access will end immediately. Saved games are preserved.') : 'Choose a new expiry. This replaces the current complimentary expiry.';
    $('access-duration').value = '30'; $('access-date').value = ''; $('access-reason').value = ''; $('billing-ack').checked = false;
    $('access-duration').parentElement.hidden = action === 'revoke'; $('access-date-label').hidden = true;
    if (action === 'grant' && user.complimentaryActive) {
      $('access-duration').value = user.complimentaryExpiresAt ? 'custom' : 'indefinite';
      if (user.complimentaryExpiresAt) { const end = new Date(user.complimentaryExpiresAt * 1000); $('access-date').value = new Date(end.getTime() - end.getTimezoneOffset() * 60000).toISOString().slice(0,16); $('access-date-label').hidden = false; }
    }
    $('billing-warning').hidden = action === 'revoke' || !user.hasSubscription || ['none','canceled','incomplete_expired'].includes(user.status);
    $('access-error').textContent = ''; $('access-save').textContent = action === 'revoke' ? 'Revoke grant' : 'Save access';
    $('access-dialog').showModal();
  }
  async function history(user) {
    $('access-history').textContent = 'Loading…'; $('history-dialog').showModal();
    try {
      const data = await api('users/' + user.id + '/history'); const root = $('access-history'); root.replaceChildren();
      if (!data.history.length) root.append(node('p', 'No access changes recorded.'));
      for (const entry of data.history) {
        const item = node('div', '', 'admin-history-item');
        item.append(node('p', entry.action + ' · ' + (entry.createdAt ? date(entry.createdAt) : entry.created_at) + ' · by ' + entry.actor));
        item.append(node('p', 'Expiry: ' + date(entry.expires_at)));
        if (entry.reason) item.append(node('p', entry.reason));
        root.append(item);
      }
    } catch (error) { $('access-history').textContent = error.message; }
  }
  $('admin-search').addEventListener('submit', event => {event.preventDefault(); offset = 0; load();});
  $('admin-prev').addEventListener('click', () => {offset = Math.max(0, offset - 50); load();});
  $('admin-next').addEventListener('click', () => {offset += 50; load();});
  $('access-duration').addEventListener('change', () => {$('access-date-label').hidden = $('access-duration').value !== 'custom';});
  $('access-cancel').addEventListener('click', () => $('access-dialog').close());
  $('history-close').addEventListener('click', () => $('history-dialog').close());
  $('access-form').addEventListener('submit', async event => {
    event.preventDefault();
    let expiresAt = null;
    if (action === 'grant') {
      const duration = $('access-duration').value;
      if (duration === 'custom') {
        expiresAt = Math.floor(new Date($('access-date').value).getTime() / 1000);
        if (!Number.isFinite(expiresAt) || expiresAt <= Date.now() / 1000) { $('access-error').textContent = 'Choose a future expiry.'; return; }
      } else if (duration !== 'indefinite') expiresAt = Math.floor(Date.now() / 1000) + Number(duration) * 86400;
      if (!$('billing-warning').hidden && !$('billing-ack').checked) { $('access-error').textContent = 'Acknowledge the billing notice before saving.'; return; }
    }
    $('access-save').disabled = true; $('access-cancel').disabled = true; $('access-error').textContent = '';
    try {
      await api('users/' + selected.id + '/access', {action,expiresAt,reason:$('access-reason').value,acknowledgeBilling:$('billing-ack').checked,timezone:Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'});
      $('access-dialog').close(); await load();
    } catch (error) { $('access-error').textContent = error.message; }
    finally { $('access-save').disabled = false; $('access-cancel').disabled = false; }
  });
  (async () => {
    if (!token()) return;
    try { await api('me'); document.body.hidden = false; $('admin-content').hidden = false; await load(); }
    catch { document.body.hidden = true; }
  })();
})();

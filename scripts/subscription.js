(async () => {
  const membership = document.getElementById('lab-membership');
  const message = document.getElementById('lab-message');
  const manage = document.getElementById('lab-manage');
  const plans = document.getElementById('lab-plans');
  const buttons = [...document.querySelectorAll('[data-plan]')];
  let status = null, busy = false;
  function indicate(node, active) {
    node.classList?.toggle('billing-loading', active);
    node.setAttribute?.('aria-busy', String(active));
  }
  window.addEventListener('elementle:lab-loading', event => indicate(membership, event.detail.loading));
  indicate(membership, true);
  function render(data) {
    status = data;
    indicate(membership, false);
    membership.textContent = !localStorage.getItem('elementle_token') ? 'Sign in to start your trial' : data.isLab ? (data.status === 'trialing' ? 'Lab free trial active' : 'Lab membership active') : 'Free account';
    plans.hidden = data.isLab;
    manage.hidden = !data.canManage;
    document.getElementById('lab-disclosure').hidden = data.isLab;
    for (const button of buttons) button.textContent = data.trialEligible ? 'Start 7-day free trial' : 'Subscribe ' + button.dataset.plan;
    for (const caption of document.querySelectorAll('.lab-trial, .lab-trial-highlight')) caption.hidden = !data.trialEligible || data.isLab;
    message.textContent = '';
    const end = data.status === 'trialing' ? data.trialEnd : data.currentPeriodEnd;
    if (data.status === 'past_due' && data.isLab) {
      message.textContent = 'Your payment failed. Lab stays active until ' + new Date(data.paymentGraceUntil * 1000).toLocaleString() + '. Update your payment method before the three-day retry to keep access.';
    } else if (data.isLab && end) {
      const date = new Date(end * 1000).toLocaleDateString(window.ElementleI18n?.locale, {month:'long',day:'numeric',year:'numeric'});
      message.textContent = data.cancelAtPeriodEnd ? 'Your Lab access ends on ' + date + '.' : data.status === 'trialing' ? 'Your free trial ends on ' + date + '. Manage billing below to cancel before your first charge.' : 'Your subscription renews on ' + date + '.';
    } else if (data.status === 'past_due' || data.status === 'unpaid') message.textContent = 'Your payment needs attention. Update your payment method in Manage subscription to restore Lab access.';
    else if (new URLSearchParams(location.search).get('checkout') === 'canceled') message.textContent = 'Checkout canceled. You can choose a plan whenever you’re ready.';
    else if (new URLSearchParams(location.search).has('feature')) message.textContent = 'This feature is included with Elementle Lab. Start your 7-day free trial to unlock it.';
  }
  async function openBilling(endpoint, body, selected) {
    if (busy) return;
    if (!localStorage.getItem('elementle_token')) { sessionStorage.setItem('elementle_lab_return', '1'); location.href = '/account?returnTo=%2Flab'; return; }
    busy = true;
    [...buttons, manage].forEach(button => button.disabled = true);
    message.textContent = 'Opening secure Stripe billing…';
    indicate(message,true);
    if(selected)indicate(selected,true);
    try {
      const response = await fetch('/api/billing/' + endpoint, {method:'POST',
        headers:{'Content-Type':'application/json',Authorization:'Bearer ' + localStorage.getItem('elementle_token')}, body:JSON.stringify(body || {})});
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to open billing.');
      const url = new URL(data.url);
      if (url.protocol !== 'https:' || !['checkout.stripe.com','billing.stripe.com'].includes(url.hostname)) throw new Error('Unexpected billing URL.');
      location.assign(url.href);
    } catch (error) { message.textContent = error.message; }
    finally { busy = false; indicate(message,false); if(selected)indicate(selected,false); [...buttons, manage].forEach(button => button.disabled = false); }
  }
  buttons.forEach(button => button.addEventListener('click', () => openBilling('checkout', {plan:button.dataset.plan, timezone:Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'}, button)));
  manage.addEventListener('click', () => openBilling('portal', null, manage));
  const query = new URLSearchParams(location.search);
  if (query.has('feature')) message.textContent = 'This feature is included with Elementle Lab. Start your 7-day free trial to unlock it.';
  if (query.get('checkout') === 'canceled') message.textContent = 'Checkout canceled. You can choose a plan whenever you’re ready.';
  try {
    const data = await window.ElementleLab.ready;
    render(data);
    if (query.get('checkout') === 'success' && !data.isLab) message.textContent = 'Stripe is confirming your subscription. Refresh this page in a moment to check your membership.';
  } catch (error) { membership.textContent = 'Membership unavailable'; message.textContent = error.message; }
  finally { indicate(membership,false); }
  window.addEventListener('elementle:lab-change', event => { if(!busy)render(event.detail); });
  window.addEventListener('pageshow', async event => {
    if(!event.persisted)return;
    busy=false;
    indicate(message,false);
    [...buttons,manage].forEach(button=>indicate(button,false));
    [...buttons,manage].forEach(button=>button.disabled=false);
    if(status)render(status);else message.textContent='';
    indicate(membership,true);
    try { render(await window.ElementleLab.refresh(true)); }
    catch(error) { membership.textContent='Membership unavailable';message.textContent=error.message; }
    finally { indicate(membership,false); }
  });
})();

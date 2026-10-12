(() => {
  function summary(data) {
    const date = stamp => stamp ? new Date(stamp * 1000).toLocaleString() : '—';
    const statuses = {none:'Free account',trialing:'Free trial active',active:'Active',past_due:data.isLab?'Payment failed · Lab grace period':'Payment failed · Lab suspended',unpaid:'Unpaid · Lab suspended',canceled:'Canceled',incomplete:'Payment incomplete',incomplete_expired:'Checkout expired',paused:'Paused'};
    const method = data.paymentMethod;
    const brand = method?.brand ? method.brand.charAt(0).toUpperCase() + method.brand.slice(1) : method?.type?.replaceAll('_', ' ');
    let methodLabel = method ? (brand || 'Payment method') + (method.last4 ? ' •••• ' + method.last4 : '') : 'No payment method on file';
    if (method?.expMonth && method.expYear) methodLabel += ' · Expires ' + String(method.expMonth).padStart(2,'0') + '/' + method.expYear;
    let note = '';
    if (data.cancelAtPeriodEnd && data.isLab) note = 'Renewal canceled. Lab access ends on ' + date(data.currentPeriodEnd) + '. Your freeze capacity then returns to one.';
    else if (data.status === 'trialing') note = 'Your trial ends on ' + date(data.trialEnd) + '. Cancel before then to avoid the first charge.';
    if (data.status === 'past_due' || data.status === 'unpaid') note = data.isLab ? 'Lab stays active until ' + date(data.paymentGraceUntil) + '. Stripe retries after three days. Update your payment method to avoid losing access.' : 'Lab access is suspended. Update your payment method and settle the outstanding invoice in Manage billing to restore access.';
    return {status:statuses[data.status] || 'Membership unavailable',plan:data.plan === 'monthly'?'Monthly · $1.99 USD/month':data.plan === 'yearly'?'Yearly · $17.99 USD/year':'No subscription',next:data.nextBillingDate?date(data.nextBillingDate):'No upcoming renewal',method:methodLabel,note};
  }
  window.ElementleBilling = { summary };
  function section() { return document.querySelector('.account-billing'); }
  let loading = false, portalOpening = false;
  function canManage(data) {
    const subscribed = data.isLab || ['trialing', 'active', 'past_due', 'unpaid', 'incomplete', 'paused', 'canceled'].includes(data.status);
    return Boolean(subscribed && data.canManage !== false);
  }
  function render(data) {
    const root = section();
    if (!root || !localStorage.getItem('elementle_token')) return;
    const fields = summary(data);
    for (const [name, value] of Object.entries(fields)) root.querySelector('[data-billing="'+name+'"]').textContent = value;
    root.querySelectorAll('[data-billing-action]').forEach(button => {
      if (button.dataset.billingAction !== 'refresh') {
        button.hidden = false;
        button.disabled = portalOpening || !canManage(data);
        button.title = canManage(data) ? '' : 'Subscribe to Elementle Lab to manage billing.';
      }
    });
  }
  async function refresh() {
    if (!section() || !localStorage.getItem('elementle_token') || loading) return;
    loading = true;
    try { render(await window.ElementleLab.refresh(true)); }
    catch { const root=section();if(root){root.querySelector('[data-billing="status"]').textContent='Billing unavailable';root.querySelector('[data-billing="note"]').textContent='Unable to load billing details. Try Refresh billing details in a moment.';} }
    finally { loading=false; }
  }
  document.addEventListener('click', async event => {
    const button = event.target.closest?.('[data-billing-action]');
    if (!button || !section() || button.disabled || portalOpening) return;
    if (button.dataset.billingAction === 'refresh') { await refresh(); return; }
    const auth=localStorage.getItem('elementle_token');
    if (!auth) return;
    portalOpening=true;
    section().querySelectorAll('[data-billing-action]').forEach(action => { if(action.dataset.billingAction !== 'refresh') action.disabled=true; });
    try {
      const response=await fetch('/api/billing/portal',{method:'POST',headers:{Authorization:'Bearer '+auth,'Content-Type':'application/json'},body:JSON.stringify(button.dataset.billingAction==='payment_method_update'?{flow:'payment_method_update'}:{})});
      const result=await response.json();
      if(!response.ok)throw new Error(result.error||'Unable to open billing.');
      const url=new URL(result.url);
      if(url.protocol!=='https:'||url.hostname!=='billing.stripe.com')throw new Error('Unexpected billing URL.');
      location.assign(url.href);
    } catch(error){ if(section())section().querySelector('[data-billing="note"]').textContent=error.message; }
    finally{portalOpening=false;if(window.ElementleLab?.status)render(window.ElementleLab.status);else button.disabled=false;}
  });
  window.addEventListener('elementle:lab-change',event=>render(event.detail));
  window.addEventListener('elementle:account-render',()=>{
    if(window.ElementleLab?.status)render(window.ElementleLab.status);
    refresh();
  });
  window.addEventListener('pageshow',event=>{if(event.persisted){portalOpening=false;if(window.ElementleLab?.status)render(window.ElementleLab.status);refresh();}});
  if(window.ElementleLab?.status)render(window.ElementleLab.status);
  refresh();
})();

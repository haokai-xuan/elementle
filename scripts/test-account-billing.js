const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const events={}, clicks={}, values={}, buttons=[{dataset:{billingAction:'manage'},hidden:true},{dataset:{billingAction:'payment_method_update'},hidden:true}];
const root={querySelector(selector){return values[selector] ||= {textContent:''};},querySelectorAll(){return buttons;}};
let authenticated=false, request=null, redirect=null;
const window={addEventListener(name,fn){events[name]=fn;}};
vm.runInNewContext(fs.readFileSync(__dirname+'/account-billing.js','utf8'),{
  window,Date,URL,console,
  document:{querySelector:()=>authenticated?root:null,addEventListener(name,fn){clicks[name]=fn;}},
  localStorage:{getItem:()=>authenticated?'jwt':null},
  location:{assign:url=>redirect=url},
  fetch:async(url,options)=>{request={url,options};return {ok:true,json:async()=>({url:'https://billing.stripe.com/test'})};}
});
const summary=window.ElementleBilling.summary;
const active={status:'active',isLab:true,plan:'monthly',nextBillingDate:1900000000,canManage:true,paymentMethod:{type:'card',brand:'visa',last4:'4242',expMonth:12,expYear:2030}};
assert.match(summary(active).status,/Active/);assert.match(summary(active).plan,/1.99 USD\/month/);
assert.match(summary(active).method,/Visa •••• 4242.*12\/2030/);assert.doesNotMatch(summary(active).next,/No upcoming/);
assert.match(summary({...active,plan:'yearly'}).plan,/17.99 USD\/year/);
assert.match(summary({...active,cancelAtPeriodEnd:true,nextBillingDate:null,currentPeriodEnd:1900000000}).note,/Renewal canceled/);
assert.equal(summary({...active,status:'canceled',isLab:false,nextBillingDate:null}).next,'No upcoming renewal');
assert.match(summary({...active,status:'past_due',paymentGraceUntil:1900000000}).note,/Lab stays active.*three days/);
assert.match(summary({...active,status:'past_due',isLab:false}).note,/suspended/);
assert.match(summary({status:'none',isLab:false}).method,/No payment/);
authenticated=true;
events['elementle:lab-change']({detail:active});
assert.match(values['[data-billing="method"]'].textContent,/4242/);assert.equal(buttons[1].hidden,false);
assert.equal(buttons[1].disabled,false);
events['elementle:lab-change']({detail:{status:'none',isLab:false,canManage:true}});
assert.equal(buttons[0].hidden,false);assert.equal(buttons[0].disabled,true);
events['elementle:lab-change']({detail:{...active,canManage:undefined}});
assert.equal(buttons[0].disabled,false);
window.ElementleLab={status:active,refresh:async()=>active};
buttons.forEach(button=>button.disabled=true);
events['elementle:account-render']();
assert.equal(buttons[1].disabled,false);
(async()=>{
  const button={dataset:{billingAction:'payment_method_update'},disabled:false};
  await clicks.click({target:{closest:()=>button}});
  assert.equal(request.url,'/api/billing/portal');
  assert.equal(JSON.parse(request.options.body).flow,'payment_method_update');
  assert.equal(request.options.headers.Authorization,'Bearer jwt');
  assert.equal(redirect,'https://billing.stripe.com/test');assert.equal(button.disabled,false);
  console.log('Account status, plan, renewal date, masked method, cancellation/grace copy and authenticated payment-method update pass.');
})().catch(error=>{console.error(error);process.exitCode=1;});

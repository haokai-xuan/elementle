const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
async function scenario(search='') {
  const nodes={},events={},redirects=[];
  const node=id=>nodes[id]||=( {textContent:'',hidden:false,disabled:false,dataset:{},addEventListener(name,fn){this[name]=fn;}} );
  const button=node('monthly');button.dataset.plan='monthly';
  let requests=0;
  const free={status:'none',isLab:false,trialEligible:true,canManage:false};
  const window={ElementleLab:{ready:Promise.resolve(free),refresh:async()=>{requests++;return free;}},addEventListener(name,fn){events[name]=fn;}};
  await vm.runInNewContext(fs.readFileSync(__dirname+'/subscription.js','utf8'),{
    window,URL,URLSearchParams,Date,
    document:{getElementById:node,querySelectorAll:selector=>selector==='[data-plan]'?[button]:[]},
    localStorage:{getItem:()=> 'jwt'},sessionStorage:{setItem(){}},
    location:{search,assign:url=>redirects.push(url)},
    fetch:async(url,options)=>{const body=JSON.parse(options.body);assert.equal(body.timezone,Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');return {ok:true,json:async()=>({url:'https://checkout.stripe.com/test'})};}
  });
  await button.click();
  assert.equal(node('lab-message').textContent,'Opening secure Stripe billing…');
  assert.equal(redirects.length,1);
  await events.pageshow({persisted:true});
  assert.doesNotMatch(node('lab-message').textContent,/Opening secure/);
  assert.equal(button.disabled,false);
  assert.equal(requests,1);
  if(search)assert.match(node('lab-message').textContent,/Checkout canceled/);
}
(async()=>{await scenario();await scenario('?checkout=canceled');console.log('Back-navigation clears Stripe opening message, reenables controls, and refreshes membership.');})().catch(error=>{console.error(error);process.exitCode=1;});

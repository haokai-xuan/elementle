const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {parseHTML} = require('linkedom');
const tick = () => new Promise(resolve => setImmediate(resolve));
async function setup(isAdmin = true) {
  const {window,document} = parseHTML(fs.readFileSync(__dirname + '/../admin.html','utf8'));
  for (const dialog of document.querySelectorAll('dialog')) {dialog.showModal=()=>dialog.setAttribute('open','');dialog.close=()=>dialog.removeAttribute('open');}
  const user = {id:3,username:'<img src=x onerror=alert(1)>',email:'paul@example.com',status:'none',complimentaryActive:true,complimentaryGrantedAt:1791924464,complimentaryExpiresAt:1823460464,labRequests30d:5};
  const calls=[];
  const fetch=async(url,options)=>{
    calls.push({url,options});
    if (!isAdmin) return {ok:false,json:async()=>({error:'Administrator access required.'})};
    return {ok:true,json:async()=>url.includes('/history') ? {history:[{action:'import',actor:'admin',created_at:'2026-11-10',expires_at:1823460464,reason:'<script>alert(1)</script>'}]} : url.includes('/users?') ? {users:[user],hasMore:false} : {isAdmin:true}};
  };
  vm.runInNewContext(fs.readFileSync(__dirname+'/admin.js','utf8'),{window,document,localStorage:{getItem:()=> 'token'},fetch,URLSearchParams,Date,Intl,Number,console});
  await tick(); await tick(); return {window,document,calls,user};
}
(async()=>{
  let {document,window,calls}=await setup();
  assert.equal(document.body.hidden,false);
  assert.equal(document.getElementById('admin-content').hidden,false);
  assert.match(document.getElementById('admin-users').textContent,/Complimentary/);
  assert.equal(document.querySelectorAll('#admin-users img').length,0);
  const buttons=document.querySelectorAll('#admin-users button');
  buttons[0].click();assert.ok(document.getElementById('access-dialog').hasAttribute('open'));
  document.getElementById('access-duration').value='indefinite';
  document.getElementById('access-form').dispatchEvent(new window.Event('submit',{cancelable:true}));
  await tick(); await tick();
  const write=calls.find(c=>c.options.method==='POST');assert.ok(write);assert.equal(JSON.parse(write.options.body).expiresAt,null);
  document.querySelectorAll('#admin-users button')[2].click();await tick();
  assert.equal(document.querySelectorAll('#access-history script').length,0);
  ({document}=await setup(false));assert.equal(document.getElementById('admin-content').hidden,true);assert.equal(document.body.hidden,true);
  console.log('Admin: authorization, safe account/history rendering, grant dialog and indefinite grant submission pass.');
})().catch(error=>{console.error(error);process.exitCode=1;});

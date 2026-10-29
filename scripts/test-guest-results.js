const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('./guest-results.js'), 'utf8');
const key = 'elementle_pending_guest_results';
function setup({readyState,gameReady,gameSaved}={}) {
  const saved = new Map(), events = {}, calls = [];
  let status = 200, fail = false;
  const ctx = {
    window:{ElementleGameReady:gameReady,ElementlePendingGameSave:()=>gameSaved,addEventListener:(name,fn)=>{events[name]=fn;}},
    document:{readyState,hidden:false,addEventListener:(name,fn)=>{events[name]=fn;}},
    localStorage:{getItem:key=>saved.get(key) || null,setItem:(key,value)=>saved.set(key,value)},
    AbortSignal,
    fetch:async(url,options)=>{ calls.push({url,options}); if (fail) throw Error('Offline'); return {ok:status===200,status}; }
  };
  vm.runInNewContext(source,ctx);
  return {ctx,saved,events,calls,setStatus:value=>{status=value;},setFail:value=>{fail=value;},api:ctx.window.ElementleGuestResults};
}
const tick = () => new Promise(resolve=>setImmediate(resolve));
(async()=>{
  const guestId = '8e505dbd-339b-4d93-9471-3a88c2efea37';
  const body = {mode:'daily',localDate:'20261009',guesses:[1,26],hintUsed:true,hintAt:1};
  let ready,save;
  const delayed=setup({readyState:'interactive',gameReady:new Promise(resolve=>ready=resolve),gameSaved:new Promise(resolve=>save=resolve)});
  delayed.api.record(guestId,body);
  await tick();assert.equal(delayed.calls.length,0);
  delayed.events.DOMContentLoaded();await tick();assert.equal(delayed.calls.length,0);
  ready(true);await tick();assert.equal(delayed.calls.length,0);
  save();await tick();assert.equal(delayed.calls.length,1);
  assert.deepEqual(JSON.parse(delayed.saved.get(key)),{});
  // DOMContentLoaded does not need to fire again when a later result is queued.
  delayed.api.record(guestId,body);await tick();assert.equal(delayed.calls.length,2);
  const unavailable=setup({gameReady:Promise.resolve(false)});
  unavailable.api.record(guestId,body);await tick();assert.equal(unavailable.calls.length,0);
  assert.equal(Object.keys(JSON.parse(unavailable.saved.get(key))).length,1);
  const t=setup(); t.setFail(true);
  t.api.record(guestId,body);await tick();
  assert.equal(Object.keys(JSON.parse(t.saved.get(key))).length,1);
  t.setFail(false);t.setStatus(500);
  await t.api.flush();
  assert.equal(Object.keys(JSON.parse(t.saved.get(key))).length,1);
  t.setStatus(200);await t.events.online();
  assert.deepEqual(JSON.parse(t.saved.get(key)),{});
  const request=t.calls.at(-1);
  assert.equal(request.url,'/api/game/guest-result');
  assert.equal(request.options.headers['X-Guest-ID'],guestId);
  assert.equal(request.options.headers.Authorization,undefined);
  assert.deepEqual(JSON.parse(request.options.body),body);
  for (const status of [400,404,409]) {
    t.setStatus(status);t.api.record(guestId,body);await tick();
    assert.deepEqual(JSON.parse(t.saved.get(key)),{});
  }
  const main = fs.readFileSync(require.resolve('./elementle.js'),'utf8');
  const queueCalls = [];
  const ctx = vm.createContext({practice:true, getAuthToken:()=>'',getTodayDateInt:()=>20261009,
    guestId,guessesList:[{atomicNumber:1},{atomicNumber:26}],gameStorage:{getItem:name=>name.startsWith('hintUsedAt')?'1':'true'},
    window:{ElementleGuestResults:{record:(id,body)=>queueCalls.push({id,body})}}});
  vm.runInContext(main.slice(main.indexOf('function submitGuestMainResult('),main.indexOf('let _guessInFlight')),ctx);
  vm.runInContext('submitGuestMainResult()',ctx);assert.equal(queueCalls.length,0);
  ctx.practice=false;ctx.getAuthToken=()=>'token';
  vm.runInContext('submitGuestMainResult()',ctx);assert.equal(queueCalls.length,0);
  ctx.getAuthToken=()=>'';vm.runInContext('submitGuestMainResult()',ctx);
  assert.equal(queueCalls.length,1);
  assert.deepEqual(JSON.parse(JSON.stringify(queueCalls[0].body)),body);
  assert.doesNotMatch(main.slice(main.indexOf('function submitGuestMainResult('),main.indexOf('let _guessInFlight')),/guess_distribution/);
  const index=fs.readFileSync(require.resolve('../index.html'),'utf8');
  assert.ok(index.indexOf('scripts/guest-results.js')<index.indexOf('scripts/elementle.js'));
  console.log('Guest main results: queued retries, original identity, no account auth, terminal errors, and practice/account exclusion pass.');
})().catch(error=>{console.error(error);process.exitCode=1;});

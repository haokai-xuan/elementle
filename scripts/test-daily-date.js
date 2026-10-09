const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('./elementle.js'), 'utf8');
function context() {
  const events = {}, timers = [], intervals = [];
  const hintEvents = {};
  const node = () => ({disabled:false,setAttribute(){},classList:{add(){},remove(){},contains(){return false;}}});
  const hintButton = node();
  hintButton.addEventListener = (event,fn)=>{hintEvents[event]=fn;};
  let today = 20261008, reloads = 0, requests = 0, writes = 0, confirmations = 0;
  const ctx = vm.createContext({practice:false,loadedDailyDate:today,
    dailyReloadPending:false,dailyReadOnly:false,dailyLockReason:null,
    dailyMidnightTimer:null,dailyDateInterval:null,_pendingGuessPromise:null,_gameStateSyncPromise:null,
    inputElement:node(),guessButtonElement:node(),hintButton,hintContainer:node(),cancelHintConfirmation:null,
    window:{location:{reload(){reloads++;}},addEventListener:(event,fn)=>{events[event]=fn;}},
    document:{hidden:false,addEventListener:(event,fn)=>{events[event]=fn;}},
    getTodayDateInt:()=>today,getMysteryElement:()=>({hints:['Example hint']}),
    getHintIndexForToday:()=>0,getAuthToken:()=>'token',numberOfGuesses:1,guessedCorrectly:'true',
    confirmHintInGame:async()=>{confirmations++;return true;},
    gameStorage:{getItem:()=>null,setItem(){writes++;}},
    API_BASE:'/api',fetch:async()=>{requests++;return {ok:true};},requestAnimationFrame:fn=>fn(),
    setTimeout:(fn,ms)=>{timers.push({fn,ms});return timers.length;},clearTimeout(){},
    setInterval:(fn,ms)=>{intervals.push({fn,ms});return intervals.length;},Date,Promise,
    setDailyReadOnly(readOnly,reason){ctx.dailyReadOnly=readOnly;ctx.dailyLockReason=reason;},
    recordVaultDaily(){writes++;},createPopup(message){throw new Error(message);}
  });
  // Load real date detector, timer scheduling, and hint click handler.
  vm.runInContext(source.slice(source.indexOf('function checkDailyDateLock('),source.indexOf('function setDailyReadOnly(')),ctx);
  vm.runInContext(source.slice(source.indexOf('function scheduleMidnightReload('),source.indexOf('async function initializeGame(')),ctx);
  vm.runInContext(source.slice(source.indexOf("hintButton.addEventListener('click'"),source.indexOf('// Let the latest signed-in guess')),ctx);
  return {ctx,events,timers,intervals,hintEvents,setDay:day=>{today=day;},reloads:()=>reloads,
    requests:()=>requests,writes:()=>writes,confirmations:()=>confirmations};
}
(async()=>{
  for (const event of ['focus','pageshow','visibilitychange']) {
    const t=context();
    t.events[event](); assert.equal(t.reloads(),0);
    t.setDay(20261009);t.events[event]();t.events[event]();
    assert.equal(t.reloads(),1);
    assert.ok(t.ctx.inputElement.disabled && t.ctx.guessButtonElement.disabled && t.ctx.hintButton.disabled);
  }
  const timer=context();vm.runInContext('scheduleMidnightReload()',timer.ctx);
  timer.setDay(20261009);timer.timers[0].fn();assert.equal(timer.reloads(),1);
  const poll=context();vm.runInContext('scheduleMidnightReload()',poll.ctx);
  poll.setDay(20261010);poll.intervals[0].fn();assert.equal(poll.reloads(),1);
  const past=context();past.setDay(20261007);past.events.focus();assert.equal(past.reloads(),1);
  const practice=context();practice.ctx.practice=true;practice.setDay(20261009);practice.events.focus();assert.equal(practice.reloads(),0);
  const pending=context();let finish;
  pending.ctx._pendingGuessPromise=new Promise(resolve=>{finish=resolve;});
  pending.setDay(20261009);pending.events.focus();assert.equal(pending.reloads(),0);
  finish();await new Promise(resolve=>setImmediate(resolve));assert.equal(pending.reloads(),1);
  for (const won of [true,false]) {
    const t=context();t.ctx.guessedCorrectly=String(won);t.ctx.numberOfGuesses=won?1:8;
    t.ctx.dailyReadOnly=true;t.ctx.dailyLockReason='completed';
    await t.hintEvents.click({preventDefault(){}});
    assert.equal(t.ctx.hintContainer.textContent,'Example hint');
    assert.equal(t.requests(),0);assert.equal(t.writes(),0);assert.equal(t.confirmations(),0);
  }
  const race=context();race.ctx.guessedCorrectly='false';
  race.ctx.confirmHintInGame=async()=>{race.ctx.guessedCorrectly='true';return true;};
  await race.hintEvents.click({preventDefault(){}});
  assert.equal(race.requests(),0);assert.equal(race.writes(),0);
  assert.equal(race.ctx.hintContainer.textContent,'Example hint');
  const locked=context();locked.ctx.dailyReadOnly=true;locked.ctx.dailyLockReason='past';locked.ctx.guessedCorrectly='false';
  await locked.hintEvents.click({preventDefault(){}});assert.equal(locked.ctx.hintContainer.textContent,undefined);
  const active=context();active.ctx.guessedCorrectly='false';
  await active.hintEvents.click({preventDefault(){}});assert.equal(active.requests(),1);assert.equal(active.writes(),2);
  console.log('Day rollover, wake/focus, clock changes, pending saves and display-only post-game hints pass.');
})().catch(error=>{console.error(error);process.exitCode=1;});

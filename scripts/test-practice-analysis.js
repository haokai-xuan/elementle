const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('./elementle.js'), 'utf8');
const sync = source.slice(source.indexOf('async function flushPracticeQueue()'), source.indexOf('async function loadPractice('));
const syncUI = source.slice(source.indexOf('function updatePracticeSyncUI()'), source.indexOf('function savePracticeQueue()'));
const buttonCode = source.slice(source.indexOf('function displayResults()'), source.indexOf('  let additionalInfoElement', source.indexOf('function displayResults()'))) + '}';
async function run(mode) {
  const nodes = new Map();
  const container = {classList:{add(){}},prepend(button){nodes.set('.js-analysis-button',button);}};
  nodes.set('.correct-guess-container',container);
  nodes.set('.practice-sync',{});
  let acknowledge, calls=0, destination;
  const saved = new Promise(resolve=>{acknowledge=resolve;});
  const context = vm.createContext({
    practice:true,playMode:mode,practiceGame:{id:'saved-round',guesses:[],won:false,completed:false},
    pendingPracticeGuesses:[{guess:118,number:1}],practiceSyncing:false,practiceSyncFailed:false,practiceSyncPromise:null,
    dailyReloadPending:false,
    hintButton:{},hintContainer:{classList:{remove(){}},setAttribute(){}},
    document:{querySelector:selector=>nodes.get(selector),createElement:()=>({addEventListener(name,fn){this[name]=fn;}})},
    location:{assign:url=>{destination=url;}},window:{},
    getTodayDateInt:()=>20261010,savePracticeQueue(){},applyGameStateFromApi(){},createPopup(){},
    practiceRequest:async()=>{calls++;await saved;return {id:'saved-round',guesses:[118],won:true,completed:true};}
  });
  context.hintButton.setAttribute=()=>{};
  vm.runInContext(syncUI+sync+buttonCode,context);
  vm.runInContext('displayResults(); updatePracticeSyncUI()',context);
  const button=nodes.get('.js-analysis-button');
  assert.ok(button,'Completed practice UI offers elBot');
  assert.equal(button.disabled,true,'Analysis waits for the saved terminal game');
  const first=vm.runInContext('flushPracticeQueue()',context);
  const duplicate=vm.runInContext('flushPracticeQueue()',context);
  assert.equal(calls,1,'Concurrent callers share the existing save');
  assert.equal(destination,undefined);
  acknowledge();await Promise.all([first,duplicate]);
  assert.equal(button.disabled,false);
  await button.click();
  assert.equal(destination,'/analysis?gameId=saved-round');
  assert.equal(calls,1);
}
(async()=>{
  await run('freeplay');await run('archive');
  console.log('Practice analysis: final-save gating, concurrent save deduplication, and saved-game navigation pass.');
})().catch(error=>{console.error(error);process.exitCode=1;});

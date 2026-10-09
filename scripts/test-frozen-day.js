const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('./elementle.js'), 'utf8');
const nodes = new Map();
const node = () => ({ disabled:false, attributes:{}, classList:{remove(){},add(){}},
  setAttribute(key,value){this.attributes[key]=value;}, remove(){this.removed=true;} });
const input = node(), guess = node(), hint = node(), container = node();
input.parentElement = {insertAdjacentElement(where, notice){nodes.set('.frozen-day-notice',notice);}};
let requests = 0;
const context = vm.createContext({
  document:{querySelector:selector=>nodes.get(selector),createElement:node,addEventListener(){}},
  inputElement:input,guessButtonElement:guess,hintButton:hint,hintContainer:container,
  cancelHintConfirmation:null,practice:false,dailyReadOnly:false,dailyLockReason:null,
  loadedDailyDate:0,dailyReloadPending:false,_pendingGuessPromise:null,_gameStateSyncPromise:null,
  window:{addEventListener(){}},getTodayDateInt:()=>20261008,
  numberOfGuesses:0,guessedCorrectly:'false',_guessInFlight:false,fetch:()=>{requests++;},console
});
vm.runInContext(source.slice(source.indexOf('function checkDailyDateLock('),source.indexOf('function applyServerGameState(')),context);
vm.runInContext(source.slice(source.indexOf('async function processGuess('),source.indexOf('function invalidGuess(')),context);
(async () => {
  vm.runInContext('setDailyReadOnly(true)',context);
  assert.ok(input.disabled && guess.disabled && hint.disabled);
  assert.equal(container.attributes['aria-hidden'],'true');
  assert.match(nodes.get('.frozen-day-notice').textContent,/freeze.*locked/);
  // Guard the handler even if a user re-enables the input through developer tools.
  input.disabled = false;
  await vm.runInContext('processGuess()',context);
  assert.equal(requests,0);
  for (const reason of ['past', 'completed']) {
    vm.runInContext('setDailyReadOnly(true, ' + JSON.stringify(reason) + ')', context);
    assert.ok(input.disabled && guess.disabled);
    assert.equal(hint.disabled, reason !== 'completed');
    assert.ok(nodes.get('.frozen-day-notice').removed);
    await vm.runInContext('processGuess()', context);
    assert.equal(requests, 0);
  }
  vm.runInContext('setDailyReadOnly(false)',context);
  assert.equal(hint.disabled,false);
  assert.ok(nodes.get('.frozen-day-notice').removed);
  // Initialization must not reopen an empty frozen attempt after applying API state.
  const initialize = source.slice(source.indexOf('async function initializeGame()'),source.indexOf('// This script is loaded'));
  context.getAuthToken = ()=>'token';
  context.setMysteryElementOfTheDay = async ()=>vm.runInContext('setDailyReadOnly(true)',context);
  context.getMysteryElement = ()=>({atomicNumber:26});
  context.scheduleMidnightReload = ()=>{};
  context.numberOfGuesses = 0;
  context.guessedCorrectly = 'false';
  context.createPopup = message=>{throw new Error(message);};
  vm.runInContext(initialize,context);
  await vm.runInContext('initializeGame()',context);
  assert.ok(input.disabled && guess.disabled && hint.disabled);
  console.log('Frozen, past and completed daily controls stay locked during initialization and direct guess handling.');
})().catch(error=>{console.error(error);process.exitCode=1;});

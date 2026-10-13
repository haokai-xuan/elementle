const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(__dirname+'/elementle.js','utf8');
const start=source.indexOf('function savePracticeQueue()');
const functions=source.slice(start,source.indexOf("document.querySelector('.practice-sync')",start));
(async()=>{
  const values=new Map(),calls=[];
  let fail=true,counter=0;
  const context=vm.createContext({
    playMode:'freeplay',playDate:null,practice:true,practiceGame:null,practiceLoadPromise:null,
    pendingPracticeGuesses:[],practiceSyncPromise:null,practiceSyncing:false,practiceSyncFailed:false,
    numberOfGuesses:0,guessedCorrectly:'false',mysteryElementCache:null,
    gameStorage:{getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value)},
    crypto:{randomUUID:()=>`a02b68b0-987e-4381-93ce-e2fced590ab${counter++}`},
    window:{},getTodayDateInt:()=>20261013,getElementFromAtomicNumber:n=>({atomicNumber:n}),
    renderFromLocalCache(){},updateModeUI(){},updatePracticeSyncUI(){},displayResults(){},
    applyGameStateFromApi(){},createPopup(){},
    practiceRequest:async(path,body)=>{
      calls.push({path,body});if(fail)throw Error('Response lost');
      assert.equal(path,'guess');
      return {id:body.gameId,atomic_number:body.freeplay.atomicNumber,guesses:[body.guess],won:true,completed:true,hint_used:false};
    }
  });
  vm.runInContext(functions,context);
  await context.loadPractice();
  assert.equal(calls.length,0);assert.equal(context.practiceGame.draft,true);
  const first={...context.practiceGame};
  assert.ok(first.atomic_number>=1&&first.atomic_number<=118);
  await context.loadPractice();
  assert.equal(calls.length,0);assert.equal(context.practiceGame.id,first.id);
  assert.equal(context.practiceGame.atomic_number,first.atomic_number);
  context.pendingPracticeGuesses=[{guess:first.atomic_number,number:1}];
  context.savePracticeQueue();await context.flushPracticeQueue();
  assert.equal(context.pendingPracticeGuesses.length,1);
  assert.equal(JSON.parse(values.get('practiceSnapshot')).draft,true);
  fail=false;await context.flushPracticeQueue();
  assert.equal(calls.length,2);
  assert.equal(calls[0].body.gameId,calls[1].body.gameId);
  assert.equal(calls[1].body.freeplay.atomicNumber,first.atomic_number);
  assert.equal(context.pendingPracticeGuesses.length,0);
  assert.equal(context.practiceGame.completed,true);
  assert.equal(JSON.parse(values.get('practiceSnapshot')).draft,undefined);
  await context.loadPractice(true);
  assert.equal(calls.length,2);assert.notEqual(context.practiceGame.id,first.id);
  assert.notEqual(context.practiceGame.atomic_number,first.atomic_number);
  assert.equal(context.practiceGame.draft,true);
  assert.match(source,/practiceGame\.draft \? \{ freeplay: \{ atomicNumber: practiceGame\.atomic_number \} \}/);
  console.log('Freeplay drafts load without requests, survive reloads, retry first actions with stable IDs, become saved games and generate local next rounds.');
})().catch(error=>{console.error(error);process.exitCode=1;});

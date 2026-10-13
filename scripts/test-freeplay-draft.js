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
  context.practiceGame={...context.practiceGame,guesses:[first.atomic_number],won:true,completed:true,localOnly:true};
  context.savePracticeQueue();await context.flushPracticeQueue();
  assert.equal(calls.length,0);
  assert.equal(context.pendingPracticeGuesses.length,0);
  assert.equal(JSON.parse(values.get('practiceSnapshot')).completed,true);
  await context.loadPractice();
  assert.equal(calls.length,0);assert.equal(context.practiceGame.completed,true);
  await context.loadPractice(true);
  assert.equal(calls.length,0);assert.notEqual(context.practiceGame.id,first.id);
  assert.notEqual(context.practiceGame.atomic_number,first.atomic_number);
  assert.equal(context.practiceGame.draft,true);
  assert.match(source,/elementle_freeplay_analysis/);
  console.log('Local Freeplay loads, saves, reloads and advances without server requests, preserving complete transcripts for analysis.');
})().catch(error=>{console.error(error);process.exitCode=1;});

const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(__dirname+'/elementle.js','utf8');
const loading=source.slice(source.indexOf('function restorePracticePreview()'),source.indexOf("document.querySelector('.practice-sync')",source.indexOf('function restorePracticePreview()')));
const save=source.slice(source.indexOf('function savePracticeQueue()'),source.indexOf('async function flushPracticeQueue()'));
async function run(mode) {
  const values=new Map(),calls=[];
  let resolveStart,previews=0;
  const snapshot={id:'round-one',atomic_number:26,guesses:[8],won:false,completed:false,hint_used:false};
  values.set('practiceSnapshot',JSON.stringify(snapshot));values.set('sessionId','round-one');values.set('pendingGuesses','[]');
  const context=vm.createContext({
    playMode:mode,playDate:mode==='archive'?'20261007':null,practice:true,
    practiceGame:null,practiceLoadPromise:null,pendingPracticeGuesses:[],numberOfGuesses:0,guessedCorrectly:'false',
    mysteryElementCache:null,location:{replace(){}},
    gameStorage:{getItem:key=>values.get(key),setItem:(key,value)=>values.set(key,value)},
    window:{ElementleArchiveProgress:{publish(){}}},
    getTodayDateInt:()=>20261012,
    getElementFromAtomicNumber:n=>n===26?{atomicNumber:26}:null,
    renderFromLocalCache:()=>previews++,updateModeUI(){},displayResults(){},flushPracticeQueue(){},
    applyGameStateFromApi(){},
    practiceRequest:(path,body)=>{calls.push(body);return new Promise(resolve=>resolveStart=resolve);}
  });
  vm.runInContext(save+loading,context);
  vm.runInContext('restorePracticePreview()',context);
  assert.equal(previews,1);assert.equal(calls.length,0);assert.equal(context.practiceGame,null);
  const first=vm.runInContext('loadPractice()',context), duplicate=vm.runInContext('loadPractice()',context);
  assert.equal(calls.length,1);
  resolveStart(snapshot);await Promise.all([first,duplicate]);
  assert.equal(JSON.parse(values.get('practiceSnapshot')).id,'round-one');
  assert.equal(context.practiceGame.id,'round-one');
  if(mode==='freeplay') {
    const next=vm.runInContext('loadPractice(true)',context);
    assert.equal(calls.length,2);assert.equal(calls[1].gameId,null);
    resolveStart({...snapshot,id:'round-two',guesses:[]});await next;
    assert.equal(values.get('sessionId'),'round-two');
  }
  values.set('sessionId','another-round');vm.runInContext('restorePracticePreview()',context);
  assert.equal(previews,mode==='freeplay'?3:2); // No preview from the wrong round.
}
(async()=>{
  await run('archive');await run('freeplay');
  assert.match(source,/hintButton.disabled = practice \|\| Boolean\(getAuthToken\(\)\)/);
  console.log('Practice cached previews, fresh server verification, duplicate-load suppression and uncached next experiments pass.');
})().catch(error=>{console.error(error);process.exitCode=1;});

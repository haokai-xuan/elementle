const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(__dirname+'/practice-bootstrap.js','utf8');
const game=fs.readFileSync(__dirname+'/elementle.js','utf8');
const request=game.slice(game.indexOf('async function practiceRequest('),game.indexOf('let pendingPracticeGuesses'));
async function run(mode,token='user-one') {
  const values=new Map([['elementle_token',token],['elementle_guest_id','guest']]);
  values.set(`elementle_${mode}_${mode==='archive'?'20260725':'session'}_${token}_sessionId`,'saved-round');
  const calls=[];
  const context=vm.createContext({window:{},URLSearchParams,Date,AbortSignal,
    location:{search:`?mode=${mode}${mode==='archive'?'&date=20260725':''}`},
    localStorage:{getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value)},
    crypto:{randomUUID:()=> 'guest'},guestId:'guest',getAuthToken:()=>values.get('elementle_token'),
    fetch:(url,options)=>{calls.push({url,options});return Promise.resolve({ok:true,json:async()=>({id:'saved-round'})});}
  });
  vm.runInContext(source,context);
  if(mode==='daily'||!token){assert.equal(calls.length,0);return;}
  assert.equal(calls.length,1);
  const early=context.window.ElementlePracticeBootstrap;
  assert.equal(early.body.gameId,mode==='freeplay'?'saved-round':null);
  vm.runInContext(request,context);
  assert.equal((await context.practiceRequest('start',early.body)).id,'saved-round');
  assert.equal(calls.length,1); // Controller consumes the head request once.
  await context.practiceRequest('start',{...early.body,gameId:null});
  assert.equal(calls.length,2); // Next experiment always makes a fresh request.
  values.set('elementle_token','another-user');
  early.consumed=false;
  await context.practiceRequest('start',early.body);
  assert.equal(calls.length,3); // Account changes cannot consume another user's response.
  assert.equal(calls.at(-1).options.headers.Authorization,'Bearer another-user');
  if(mode==='freeplay') {
    calls.length=0;values.set('elementle_token',token);
    values.delete(`elementle_freeplay_session_${token}_sessionId`);
    vm.runInContext(source,context);
    assert.equal(calls.length,0); // Fresh freeplay waits until an action to save.
    values.set(`elementle_freeplay_session_${token}_sessionId`,'draft-round');
    values.set(`elementle_freeplay_session_${token}_practiceSnapshot`,JSON.stringify({id:'draft-round',draft:true}));
    vm.runInContext(source,context);
    assert.equal(calls.length,0); // An unstarted local draft also needs no request.
  }
}
(async()=>{
  await run('archive');await run('freeplay');await run('daily');await run('freeplay',null);
  const html=fs.readFileSync(__dirname+'/../index.html','utf8');
  assert.ok(html.indexOf('scripts/practice-bootstrap.js')<html.indexOf('scripts/elementle.js'));
  assert.match(game,/if \(pendingPracticeGuesses.length \|\| practiceSyncPromise\) await flushPracticeQueue/);
  console.log('Practice starts early, reuses one request, resumes freeplay, isolates accounts and keeps new experiments fresh.');
})().catch(error=>{console.error(error);process.exitCode=1;});

const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(__dirname+'/stats-prefetch.js','utf8');
const values=new Map([['elementle_token','account-one']]),cache=new Map(),events={},timers=new Map(),requests=[];
let loaded,saved,timerId=0;
const gameReady=new Promise(resolve=>loaded=resolve),gameSaved=new Promise(resolve=>saved=resolve);
const window={ElementleGameReady:gameReady,ElementlePendingGameSave:()=>gameSaved,addEventListener:(name,fn)=>events[name]=fn};
const context=vm.createContext({window,URLSearchParams,Date,TextEncoder,AbortSignal,
 location:{search:''},document:{hidden:false,addEventListener(){}},
 localStorage:{getItem:key=>values.get(key)||null},sessionStorage:{getItem:key=>cache.get(key),setItem:(key,value)=>cache.set(key,value)},
 crypto:{subtle:{digest:async(algorithm,bytes)=>bytes.buffer}},
 setTimeout:fn=>{timers.set(++timerId,fn);return timerId;},clearTimeout:id=>timers.delete(id),
 fetch:async(url,options)=>{requests.push(url);return {ok:true,json:async()=>url.includes('user/stats')?{totalWins:2,streakFreezes:{used:1,earned:true},elELO:{rating:430}}:{today:{1:2}}};}
});
const tick=()=>{const fn=timers.get(timerId);timers.delete(timerId);return fn();};
const flush=()=>new Promise(resolve=>setImmediate(resolve));
(async()=>{
 vm.runInContext(source,context);
 const first=tick();await flush();assert.equal(requests.length,0);
 loaded(true);await flush();assert.equal(requests.length,0);
 saved();await first;assert.equal(requests.length,2);
 const personal=JSON.parse(cache.get('elementle_stats_cache_personal'));
 assert.equal(personal.data.elELO.rating,430);assert.equal(personal.data.streakFreezes.used,0);assert.equal(personal.data.streakFreezes.earned,false);
 const tokenHash=Buffer.from('account-one').toString('hex');
 assert.ok(personal.scope.includes(':'+tokenHash+'::0:'));
 assert.ok(cache.has('elementle_stats_cache_community'));
 events['elementle:game-complete']();await tick();assert.equal(requests.length,2);
 values.set('elementle_stats_revision','new-result');events['elementle:game-complete']();await tick();assert.equal(requests.length,4);
 assert.ok(JSON.parse(cache.get('elementle_stats_cache_personal')).scope.includes(':new-result:0:'));
 context.document.hidden=true;events['elementle:game-complete']();await tick();assert.equal(requests.length,4);
 console.log('Stats prefetch waits for game loading and saves, shares Stats cache scopes, suppresses notices, reuses cached results and skips hidden pages.');
})().catch(error=>{console.error(error);process.exitCode=1;});

const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(__dirname+'/vault.js','utf8');
const loading=source.slice(source.indexOf(" const cacheKey="),source.indexOf(' const entry ='));
const storage=new Map([['elementle_token','member'],['elementle_guest_id','guest']]),cache=new Map();
const pending=[],renders=[],attrs={},classes=new Set(),events={};
let now=1000;
function open(){
 const context=vm.createContext({
  localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)},
  sessionStorage:{getItem:key=>cache.get(key)||null,setItem:(key,value)=>cache.set(key,value),removeItem:key=>cache.delete(key)},
  Date:class extends Date{static now(){return now;}},AbortSignal,
  content:{setAttribute:(key,value)=>attrs[key]=value,classList:{add:name=>classes.add(name),remove:name=>classes.delete(name)}},
  document:{getElementById:()=>({})},window:{addEventListener:(name,fn)=>events[name]=fn},
  render:(data,guest)=>renders.push({data,guest}),
  fetch:(url,options)=>new Promise(resolve=>pending.push({url,options,resolve}))
 });
 vm.runInContext(loading,context);return context;
}
const flush=()=>new Promise(resolve=>setImmediate(resolve));
(async()=>{
 const first=open();assert.equal(attrs['aria-busy'],'true');assert.equal(classes.has('vault-is-loading'),true);
 pending[0].resolve({ok:true,json:async()=>({startDate:'2026-10-10',records:[]})});
 assert.equal(await vm.runInContext('ready',first),true);
 assert.equal(attrs['aria-busy'],'false');assert.equal(classes.has('vault-is-loading'),false);
 const detail=open();assert.equal(await vm.runInContext('ready',detail),true);
 assert.equal(pending.length,1); // Overview/detail navigation reuses the collection.
 storage.set('elementle_stats_revision','new-game');
 const changed=open();assert.equal(pending.length,2);
 storage.set('elementle_token','another-member');events['elementle:auth-change']();
 assert.equal(pending.length,3);
 pending[1].resolve({ok:true,json:async()=>({startDate:'2026-10-10',records:[{number:26}]})});await flush();
 assert.equal(renders.length,2); // Old account responses never render into the new account.
 pending[2].resolve({ok:true,json:async()=>({startDate:'2026-10-13',records:[]})});await flush();
 assert.equal(renders.at(-1).data.startDate,'2026-10-13');
 now+=301000;const expired=open();assert.equal(pending.length,4);
 pending[3].resolve({ok:false});assert.equal(await vm.runInContext('ready',expired),false);
 assert.equal(cache.size,0);assert.equal(attrs['aria-busy'],'false');
 assert.match(source,/if \(!loaded\)/); // Failed loads never play the access-granted sequence.
 assert.match(source,/duration: 1400/);
 console.log('Vault loading animation state, shared collection cache, game invalidation, account isolation, expiry and failed connection handling pass.');
})().catch(error=>{console.error(error);process.exitCode=1;});

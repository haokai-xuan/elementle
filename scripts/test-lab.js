const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(__dirname + '/lab-access.js', 'utf8');
async function run({ token = null, status = {isLab:false}, path = '/', mode = '', hash = '', failure = false, cache = new Map(), now = () => Date.now(), search = '' }) {
  const events = {}, dom = {}, scripts = [], redirects = [], root = {dataset:{}};
  let requests=0, tick;
  const urls=[];
  let document;
  class Node {
    constructor(tag='div') { this.tagName=tag.toUpperCase();this.dataset={};this.children=[];this.nodes={};this.events={};this.inert=false;this.hidden=false;this.classList={add(){},remove(){}}; }
    append(node) { this.children.push(node);node.parent=this; }
    remove() { if(this.parent) this.parent.children=this.parent.children.filter(node=>node!==this); }
    querySelector(selector) { return this.nodes[selector] ||= new Node(selector.startsWith('a')?'a':'div'); }
    querySelectorAll() { return ['.lab-access-subscribe','.lab-access-retry','.lab-access-back'].map(selector=>this.querySelector(selector)); }
    addEventListener(name,fn) { this.events[name]=fn; }
    focus() { document.activeElement=this; }
  }
  const main=new Node('main'), body=new Node('body');body.append(main);
  document={documentElement:root,body,readyState:'loading',activeElement:main,
    addEventListener(name,fn){dom[name]=fn;},querySelectorAll:()=>[],
    createElement:tag=>new Node(tag),head:{append:node=>{if(node.tagName==='SCRIPT')scripts.push(node);}}};
  const window = {
    addEventListener(name,fn){ events[name]=fn; },
    setInterval(fn){tick=fn;},
    dispatchEvent(event){ events[event.type]?.(event); }
  };
  vm.runInNewContext(source, {
    window, URLSearchParams, CustomEvent:class{constructor(type,options){this.type=type;Object.assign(this,options);}},
    Date:class extends Date {static now(){return now();}},
    localStorage:{getItem:()=>token},
    sessionStorage:{getItem:key=>cache.get(key),setItem:(key,value)=>cache.set(key,value),removeItem:key=>cache.delete(key)},
    location:{pathname:path, hash, search:search || (mode ? '?mode='+mode : ''), replace:url=>redirects.push(url),reload:()=>redirects.push('reload')},
    fetch:async(url)=>{urls.push(url);requests++;return {ok:!failure,json:async()=>status};},
    document
  });
  try{await window.ElementleLab.ready;}catch{}
  document.readyState='complete';await dom.DOMContentLoaded();
  return {window,scripts,redirects,get requests(){return requests;},tick,urls,cache,root,events,body,main,gate:body.children.find(node=>node.className==='lab-access-gate')};
}
(async()=>{
  const guest=await run({});assert.equal(guest.requests,0);assert.equal(guest.scripts.length,1);
  const free=await run({token:'jwt',status:{isLab:false}});assert.equal(free.requests,0);assert.equal(free.scripts.length,0);
  free.events.focus();free.tick();await new Promise(resolve=>setImmediate(resolve));assert.equal(free.requests,0);
  free.window.ElementleLab.consumeGame({streakFreezes:{capacity:1}});await new Promise(resolve=>setImmediate(resolve));assert.equal(free.scripts.length,1);
  const trial=await run({token:'jwt',status:{isLab:true,status:'trialing'}});assert.equal(trial.requests,0);
  trial.window.ElementleLab.consumeGame({streakFreezes:{capacity:2}});await new Promise(resolve=>setImmediate(resolve));assert.equal(trial.scripts.length,0);assert.equal(trial.root.dataset.lab,'active');
  const detailed=await run({token:'jwt',path:'/account',cache:trial.cache,status:{isLab:true,status:'trialing',plan:'monthly'}});assert.equal(detailed.requests,1);assert.equal(detailed.window.ElementleLab.status.plan,'monthly');
  const failed=await run({token:'jwt',failure:true});assert.equal(failed.scripts.length,0);
  for(const path of ['/vault','/vault/26','/analysis','/analysis/']){
    const gated=await run({path});assert.equal(gated.redirects.length,0);assert.equal(gated.scripts.length,0);
    assert.equal(gated.gate.dataset.state,'required');assert.equal(gated.main.inert,true);
    assert.match(gated.gate.querySelector('.lab-access-subscribe').href,/^\/lab\?feature=/);
  }
  for(const mode of ['archive','freeplay']){
    const gated=await run({mode});assert.equal(gated.gate.dataset.state,'required');assert.equal(gated.redirects.length,0);
  }
  const freeAnalysis=await run({path:'/analysis',token:'jwt',status:{isLab:false}});
  assert.equal(freeAnalysis.gate.dataset.state,'required');
  assert.equal(freeAnalysis.gate.querySelector('#lab-access-title').textContent,'A Lab subscription is required');
  assert.equal(freeAnalysis.gate.querySelector('.lab-access-subscribe').href,'/lab?feature=analysis');
  assert.equal(freeAnalysis.main.inert,true);
  const paidAnalysis=await run({path:'/analysis',token:'jwt',status:{isLab:true}});
  assert.equal(paidAnalysis.gate,undefined);assert.equal(paidAnalysis.main.inert,false);
  assert.match(require('../lib/analysis-page')(require('node:path').resolve(__dirname,'..')),/src="\/scripts\/lab-access\.js"/);
  const legacy=await run({path:'/index.html',mode:'archive'});assert.equal(legacy.gate.dataset.state,'required');
  const archives=await run({path:'/stats',hash:'#lab-archives'});assert.equal(archives.gate.dataset.state,'required');
  assert.equal(archives.gate.querySelector('.lab-access-back').href,'/stats');
  const stats=await run({path:'/stats'});assert.equal(stats.gate,undefined);assert.equal(stats.main.inert,false);
  const unavailable=await run({path:'/vault',token:'jwt',failure:true});assert.equal(unavailable.gate.dataset.state,'error');
  assert.equal(unavailable.gate.querySelector('.lab-access-retry').hidden,false);
  assert.equal(unavailable.gate.querySelector('.lab-access-subscribe').hidden,true);
  const subscribed=await run({path:'/vault',token:'jwt',status:{isLab:true}});assert.equal(subscribed.redirects.length,0);
  assert.equal(subscribed.gate,undefined);assert.equal(subscribed.main.inert,false);
  const access={isLab:false};const changed=await run({path:'/vault',token:'jwt',status:access});
  access.isLab=true;await changed.window.ElementleLab.refresh();await new Promise(resolve=>setImmediate(resolve));
  assert.equal(changed.body.children.length,1);assert.equal(changed.main.inert,false);
  access.isLab=false;await changed.window.ElementleLab.refresh();await new Promise(resolve=>setImmediate(resolve));
  assert.equal(changed.body.children.length,2);assert.equal(changed.main.inert,true);
  const lab=await run({path:'/lab'});assert.equal(lab.scripts.length,0);
  free.events['elementle:auth-change']();assert.equal(free.redirects.at(-1),'reload');
  // Cache persists across navigation, expires from the original fetch, and is account-bound.
  const cache=new Map();let clock=100000;
  await run({token:'member',path:'/vault',status:{isLab:true},cache,now:()=>clock});
  const cached=await run({token:'member',status:{isLab:false},path:'/vault',cache,now:()=>clock});
  assert.equal(cached.requests,0);assert.equal(cached.root.dataset.lab,'active');
  clock+=10000;cached.tick();await new Promise(resolve=>setImmediate(resolve));
  assert.equal(cached.requests,0);
  clock+=21000;cached.tick();await new Promise(resolve=>setImmediate(resolve));
  assert.equal(cached.requests,1);assert.equal(cached.root.dataset.lab,'free');
  assert.equal(cached.main.inert,true);
  const other=await run({token:'other-member',path:'/vault',status:{isLab:false},cache,now:()=>clock});
  assert.equal(other.requests,1);assert.equal(other.root.dataset.lab,'free');
  const billing=await run({token:'other-member',status:{isLab:true},path:'/account',search:'?billing=return',cache,now:()=>clock});
  assert.equal(billing.requests,1);assert.match(billing.urls[0],/refresh=1/);
  const ordinaryBilling=await run({token:'other-member',status:{isLab:true},path:'/account',cache,now:()=>clock});
  assert.equal(ordinaryBilling.requests,0);
  const before=billing.requests;
  await Promise.all([billing.window.ElementleLab.refresh(true),billing.window.ElementleLab.refresh(true)]);
  assert.equal(billing.requests,before+1);
  const denial=await run({token:'other-member',status:{isLab:false},path:'/analysis',cache,now:()=>clock});
  assert.equal(denial.requests,0);
  denial.window.ElementleLab.checkResponse({status:402});
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(denial.requests,1);assert.equal(denial.root.dataset.lab,'free');
  assert.equal(denial.main.inert,true);
  const beforeInvalidation=denial.requests;
  denial.events.storage({key:'elementle_lab_revision'});
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(denial.requests,beforeInvalidation+1);
  const expiringCache=new Map();
  clock=100000;
  await run({token:'expiring',path:'/vault',status:{isLab:true,status:'trialing',trialEnd:105},cache:expiringCache,now:()=>clock});
  clock=106000;
  const expired=await run({token:'expiring',path:'/vault',status:{isLab:false},cache:expiringCache,now:()=>clock});
  assert.equal(expired.requests,1);assert.equal(expired.root.dataset.lab,'free');
  const unavailableCache=new Map();
  await run({token:'offline',path:'/vault',status:{isLab:true},cache:unavailableCache,now:()=>clock});
  clock+=31000;
  const offline=await run({token:'offline',failure:true,path:'/vault',cache:unavailableCache,now:()=>clock});
  assert.equal(offline.root.dataset.lab,'unknown');assert.equal(offline.gate.dataset.state,'error');
  assert.equal(unavailableCache.size,0);
  console.log('Lab cache: navigation reuse, fixed expiry, account isolation, billing bypass, deduplication, access denial, trial expiry and failure invalidation pass.');
  console.log('Lab gates, protected routes, membership changes, verification errors, ad suppression, and auth reload pass.');
})().catch(error=>{console.error(error);process.exitCode=1;});

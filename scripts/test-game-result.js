const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
class Node {
  constructor() {this.children=[];this.nodes=new Map();this.listeners={};this.attributes={};this.classes=new Set();this.classList={add:name=>this.classes.add(name)};}
  querySelector(selector) {if(!this.nodes.has(selector)) this.nodes.set(selector,new Node());return this.nodes.get(selector);}
  setAttribute(key,value) {this.attributes[key]=value;}
  addEventListener(name,fn) {this.listeners[name]=fn;}
  append(...nodes) {this.children.push(...nodes);}
  showModal() {this.open=true;}
  close() {this.open=false;}
  remove() {this.removed=true;}
  focus() {this.focused=true;}
}
let token='signed-in', historyResponse, historyRequest;
const body=new Node(), timers=[], frames=new Map(), events={}; let counter=0;
const context=vm.createContext({console,Promise,Number,Math,Date,String,
  localStorage:{getItem:()=>token},
  fetch:async(url,options)=>{historyRequest={url,options};return historyResponse;},
  window:{matchMedia:()=>({matches:false}),addEventListener:(name,fn)=>events[name]=fn},
  document:{body,createElement:()=>new Node()},
  setTimeout:(fn,delay)=>{timers.push({fn,delay});},
  requestAnimationFrame:fn=>{frames.set(++counter,fn);return counter;},
  cancelAnimationFrame:id=>frames.delete(id)});
vm.runInContext(fs.readFileSync(require.resolve('./game-result.js'),'utf8'),context);
const integrationSource=fs.readFileSync(require.resolve('./elementle.js'),'utf8');
const resultFunction=integrationSource.slice(integrationSource.indexOf('function showGameResult('),integrationSource.indexOf('function getGameResultMessage('));
let call, practiceNotice=0;
const savedResponse=Promise.resolve({elELO:{change:12}});
const integration=vm.createContext({practice:false,_pendingGuessPromise:savedResponse,_completionConfetti:Promise.resolve(),
  getAuthToken:()=> 'account-token',getTodayDateInt:()=>20261011,getGameResultMessage:()=> 'Nice work!',
  document:{querySelector:()=>null},window:{ElementleGameResult:{schedule:(...args)=>call=args},ElementleFreezes:{notice:()=>practiceNotice++}}});
vm.runInContext(resultFunction,integration);vm.runInContext('showGameResult(true,4)',integration);
assert.equal(call[0].guest,false);assert.equal(call[0].localDate,20261011);assert.equal(call[1],savedResponse);assert.equal(call[2](),true);
integration.practice=true;vm.runInContext('showGameResult(true,4)',integration);assert.equal(practiceNotice,1);
const api=context.window.ElementleGameResult;
const current=()=>body.children.at(-1);
const finishAnimation=()=>{let fn=[...frames.values()].at(-1);fn(0);fn=[...frames.values()].at(-1);fn(1100);};
(async()=>{
  for (const change of [23.75,-8.5,0]) {
    api.show({localDate:20261010,elo:{oldRating:1000,rating:1000+change,change}});
    const dialog=current();
    assert.equal(dialog.open,true);
    assert.equal(dialog.querySelector('.game-result-delta').textContent,change>0?'+0':change<0?'−0':'0');
    assert.equal(dialog.querySelector('.game-result-rating').textContent,'1,000');
    finishAnimation();
    assert.equal(dialog.querySelector('.game-result-rating').textContent,Number(1000+change).toLocaleString(undefined,{maximumFractionDigits:2}));
    assert.equal(dialog.querySelector('.game-result-arrow').textContent,change>0?'↑':change<0?'↓':'→');
    assert.equal(dialog.querySelector('.game-result-analysis').href,'/analysis?date=20261010');
  }
  api.show({historical:true,elo:{before:980,rating:995,change:15}});finishAnimation();
  assert.equal(current().querySelector('.game-result-rating').textContent,'995');
  api.show({guest:true});assert.match(current().querySelector('.game-result-rating-note').textContent,/Sign in/);
  let analyze=0;api.show({onAnalysis:()=>analyze++});current().querySelector('.game-result-analysis').listeners.click({preventDefault(){}});assert.equal(analyze,1);
  const before=body.children.length;
  let resolve;const pending=new Promise(r=>resolve=r);
  const scheduled=api.schedule({won:true},pending);
  assert.equal(timers.at(-1).delay,1200);
  timers.at(-1).fn();await Promise.resolve();assert.equal(body.children.length,before);
  resolve({elELO:{oldRating:1000,rating:1010,change:10}});await scheduled;
  assert.equal(body.children.length,before+1);
  const afterCount=body.children.length;
  const stale=api.schedule({won:false},null,()=>false);assert.equal(timers.at(-1).delay,1200);timers.at(-1).fn();await stale;assert.equal(body.children.length,afterCount);
  const cancelled=api.schedule({won:true},null);const delayed=timers.at(-1);events['elementle:auth-change']();delayed.fn();await cancelled;assert.equal(body.children.length,afterCount);
  const closing=current();timers.at(-1).fn();assert.equal(closing.open,false);
  api.show({guest:false});assert.match(current().querySelector('.game-result-rating-note').textContent,/unavailable/);
  api.openHistory({localDate:'20261010',elo:{before:1000,rating:1015,change:15}});
  assert.equal(historyRequest,undefined); // Calendar popup uses stats, with no extra API request.
  assert.equal(current().querySelector('.game-result-view').hidden,false);
  assert.equal(current().querySelector('.game-result-view').href,'/game-history?date=20261010');
  assert.equal(current().querySelector('.game-result-analysis').hidden,true);
  token=null;const count=body.children.length;api.openHistory({localDate:'20261010'});assert.equal(body.children.length,count);
  console.log('Daily result animation, signed changes, historical ratings, guest state, completion delay, failed sync and auth cancellation pass.');
})().catch(error=>{console.error(error);process.exitCode=1;});

const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const data = require('../data/element-reference.json');
class Node {
  constructor() { this.children = []; this.handlers = {}; this.attributes = {}; this.classes = new Set(); this.hidden = false; this.disabled = false; this.style = {properties:{},setProperty:(key,value)=>this.style.properties[key]=value};
    this.classList = {toggle:(name, enabled) => enabled ? this.classes.add(name) : this.classes.delete(name)};
  }
  getBoundingClientRect() { return {left:160,right:181}; }
  addEventListener(name, handler) { this.handlers[name] = handler; }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.children = children; }
  setAttribute(name, value) { this.attributes[name] = value; }
  removeAttribute(name) { delete this.attributes[name]; }
}
const result = { answer:118, won:true, hintUsed:false, referenceGuesses:4, referenceSample:0, referenceSource:'default', scores:{rating:91,efficiency:100,information:75,independence:100}, steps:[
  {guess:1,optimal:75,before:data.map(e=>e.number),after:[26,118],quality:30,feedback:['gray','none','up','diff'],expectedBits:1,optimalBits:3,correct:false,possible:true},
  {guess:26,optimal:26,before:[26,118],after:[118],quality:100,feedback:['gray','gray','up','diff'],expectedBits:1,optimalBits:1,correct:false,possible:true},
  {guess:118,optimal:118,before:[118],after:[118],quality:100,feedback:['green','green','same','same'],expectedBits:0,optimalBits:0,correct:true,possible:true}
]};
async function run({fail=false,token=null,missing=false,rating=91,knownMistake=false,idleChance=1,reducedMotion=false,deferReveal=false,elELO=null,gameId=null,mode='daily',localGameId=null,owner=token}={}) {
  const ids = new Map(), cells = data.map(e => { const n = new Node(); n.dataset={number:String(e.number)}; return n; });
  const get = id => { if(!ids.has(id)) ids.set(id,new Node()); return ids.get(id); };
  get('analysis-elements').textContent = JSON.stringify(data);
  let request, chance = idleChance, timerId = 0;
  const delays = [];
  const timers = new Map(), intervals = new Map();
  const context = {
    window:{innerWidth:390},
    document:{hidden:false, getElementById:get, createElement:()=>new Node(), addEventListener(){}, querySelectorAll:selector=>selector==='.periodic-cell' ? cells : get('analysis-guesses').children.map(li=>li.children[0])},
    Math:Object.assign(Object.create(Math),{random:()=>chance}),
    matchMedia:()=>({matches:reducedMotion,addEventListener(){}}), Image:class{},
    setInterval:fn=>{const id=++timerId;intervals.set(id,fn);return id;},clearInterval:id=>intervals.delete(id),
    performance:{now:()=>0},
    setTimeout:(fn,ms)=>{delays.push(ms);const id=++timerId;timers.set(id,fn);return id;},clearTimeout:id=>timers.delete(id),
    URLSearchParams,location:{search:localGameId ? '?mode=freeplay&localGameId='+localGameId : gameId ? '?gameId='+gameId : '?date=20261008'},AbortSignal,
    localStorage:{getItem:key=>key==='elementle_token' ? token : null},
    sessionStorage:{getItem:()=>missing ? null : JSON.stringify(localGameId ? {id:localGameId,owner,freeplay:{atomicNumber:118,guesses:[1,26,118],hintUsed:false,hintAt:null}} : {localDate:'20261008',guesses:[1,26,118],hintUsed:false,hintAt:0})},
    fetch:async(url,options)=>{ request={url,options}; return {ok:!fail,json:async()=>fail ? {error:'Service offline'} : {...result,mode,archiveDate:20261007,elELO,scores:{...result.scores,rating},steps:knownMistake ? result.steps.map((step,i)=>i===1 ? {...step,before:[118],guess:32,optimal:118,quality:0,possible:false,expectedBits:0,optimalBits:0} : step) : result.steps}}; }
  };
  vm.runInNewContext(fs.readFileSync(require.resolve('./analysis.js'),'utf8'),context);
  await new Promise(resolve=>setImmediate(resolve));
  if (!deferReveal && !fail && !missing && timers.size) {
    const [id,fn] = timers.entries().next().value; timers.delete(id); fn();
    await new Promise(resolve=>setImmediate(resolve));
  }
  return {get,cells,request,delays,setChance:value=>{chance=value;},fireTimer:()=>{const [id,fn]=timers.entries().next().value;timers.delete(id);fn();},fireFrame:()=>intervals.values().next().value()};
}
(async()=>{
  for (const [chance,delay] of [[0,3000],[.5,5000],[1,7000]]) {
    const thinking = await run({idleChance:chance,deferReveal:true});
    assert.equal(thinking.delays[0],delay);
    assert.equal(thinking.get('analysis-content').hidden,true);
    assert.equal(thinking.get('analysis-scores').hidden,true);
    assert.match(thinking.get('bot-frame').src,/thinking_01/);
    thinking.fireTimer();
    await new Promise(resolve=>setImmediate(resolve));
    assert.equal(thinking.get('analysis-content').hidden,false);
  }
  const {get,cells,request} = await run();
  assert.equal(request.url,'/api/game/analysis');
  assert.equal(get('analysis-content').hidden,false);
  assert.equal(get('analysis-guesses').children.length,3);
  const help = get('analysis-scores').children[1].children[2];
  assert.match(help.children[1].textContent,/typical difficulty/);
  help.children[0].handlers.click();
  assert.equal(help.children[0].attributes['aria-expanded'],'true');
  assert.equal(help.children[1].style.properties.left,'-146px');
  help.children[0].handlers.click();
  assert.equal(help.children[0].attributes['aria-expanded'],'false');
  assert.match(get('feedback-help').children[0].children[1].textContent,/atomic-number arrow/);
  assert.equal(get('analysis-scores').hidden,false);
  for (const [score,hue] of [[0,0],[25,30],[50,60],[100,120]]) {
    const colored = await run({rating:score});
    assert.equal(colored.get('analysis-scores').children[0].style.properties['--rating-color'],`hsl(${hue} 60% 72%)`);
  }
  assert.equal(get('candidate-count').textContent,'2 possible answers');
  assert.equal(cells.filter(n=>n.classes.has('eliminated')).length,116);
  assert.equal(get('step-prev').disabled,true);
  get('step-next').handlers.click();
  assert.equal(get('candidate-count').textContent,'1 possible answer');
  assert.match(get('bot-message').textContent,/optimal guess/);
  get('step-next').handlers.click();
  assert.equal(get('step-next').disabled,true);
  assert.match(get('bot-frame').src,/celebrate_01/);
  get('step-prev').handlers.click();
  get('toggle-feedback').handlers.click();
  assert.equal(get('candidate-count').textContent,'2 possible answers');
  get('step-prev').handlers.click();
  get('toggle-feedback').handlers.click();
  assert.equal(cells.filter(n=>n.classes.has('eliminated')).length,0);
  const known = await run({knownMistake:true});
  known.get('step-next').handlers.click();
  assert.match(known.get('bot-message').textContent,/Oganesson \(Og, 118\)/);
  assert.match(known.get('bot-message').textContent,/only possible answer before this turn/);
  assert.doesNotMatch(known.get('bot-message').textContent,/expected bits|versus/);
  assert.equal(known.get('step-metrics').children[1].children[0].textContent,'Answer already known');
  const reading = await run({idleChance:0});
  reading.fireTimer();
  assert.match(reading.get('bot-frame').src,/reading_01/);
  for(let i=2;i<=5;i++) { reading.fireFrame(); assert.match(reading.get('bot-frame').src,new RegExp(`reading_0${i}`)); }
  reading.setChance(1); reading.fireTimer();
  assert.match(reading.get('bot-frame').src,/idle_01/);
  reading.setChance(0); reading.fireTimer();
  assert.match(reading.get('bot-frame').src,/reading_01/);
  reading.get('step-next').handlers.click();
  assert.match(reading.get('bot-frame').src,/explain_01/);
  const reduced = await run({idleChance:0,reducedMotion:true}); reduced.fireTimer();
  assert.match(reduced.get('bot-frame').src,/idle_01/);
  const offline = await run({fail:true});
  assert.equal(offline.get('analysis-retry').hidden,false);
  assert.equal(offline.get('bot-message').textContent,'Service offline');
  const account = await run({token:'test-token'});
  assert.equal(account.request.options.headers.Authorization,'Bearer test-token');
  assert.deepEqual(JSON.parse(account.request.options.body),{localDate:'20261008'});
  for (const mode of ['freeplay','archive']) {
    const practice=await run({token:'test-token',gameId:'saved-game',mode});
    assert.deepEqual(JSON.parse(practice.request.options.body),{gameId:'saved-game'});
    assert.match(practice.get('analysis-context').textContent,new RegExp(mode.toUpperCase()));
    assert.equal(practice.get('analysis-back').href,mode==='archive'?'/?mode=archive&date=20261007':'/?mode=freeplay');
    assert.equal(practice.get('analysis-scores').children.length,4);
  }
  const local=await run({token:'test-token',mode:'freeplay',localGameId:'local-round'});
  assert.deepEqual(JSON.parse(local.request.options.body),{freeplay:{atomicNumber:118,guesses:[1,26,118],hintUsed:false,hintAt:null}});
  assert.equal(local.get('analysis-back').href,'/?mode=freeplay');
  const wrongOwner=await run({token:'test-token',owner:'different-account',mode:'freeplay',localGameId:'local-round'});
  assert.equal(wrongOwner.request,undefined);
  const rated = await run({token:'test-token',elELO:{rating:409.6,oldRating:400,change:9.6,tier:'Lab Apprentice'}});
  const eloCard = rated.get('analysis-scores').children[4];
  assert.equal(eloCard.children[0].textContent, 'elELO · Lab Apprentice');
  assert.equal(eloCard.children[1].textContent, '409.6');
  assert.match(eloCard.children[2].textContent, /\+9.60 this game/);
  assert.equal(get('analysis-scores').children.length, 4);
  const missing = await run({missing:true});
  assert.equal(missing.request,undefined);
  assert.match(missing.get('bot-message').textContent,/Finish a daily game/);
  const page = require('../lib/analysis-page')(require('node:path').resolve(__dirname,'..'));
  assert.ok(page.indexOf('id="analysis-scores"') < page.indexOf('class="bot-panel"'));
  assert.doesNotMatch(page,/Every guess tells a story|How elBot scores your game|YOUR LAB PARTNER/);
  assert.match(page,/your Lab partner/);
  console.log('elBot: guest/account requests, forward/backward replay, elimination restoration, win animation, errors and missing transcripts pass.');
})().catch(error=>{console.error(error);process.exitCode=1;});

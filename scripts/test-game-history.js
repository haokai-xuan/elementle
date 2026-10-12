const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
class Node {
  constructor(){this.children=[];this.style={};this.classes=new Set();this.attributes={};this.listeners={};this.classList={add:(...names)=>names.forEach(name=>this.classes.add(name))};}
  append(...nodes){this.children.push(...nodes);}
  replaceChildren(...nodes){this.children=nodes;}
  setAttribute(key,value){this.attributes[key]=value;}
  addEventListener(name,fn){this.listeners[name]=fn;}
}
const nodes=new Map(),events={};const get=id=>{if(!nodes.has(id))nodes.set(id,new Node());return nodes.get(id);};
let token='valid',response,rating,requests=0;
const game={answer:{name:'Iron',symbol:'Fe',atomicNumber:26,family:'Transition Metal'},
 guesses:[{name:'Oxygen',symbol:'O',atomicNumber:8,family:'Nonmetal'},{name:'Iron',symbol:'Fe',atomicNumber:26,family:'Transition Metal'}],
 won:true,numGuesses:2,hintUsed:true,hintUsedAtGuess:1,isLab:false,elELO:{rating:420,oldRating:400,change:20}};
const context=vm.createContext({URLSearchParams,Date,location:{search:'?date=20261010'},localStorage:{getItem:()=>token},
 window:{ElementleGameResult:{close(){},renderElo:(root,result)=>rating=result.elo},addEventListener:(event,fn)=>events[event]=fn},
 document:{getElementById:get,createElement:()=>new Node()},fetch:async(url,options)=>{requests++;assert.equal(url,'/api/game/history?localDate=20261010');assert.equal(options.headers.Authorization,'Bearer valid');return response;}});
const settle=()=>new Promise(resolve=>setImmediate(resolve));
(async()=>{
 const page=require('../lib/game-history-page')(require('node:path').resolve(__dirname,'..'));
 assert.ok(page.includes('saved-game-guesses'));assert.ok(!page.includes('src="/scripts/elementle.js"'));assert.ok(!page.includes('src="/scripts/stats.js"'));
 response={ok:true,json:async()=>game};vm.runInContext(fs.readFileSync(require.resolve('./game-history.js'),'utf8'),context);await settle();
 assert.equal(get('saved-game-content').hidden,false);assert.equal(rating.change,20);
 const cards=get('saved-game-guesses').children;assert.equal(cards.length,8);
 assert.equal(cards[0].children[0].children[0].textContent,'⬆️');assert.equal(cards[1].classes.has('correct-card'),true);
 assert.equal(cards[1].children[1].children[0].style.color,'rgb(83, 141, 78)');
 assert.equal(get('saved-game-analysis').hidden,false);assert.equal(get('saved-game-hint').textContent,'Hint used after guess 1');
 response={ok:true,json:async()=>({...game,isLab:true})};await get('saved-game-retry').listeners.click();
 assert.equal(get('saved-game-analysis').hidden,false);assert.equal(get('saved-game-analysis').href,'/analysis?date=20261010');
 response={ok:false,json:async()=>{throw new SyntaxError('Unexpected token <');}};await get('saved-game-retry').listeners.click();
 assert.match(get('saved-game-status').textContent,/temporarily unavailable/);assert.equal(get('saved-game-content').hidden,true);
 let release;response={ok:true,json:()=>new Promise(resolve=>release=resolve)};const pending=get('saved-game-retry').listeners.click();await settle();
 token=null;events['elementle:auth-change']();release(game);await pending;
 assert.equal(get('saved-game-content').hidden,true);assert.equal(get('saved-game-signin').hidden,false);
 const count=requests;await get('saved-game-retry').listeners.click();assert.equal(requests,count);
 // A stale Flask deployment returning HTML must still yield JSON from the Node proxy.
 const server=fs.readFileSync(require.resolve('../server.js'),'utf8');const route=server.slice(server.indexOf("app.get('/api/game/history'"),server.indexOf("app.get('/api/game/state'"));
 let handler;vm.runInNewContext(route,{app:{get:(path,fn)=>handler=fn},API_BASE_URL:'http://api',gameHeaders:()=>({}),console,
 fetch:async()=>({status:404,json:async()=>{throw new SyntaxError('HTML');}})});
 const res={set(name,value){assert.equal(name,'Cache-Control');assert.equal(value,'no-store');},status(code){this.code=code;return this;},json(data){this.data=data;return this;}};
 await handler({query:{localDate:'20261010'}},res);assert.equal(res.code,502);assert.match(res.data.error,/temporarily unavailable/);
 console.log('Saved game cards, symbol feedback, elELO, Lab analysis gating, HTML error handling and account-change cancellation pass.');
})().catch(error=>{console.error(error);process.exitCode=1;});

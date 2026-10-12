const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const context={window:{}};
vm.runInNewContext(fs.readFileSync(require.resolve('./elelo.js'),'utf8'),context);
const elo=context.window.ElementleElo;
assert.equal(elo.chartModel([]).empty,true);
assert.equal(elo.chartModel([]).points[0].rating,400);
assert.equal(elo.rankProgress(400).value,0);
assert.equal(elo.rankProgress(475).value,50);
assert.equal(elo.rankProgress(550).name,'Chemist');
assert.equal(elo.rankProgress(550).value,0);
assert.equal(elo.rankProgress(1700),null);
assert.equal(elo.rankProgress(-20).value,0);
const history=Array.from({length:100},(_,i)=>({date:'2026-10-09',before:400+i,rating:401+i,change:1,gameRating:80}));
const last=elo.chartModel(history,'30');
assert.equal(last.points.length,31);
assert.equal(last.points[0].rating,470);
assert.equal(last.points.at(-1).rating,500);
assert.equal(last.partial,true);
const all=elo.chartModel(history,'all');
assert.equal(all.points.length,101);
assert.equal(all.points[0].rating,400);
assert.equal(all.partial,false);
for(const points of [all.points,elo.chartModel([{before:400,rating:400}], 'all').points,elo.chartModel([{before:-20,rating:-25}], 'all').points]) {
  assert.ok(points.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)));
}
for(const account of [false,true]) {
  const html=elo.markup(account);
  assert.match(html,/aria-controls="elelo-leaderboard">/);
  assert.doesNotMatch(html,/rated main games ·|Guest and registered results|including losses|elelo-explanation/);
  assert.match(html,/role="tooltip"/);
  assert.match(html,/js-elelo-rank-bar/);
  assert.match(html,/<div class="js-elelo-graph-section">/);
  assert.match(html,/Explore your elELO history/);
  for(const tier of elo.tiers) {
    assert.ok(fs.existsSync(require('node:path').resolve(__dirname,'../images/tier_symbols',tier.symbol+'.png')));
    assert.ok(html.includes(tier.name));
  }
}
assert.match(elo.markup(false),/Sign in/);
assert.match(elo.markup(true),/Loading your rated games/);
console.log('elELO graph windows, initial rating, flat/negative ratings, tier assets, and empty graph, next-rank progress, tooltip, and visible leaderboard launch pass.');

// Exercise graph initialization and both empty leaderboard states using the actual controller.
class TestNode {
  constructor(){this.children=[];this.attrs={};this.handlers={};this.hidden=false;this.value='30';this.style={setProperty(){}};this.classList={toggle(){},remove(){}};}
  setAttribute(key,value){this.attrs[key]=String(value);}
  getAttribute(key){return this.attrs[key] ?? null;}
  addEventListener(name,handler){this.handlers[name]=handler;}
  append(...nodes){this.children.push(...nodes);}
  replaceChildren(...nodes){this.children=nodes;}
  focus(){}
}
const nodes=new Map();
const node=key=>{if(!nodes.has(key))nodes.set(key,new TestNode());return nodes.get(key);};
const section={querySelector:node};
const root={querySelector:()=>section,dispatchEvent(){}};
context.document={createElement:()=>new TestNode(),createElementNS:()=>new TestNode()};
context.Event=class {};
context.AbortSignal=AbortSignal;
let available=false,leaders=[];
context.fetch=async()=>({ok:true,json:async()=>({enabled:available,leaders})});
elo.initialize(root,true);
assert.equal(node('.js-elelo-chart').children.length,1);
assert.equal(node('.elelo-inspector').hidden,true);
node('.js-elelo-board').hidden=false;
(async()=>{
  await elo.refreshLeaderboard(root);
  assert.equal(node('.js-elelo-launch-label').textContent,'Coming soon');
  assert.equal(node('.js-elelo-list').children[0].textContent,'Coming soon');
  assert.equal(node('.js-elelo-board').hidden,false);
  available=true;
  await elo.refreshLeaderboard(root);
  assert.equal(node('.js-elelo-launch-label').textContent,'elELO leaders');
  assert.match(node('.js-elelo-list').children[0].textContent,/first rated players/);
  leaders=[{username:'Lab player',rank:1,rating:500,tier:'Lab Assistant',isLab:true},{username:'Free player',rank:2,rating:400,tier:'Lab Assistant',isLab:false}];
  await elo.refreshLeaderboard(root);
  const rows=node('.js-elelo-list').children;
  assert.equal(rows[0].children[2].children[1].className,'leaderboard-lab-icon');
  assert.equal(rows[0].children[2].children[1].width,18);
  assert.equal(rows[1].children[2].children.length,1);
  elo.update(root,{rating:1700,tier:'Master Alchemist',history:[]});
  assert.equal(node('.js-elelo-progress').hidden,true);
  console.log('Empty SVG, Coming soon without closing the panel, published empty leaderboard, and highest-tier progress pass.');
})().catch(error=>{console.error(error);process.exitCode=1;});

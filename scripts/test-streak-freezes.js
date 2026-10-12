const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
class Element {
  constructor() {this.children=[];this.attributes={};this.value=0;}
  append(...nodes) {this.children.push(...nodes);}
  replaceChildren() {this.children=[];}
  setAttribute(key,value) {this.attributes[key]=value;}
  remove() {this.removed=true;}
}
const elements = new Map();
const root = {querySelector(selector) {if(!elements.has(selector)) elements.set(selector,new Element());return elements.get(selector);}};
const notices=[];
const context=vm.createContext({Date,Map,Number,JSON,Math,console,
  document:{createElement:()=>new Element()},
  location:{assign:url=>notices.push(url)},
  window:{ElementleGameResult:{openHistory:data=>notices.push(data)},ElementleFreezes:{consume:data=>notices.push(data)}},localStorage:{getItem:()=>null}});
const stats=fs.readFileSync(path.join(__dirname,'stats.js'),'utf8');
vm.runInContext(stats.replace(/initializeStats\(\);\s*$/,''),context);
context.root=root;
vm.runInContext('updateCalendar = initializeStreakCalendar(root)',context);
const now=new Date();
const month=now.getFullYear()*10000+(now.getMonth()+1)*100;
context.data={calendar:{[month+1]:'solved',[month+2]:'failed',[month+3]:'missed',[month+4]:'frozen'},analyzableDates:[String(month+1),String(month+2),String(month+4)],elELO:{history:[{date:String(month+1),before:1000,rating:1015,change:15}]},streakFreezes:{available:1,capacity:2,progress:7,earnEvery:10}};
vm.runInContext('updateCalendar(data)',context);
assert.equal(root.querySelector('.js-freeze-count').textContent,'1 / 2');
assert.equal(root.querySelector('.js-freeze-progress').value,7);
const cells=root.querySelector('.js-streak-days').children.filter(cell=>cell.attributes['aria-label']);
assert.match(cells[0].innerHTML,/✓/);
assert.match(cells[1].innerHTML,/×/);
assert.match(cells[2].innerHTML,/−/);
assert.match(cells[3].innerHTML,/❄/);
assert.match(cells[3].attributes['aria-label'],/Streak freeze used/);
assert.equal(cells[0].disabled,false);
assert.equal(cells[1].disabled,false);
assert.equal(cells[2].disabled,true);
assert.equal(cells[3].disabled,false); // A completed loss can also have a freeze.
assert.match(cells[3].innerHTML,/analysis-magnifier/);
assert.match(cells[3].title,/View game result and elELO/);
cells[3].onclick();
assert.equal(notices.at(-1).localDate,String(month+4));
assert.equal(notices.at(-1).historical,true);
cells[0].onclick();
assert.equal(notices.at(-1).elo.change,15); // Rating details are available without Lab membership.
// New account data updates existing cells and balance without rebuilding the page.
context.data={calendar:{[month+4]:'solved'},streakFreezes:{available:0,capacity:2,progress:8,earnEvery:10}};
vm.runInContext('updateCalendar(data)',context);
assert.equal(root.querySelector('.js-freeze-count').textContent,'0 / 2');
const updated=root.querySelector('.js-streak-days').children.filter(cell=>cell.attributes['aria-label']);
assert.match(updated[3].innerHTML,/✓/);
root.querySelector('.js-streak-prev').onclick();
assert.equal(root.querySelector('.js-streak-next').disabled,false);
root.querySelector('.js-streak-next').onclick();
assert.equal(root.querySelector('.js-streak-next').disabled,true);

const body=new Element();const timers=[];const win={addEventListener(){}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'streak-freezes.js'),'utf8'),{
  window:win,document:{body,createElement:()=>new Element(),querySelector:()=>null},
  localStorage:{getItem:()=>null},setTimeout:fn=>{timers.push(fn);return timers.length;},clearTimeout(){},Date
});
win.ElementleFreezes.consume({streakFreezes:{available:1,capacity:2,used:1,earned:false}});
assert.equal(body.children.length,1);
const toast=body.children[0];
assert.equal(toast.attributes.role,'status');
assert.equal(toast.children[1].children[0].textContent,'Streak freeze used');
assert.match(toast.children[1].children[1].textContent,/1 \/ 2 freezes remaining/);
win.ElementleFreezes.consume({streakFreezes:{available:1,capacity:2,used:0,earned:false}});
assert.equal(body.children.length,1); // Refresh never replays a settled freeze.
win.ElementleFreezes.notice('Brilliant!','Solved in 2 / 8 guesses.','win');
assert.equal(body.children.length,1); // Notices queue instead of overlapping.
toast.children[2].onclick();
assert.equal(body.children.length,2);
assert.equal(toast.removed,true);
assert.equal(body.children[1].children[1].children[0].textContent,'Brilliant!');
console.log('Freeze calendar live updates, accessible result markers, balance/progress, month navigation and queued notices pass.');

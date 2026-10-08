const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const files = name => fs.readFileSync(path.join(__dirname, name), 'utf8');
const values = new Map([['elementle_guest_id', 'test-guest']]);
const localStorage = { getItem: key => values.get(key) || null, setItem: (key,value) => values.set(key,value) };
const events = {};
const window = { addEventListener: (name,fn) => events[name] = fn, dispatchEvent: event => events[event.type]?.(event) };
function element() {
  return { children:[], textContent:'', attrs:{}, replaceChildren() { this.children=[]; }, append(child) { this.children.push(child); }, setAttribute(key,value) { this.attrs[key]=value; }, addEventListener() {} };
}
const nodes = Object.fromEntries(['lab-archives','archive-status','archive-month','archive-prev','archive-next','archive-days'].map(key=>['#'+key,element()]));
const pending = [];
const context = vm.createContext({window, localStorage, crypto:{randomUUID:()=> 'test-guest'}, Event: class { constructor(type) {this.type=type;} }, Date,
  document:{ querySelector:selector=>nodes[selector], createElement:element, addEventListener() {}, hidden:false },
  fetch:()=>new Promise(resolve=>pending.push(resolve)) });
const gameWindow = { dispatchEvent() {} };
const gameContext = vm.createContext({window:gameWindow,localStorage,crypto:{randomUUID:()=> 'test-guest'},Event:class{},Date});
vm.runInContext(files('archive-progress.js'),context);
vm.runInContext(files('archive-progress.js'),gameContext);
const yesterday = new Date(); yesterday.setDate(yesterday.getDate()-1);
const date = String(yesterday.getFullYear()*10000+(yesterday.getMonth()+1)*100+yesterday.getDate());
const snapshot = {dates:[Number(date)],progress:{}};
window.ElementleArchiveProgress.cache(snapshot);
vm.runInContext(files('archives.js'),context);
const findDay = ()=>nodes['#archive-days'].children.find(button=>button.textContent.startsWith(String(yesterday.getDate())+' ') || button.textContent===String(yesterday.getDate()));
async function main() {
  // If yesterday belongs to the previous month, show that month first.
  if (yesterday.getMonth() !== new Date().getMonth()) nodes['#archive-prev'].onclick();
  assert.equal(findDay().className,'');
  gameWindow.ElementleArchiveProgress.publish(date,false,false);
  assert.equal(findDay().className,''); // Frozen calendar has not been revisited yet.
  events.pageshow({persisted:true});
  assert.equal(findDay().className,'in-progress'); // Visible before either network reply.
  pending.at(-1)({ok:true,json:async()=>snapshot});
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(findDay().className,'in-progress'); // Stale reply cannot erase progress.
  gameWindow.ElementleArchiveProgress.publish(date,true,true);
  events.storage({key:window.ElementleArchiveProgress.prefix+'test-guest'});
  assert.equal(findDay().className,'complete');
  localStorage.setItem('elementle_token','different-account');
  events.storage({key:'elementle_token'});
  assert.equal(findDay().className,''); // Guest progress does not leak into an account.
  console.log('Archive return navigation, immediate progress, stale-response protection, completion and account isolation pass.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});

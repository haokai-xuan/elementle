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
  return { children:[], textContent:'', attrs:{}, style:{}, replaceChildren(...children) { this.children=children; }, append(child) { this.children.push(child); }, setAttribute(key,value) { this.attrs[key]=value; }, addEventListener() {} };
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
const findDay = ()=>nodes['#archive-days'].children.find(button=>button.attrs['data-date'] === date);
async function main() {
  // If yesterday belongs to the previous month, show that month first.
  if (yesterday.getMonth() !== new Date().getMonth()) nodes['#archive-prev'].onclick();
  assert.equal(findDay().className,'');
  assert.equal(findDay().disabled,true); // Cached availability alone cannot unlock dates.
  gameWindow.ElementleArchiveProgress.publish(date,false,false);
  assert.equal(findDay().className,''); // Frozen calendar has not been revisited yet.
  events.pageshow({persisted:true});
  assert.equal(findDay().className,'in-progress'); // Visible before either network reply.
  pending.at(-1)({ok:true,json:async()=>snapshot});
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(findDay().className,'in-progress'); // Stale reply cannot erase progress.
  assert.equal(findDay().disabled,false); // Fresh server eligibility enables the date.
  gameWindow.ElementleArchiveProgress.publish(date,true,true);
  events.storage({key:window.ElementleArchiveProgress.prefix+'test-guest'});
  assert.equal(findDay().className,'complete');
  // Existing local progress cannot override the server's worldwide date cutoff.
  events.focus();
  pending.at(-1)({ok:true,json:async()=>({dates:[],progress:{},archiveCutoff:Number(date)})});
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(findDay().className,'complete');
  assert.equal(findDay().disabled,true);
  localStorage.setItem('elementle_token','different-account');
  events.storage({key:'elementle_token'});
  assert.equal(findDay().className,''); // Guest progress does not leak into an account.
  // Free membership never requests a paid archive endpoint.
  window.ElementleLab={ready:Promise.resolve({isLab:false})};
  const requestsBeforeFree=pending.length;
  events.focus();await new Promise(resolve=>setImmediate(resolve));
  assert.equal(pending.length,requestsBeforeFree);
  assert.equal(nodes['#archive-status'].children[0].href,'/lab');
  // A newly activated subscription makes the calendar fetch eligibility again.
  window.ElementleLab.ready=Promise.resolve({isLab:true});
  events['elementle:lab-change']({detail:{isLab:true}});
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(pending.length,requestsBeforeFree+1);
  pending.at(-1)({ok:true,json:async()=>snapshot});
  await new Promise(resolve=>setImmediate(resolve));
  const beforeCached=pending.length;events.focus();await new Promise(resolve=>setImmediate(resolve));
  assert.equal(pending.length,beforeCached); // Recent verified availability skips a repeat fetch.
  const saved=window.ElementleArchiveProgress.read();saved.snapshotAt=Date.now()-31000;
  localStorage.setItem(window.ElementleArchiveProgress.prefix+'different-account',JSON.stringify(saved));
  events.focus();await new Promise(resolve=>setImmediate(resolve));assert.equal(pending.length,beforeCached+1);
  console.log('Archive return navigation, immediate progress, stale-response protection, completion and account isolation pass.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});

const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const values=new Map([['elementle_guest_id','test-guest']]);
const localStorage={getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value)};
const events={},pending=[];
function element(){return {children:[],textContent:'',attrs:{},style:{},handlers:{},replaceChildren(...children){this.children=children;},append(child){this.children.push(child);},setAttribute(key,value){this.attrs[key]=value;},addEventListener(name,fn){this.handlers[name]=fn;}};}
const nodes=Object.fromEntries(['lab-archives','archive-status','archive-month','archive-prev','archive-next','archive-days'].map(key=>['#'+key,element()]));
const window={ElementleLab:{status:{isLab:false},ready:new Promise(()=>{})},ElementleStatsReady:new Promise(()=>{}),addEventListener:(name,fn)=>events[name]=fn,dispatchEvent:event=>events[event.type]?.(event)};
const location={hash:'#lab-archives'};
const context=vm.createContext({window,localStorage,location,crypto:{randomUUID:()=> 'test-guest'},Event:class{constructor(type){this.type=type;}},Date,
 document:{querySelector:selector=>nodes[selector],createElement:element,addEventListener(){},hidden:false},fetch:()=>new Promise(resolve=>pending.push(resolve))});
const source=name=>fs.readFileSync(__dirname+'/'+name,'utf8');
vm.runInContext(source('archive-progress.js'),context);
const yesterday=new Date();yesterday.setDate(yesterday.getDate()-1);
const date=String(yesterday.getFullYear()*10000+(yesterday.getMonth()+1)*100+yesterday.getDate());
const snapshot={dates:[Number(date)],progress:{}};
vm.runInContext(source('archives.js'),context);
const day=()=>nodes['#archive-days'].children.find(button=>button.attrs['data-date']===date);
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function expire(){const entry=window.ElementleArchiveProgress.read();entry.snapshotAt=Date.now()-301000;values.set(window.ElementleArchiveProgress.prefix+(values.get('elementle_token')||'test-guest'),JSON.stringify(entry));}
(async()=>{
 if(yesterday.getMonth()!==new Date().getMonth())nodes['#archive-prev'].onclick();
 assert.equal(pending.length,1);assert.equal(day().className,'archive-checking');
 events.focus();assert.equal(pending.length,1); // Share overlapping checks without waiting for Stats/Lab.
 pending[0]({ok:true,json:async()=>snapshot});await flush();
 assert.equal(day().disabled,false);assert.equal(day().className,'archive-available'); // Nonmembers can browse and select.
 day().handlers.click();assert.equal(location.href,'/?mode=archive&date='+date);
 window.ElementleArchiveProgress.publish(date,true,true);
 assert.match(day().className,/complete/);
 events.pageshow({persisted:true});await flush();assert.equal(pending.length,1); // Recent cache is independent of membership.
 expire();events.focus();assert.equal(pending.length,2);
 pending[1]({ok:true,json:async()=>({dates:[],progress:{},archiveCutoff:Number(date)})});await flush();
 assert.equal(day().disabled,true);assert.match(day().title,/every timezone/);
 values.set('elementle_token','different-account');events.storage({key:'elementle_token'});
 assert.equal(day().className,'archive-checking');assert.equal(pending.length,3);
 pending[2]({ok:true,json:async()=>snapshot});await flush();assert.equal(day().disabled,false);
 expire();events.focus();pending[3]({ok:false,json:async()=>({error:'Unavailable'})});await flush();
 assert.match(nodes['#archive-status'].textContent,/Could not check/);assert.equal(nodes['#archive-status'].children.at(-1).textContent,'Retry');
 console.log('Public archive browsing, clickable dates, progress merging, cache reuse, request deduplication, cutoff, account isolation and retry pass.');
})().catch(error=>{console.error(error);process.exitCode=1;});

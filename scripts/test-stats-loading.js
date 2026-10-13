const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(__dirname + '/stats.js', 'utf8').replace(/initializeStats\(\);\s*$/, '');
const storage = new Map([['elementle_token', 'account-one']]), session = new Map();
const events = {}, documentEvents = {}, pending = [], updates = [];
let communityLoads = 0, leaderLoads = 0;
const nodes = new Map();
const node = selector => {
  if (!nodes.has(selector)) nodes.set(selector, {textContent:'—', hidden:selector === '.js-elelo-board'});
  return nodes.get(selector);
};
const classes=new Set(),attrs={};
const root = {querySelector:node,addEventListener(){},classList:{toggle(name,active){if(active)classes.add(name);else classes.delete(name);}},setAttribute(name,value){attrs[name]=value;}};
const context = vm.createContext({
  console, TextEncoder, AbortSignal,
  crypto:{subtle:{digest:async(algorithm,bytes)=>bytes.buffer}},
  localStorage:{getItem:key=>storage.get(key) || null},
  sessionStorage:{getItem:key=>session.get(key),setItem:(key,value)=>session.set(key,value)},
  window:{addEventListener:(name,fn)=>events[name]=fn,ElementleElo:{
    refreshLeaderboard:()=>{leaderLoads++;},update(){}
  }},
  document:{hidden:false,querySelector:()=>root,addEventListener:(name,fn)=>documentEvents[name]=fn},
  setInterval(){},
  fetch:(url,options)=>new Promise(resolve=>pending.push({url,options,resolve})),
  renderStatsPage(){},
  collect:data=>updates.push(data),
  community:()=>{communityLoads++;}
});
vm.runInContext(source,context);
vm.runInContext(`
  renderStatsPage = () => {};
  initializeCommunityDistribution = community;
  initializeStreakCalendar = () => data => collect(data);
  updateStatValues = () => {};
  updateDistributionBars = () => {};
  syncStatsSwipeViewportHeight = () => {};
`,context);
const flush = () => new Promise(resolve=>setImmediate(resolve));
const response = {totalWins:3, totalGamesPlayed:4,guessDistribution:{1:3},calendar:{},elELO:{rating:420},streakFreezes:{available:1,used:1}};
(async()=>{
  const initial=vm.runInContext('initializeStats()',context);
  await flush();
  assert.equal(pending.length,1);
  assert.equal(attrs['aria-busy'],'true');assert.equal(classes.has('stats-initial-loading'),true);
  assert.match(pending[0].url,/user\/stats/);
  assert.equal(communityLoads,0);assert.equal(leaderLoads,0);
  events.focus();documentEvents.visibilitychange();await flush();
  assert.equal(pending.length,1); // Overlapping focus/visibility requests share one fetch.
  pending[0].resolve({ok:true,json:async()=>response});await initial;await flush();
  assert.equal(communityLoads,1);assert.equal(updates.at(-1).elELO.rating,420);
  assert.equal(attrs['aria-busy'],'false');assert.equal(classes.has('stats-is-loading'),false);
  await events.focus();await flush();
  assert.equal(pending.length,1); // Recent personal data is reused.
  assert.equal(updates.at(-1).streakFreezes.used,0); // Cached notifications do not replay.
  events['elementle:game-complete']();await flush();
  assert.equal(pending.length,2); // A completed game forces a new snapshot.
  pending[1].resolve({ok:true,json:async()=>response});await flush();
  storage.set('elementle_token','account-two');events['elementle:auth-change']();await flush();
  assert.equal(pending.length,3);assert.equal(pending[2].options.headers.Authorization,'Bearer account-two');
  pending[2].resolve({ok:true,json:async()=>({...response,totalWins:0})});await flush();
  assert.equal(updates.at(-1).totalWins,0);
  context.location={hash:'#lab-archives'};
  const beforeArchivePriority=pending.length;
  const archiveInitial=vm.runInContext('initializeStats()',context);
  await flush();
  assert.equal(pending.length,beforeArchivePriority); // Do not compete with the requested archive calendar.
  assert.equal(typeof events['elementle:archives-ready'],'function');
  events['elementle:archives-ready']();await flush();
  assert.equal(pending.length,beforeArchivePriority+1); // Personal Stats starts once archives finish.
  pending.at(-1).resolve({ok:true,json:async()=>({...response,totalWins:0})});
  await archiveInitial;await flush();
  console.log('Stats loading, archive priority, overlapping refresh deduplication, cache reuse, game invalidation, notification suppression and account isolation pass.');
})().catch(error=>{console.error(error);process.exitCode=1;});

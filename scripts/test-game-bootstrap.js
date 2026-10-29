const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {parseHTML}=require('linkedom');
const {readPage}=require('../lib/page-template');
const earlySource=fs.readFileSync(__dirname+'/daily-bootstrap.js','utf8');
const gameSource=fs.readFileSync(__dirname+'/elementle.js','utf8');
async function run(token,mode='',source=earlySource) {
  let count=0,release;
  const context=vm.createContext({window:{},Date,URLSearchParams,AbortSignal,location:{search:mode?'?mode='+mode:''},localStorage:{getItem:()=>token},API_BASE:'/api',
    fetch:(url,options)=>{count++;assert.equal(options.cache,token?'no-store':'default');if(token)assert.equal(options.headers.Authorization,'Bearer '+token);return new Promise(resolve=>release=resolve);},
    getElementFromAtomicNumber:n=>({atomicNumber:n})});
  vm.runInContext(source,context);
  if(mode){assert.equal(count,0);assert.equal(context.window.ElementleDailyBootstrap,undefined);return;}
  assert.equal(count,1); // Network starts before the main controller.
  const early=context.window.ElementleDailyBootstrap;
  let pending;
  if(token){
    vm.runInContext(gameSource.slice(gameSource.indexOf('async function fetchGameBootstrap('),gameSource.indexOf('function renderFromLocalCache()')),context);
    pending=context.fetchGameBootstrap(early.date,token);
  }else{
    vm.runInContext(gameSource.slice(gameSource.indexOf('async function fetchMysteryElementForDate('),gameSource.indexOf('function getElementFromAtomicNumber(')),context);
    pending=context.fetchMysteryElementForDate(early.date);
  }
  assert.equal(count,1); // Consuming the early result never duplicates the request.
  release({ok:true,status:200,json:async()=>({atomic_number:26,game:{guesses:[]}})});
  const result=await pending;
  assert.equal(token?result.atomic_number:result.atomicNumber,26);
}
(async()=>{
  await run('account-token');await run(null);await run('account-token','freeplay');await run('account-token','archive');
  const html=fs.readFileSync(__dirname+'/../index.html','utf8');
  assert.ok(html.indexOf('scripts/daily-bootstrap.js')<html.indexOf('scripts/elementle.js'));
  assert.doesNotMatch(html,/src="https:\/\/cdn.jsdelivr.net\/npm\/canvas-confetti|src="\/\/cdnjs.cloudflare.com\/ajax\/libs\/seedrandom/);
  const rendered=readPage(require('node:path').resolve(__dirname,'..'),'index');
  const {document}=parseHTML(rendered);
  const inline=document.querySelector('[data-game-bootstrap="daily-bootstrap"]');
  assert.ok(inline && !inline.hasAttribute('src'));
  assert.equal(document.querySelectorAll('[data-game-bootstrap]').length,2);
  assert.equal(document.querySelector('[data-game-bootstrap="practice-bootstrap"]').textContent,
    fs.readFileSync(__dirname+'/practice-bootstrap.js','utf8'));
  assert.ok(rendered.indexOf('data-game-bootstrap="daily-bootstrap"')<rendered.indexOf('rel="stylesheet"'));
  for (const script of document.querySelectorAll('script[src]')) {
    if (/^https?:/.test(script.getAttribute('src'))) continue;
    assert.ok(script.hasAttribute('defer'),script.getAttribute('src')+' must not block HTML parsing');
  }
  assert.equal(document.querySelector('script[src="/scripts/daily-bootstrap.js"]'),null);
  await run('account-token','',inline.textContent);await run(null,'',inline.textContent);
  console.log('Inline daily startup needs no script download, deferred dependencies preserve order, guest caching and single authenticated bootstrap pass.');
})().catch(error=>{console.error(error);process.exitCode=1;});

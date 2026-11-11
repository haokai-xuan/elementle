const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const routes = new Map();
require('../lib/admin-page')({get(paths, handler) {for (const path of [].concat(paths)) routes.set(path, handler);}}, {
  rootDir:require('node:path').resolve(__dirname, '..'),apiBaseUrl:'https://api.example',apiKey:'unit'
});
function result() {
  return {code:200,headers:{},body:'',set(k,v){this.headers[k]=v;return this;},vary(){return this;},type(){return this;},status(code){this.code=code;return this;},end(){return this;},send(body){this.body=body;return this;}};
}
const originalFetch = global.fetch;
(async () => {
  for (const path of ['/admin','/admin.html']) {
    const res=result();routes.get(path)({},res);
    assert.match(res.body, /admin-entry.js/);
    assert.match(res.body, /<body><\/body>/);
    assert.doesNotMatch(res.body, /Lab access|admin-search|admin-users|admin\.js|Sign in/);
    assert.equal(res.headers['Cache-Control'],'private, no-store');
  }
  let calls=0;
  global.fetch=async()=>{calls++;return {ok:false};};
  let res=result();await routes.get('/api/admin/page')({headers:{}},res);
  assert.equal(res.code,404);assert.equal(res.body,'');assert.equal(calls,0);
  res=result();await routes.get('/api/admin/page')({headers:{authorization:'Bearer nonadmin'}},res);
  assert.equal(res.code,404);assert.equal(res.body,'');
  global.fetch=async()=>({ok:true,json:async()=>({isAdmin:false})});
  res=result();await routes.get('/api/admin/page')({headers:{authorization:'Bearer fake'}},res);
  assert.equal(res.code,404);assert.equal(res.body,'');
  global.fetch=async()=>{throw new Error('offline');};
  res=result();await routes.get('/api/admin/page')({headers:{authorization:'Bearer token'}},res);
  assert.equal(res.code,404);assert.equal(res.body,'');
  global.fetch=async(url,options)=>{
    assert.equal(url,'https://api.example/admin/me');assert.equal(options.headers.Authorization,'Bearer admin');
    return {ok:true,json:async()=>({isAdmin:true})};
  };
  res=result();await routes.get('/api/admin/page')({headers:{authorization:'Bearer admin'}},res);
  assert.equal(res.code,200);assert.match(res.body,/id="admin-search"/);assert.match(res.body,/<body[^>]* hidden>/);
  const source=fs.readFileSync(__dirname+'/admin-entry.js','utf8');
  async function entry(token, ok, stale=false) {
    let writes=0,requests=0,reads=0;
    await vm.runInNewContext(source, {
      localStorage:{getItem:()=>++reads > 1 && stale ? null : token},
      fetch:async()=>{requests++;return {ok,text:async()=>'<html>authorized</html>'};},
      document:{open(){},write(){writes++;},close(){}}
    });
    return {writes,requests};
  }
  assert.deepEqual(await entry(null,false),{writes:0,requests:0});
  assert.deepEqual(await entry('nonadmin',false),{writes:0,requests:1});
  assert.deepEqual(await entry('admin',true,true),{writes:0,requests:1});
  assert.deepEqual(await entry('admin',true),{writes:1,requests:1});
  console.log('Admin page: blank navigation, server authorization, empty denied responses, fail-closed loading and session changes pass.');
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>{global.fetch=originalFetch;});

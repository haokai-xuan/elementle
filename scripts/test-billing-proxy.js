const assert=require('node:assert/strict');
const setup=require('../lib/lab-proxy');
const routes=new Map();
setup({get:(path,fn)=>routes.set(path,fn),post:(path,fn)=>routes.set(path,fn)}, {apiBaseUrl:'https://api.example',apiKey:'unit'});
const original=global.fetch;
(async()=>{
  global.fetch=async()=>({status:200,headers:{get:()=> 'billing;dur=12.0, db_read;dur=10.0'},json:async()=>({isLab:true})});
  const res={headers:{},set(key,value){this.headers[key]=value;return this;},status(code){this.code=code;return this;},json(data){this.data=data;return this;}};
  await routes.get('/api/billing/status')({headers:{authorization:'Bearer unit'},query:{}},res);
  assert.equal(res.code,200);assert.equal(res.data.isLab,true);
  assert.match(res.headers['Server-Timing'],/billing;dur=12.0.*proxy;dur=/);
  assert.equal(res.headers['Cache-Control'],'no-store');
  console.log('Billing proxy forwards backend timings without caching authenticated responses.');
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>{global.fetch=original;});

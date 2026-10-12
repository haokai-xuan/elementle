const assert = require('node:assert/strict');
const { tier, aggregate } = require('./vault-progress');
assert.deepEqual([[0,0],[1,0],[2,0],[3,0],[3,1],[5,2],[5,3]].map(v=>tier(...v)),[0,1,2,2,3,3,4]);
const records = [
 {number:26,date:'2026-10-07',won:true,guesses:1,hint:false},
 {number:26,date:'2026-10-08',won:true,guesses:3,hint:false},
 {number:26,date:'2026-10-09',won:false,guesses:8,hint:true},
 {number:26,date:'2026-10-10',won:true,guesses:5,hint:true},
 {number:26,date:'2026-10-11',won:false,guesses:2,hint:false},
 {number:8,date:'2026-10-11',won:false,guesses:8,hint:false}
];
const stats=aggregate(records,'2026-10-08');
assert.deepEqual(stats[26],{encounters:4,solved:2,clean:1,totalGuesses:8,fewest:3,firstSolved:'2026-10-08',last:'2026-10-11',tier:2});
assert.equal(stats[8].tier,0);
assert.equal(Object.keys(aggregate(records,'2026-10-12')).length,0);
const pages=require('../lib/vault-pages').createVaultPages(require('node:path').join(__dirname,'..'));
assert.equal(pages.details.size,118);
assert.match(pages.overview,/id="verify-vault"/);
assert.match(pages.details.get('118'),/data-number="118"/);
assert.doesNotMatch(pages.details.get('118'),/class="vault-entry"/);
assert.match(pages.overview,/class="detail-header"/);
assert.doesNotMatch(pages.overview,/<a href="\/vault">Vault<\/a>/);
for (const page of pages.details.values()) assert.doesNotMatch(page,/class="detail-header"|aria-label="Main navigation"/);
console.log('Vault cutoff, statistics, hint-gated tiers, loss/in-progress encounters, and all 118 routes pass.');
const vm=require('node:vm'), fs=require('node:fs');
const storage=new Map();
const context=vm.createContext({localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)}});
vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'vault-progress.js'),'utf8'),context);
vm.runInContext(`ElementleVault.recordGuest({number:26,date:'2026-10-08',guesses:1,won:false,hint:false});
ElementleVault.recordGuest({number:26,date:'2026-10-08',guesses:2,won:true,hint:false});`,context);
assert.equal(vm.runInContext('ElementleVault.guestRecords().length',context),1);
assert.equal(vm.runInContext("ElementleVault.aggregate(ElementleVault.guestRecords(),'2026-10-08')[26].solved",context),1);
storage.set('elementle_token','account-token');
vm.runInContext("ElementleVault.recordGuest({number:8,date:'2026-10-09',guesses:1,won:true,hint:false})",context);
assert.equal(vm.runInContext('ElementleVault.guestRecords().length',context),1);
console.log('Guest records deduplicate repeat updates and exclude signed-in game writes.');

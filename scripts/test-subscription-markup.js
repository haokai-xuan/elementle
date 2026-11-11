const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { parseHTML } = require('linkedom');
const html = fs.readFileSync(__dirname + '/../lab.html', 'utf8');
const source = fs.readFileSync(__dirname + '/subscription.js', 'utf8');
async function verify(legacy) {
  const { document } = parseHTML(html);
  if (legacy) {
    const links = document.createElement('div');
    links.id = 'lab-feature-links';
    links.innerHTML = '<a href="/?mode=freeplay">Play Freeplay</a><a href="/?mode=archive">Archives</a><a href="/vault">Open Vault</a>';
    document.getElementById('lab-plans').before(links);
    document.getElementById('lab-secure').removeAttribute('id');
    document.querySelectorAll('[hidden]').forEach(node=>node.hidden=false);
  }
  const events = {};
  const status = {isLab:true,complimentaryActive:true,complimentaryExpiresAt:1900000000,hasSubscription:false,canManage:false,trialEligible:true,status:'none'};
  await vm.runInNewContext(source, {
    document, window:{ElementleLab:{ready:Promise.resolve(status)},addEventListener(name,handler){events[name]=handler;}},
    localStorage:{getItem:()=> 'token'},location:{search:''},URLSearchParams,Date
  });
  assert.equal(document.getElementById('lab-membership').textContent,'Complimentary membership');
  for (const selector of ['#lab-plans','#lab-disclosure','.lab-secure','#lab-manage','.lab-trial-highlight']) assert.equal(document.querySelector(selector).hidden,true,selector);
  assert.equal(document.getElementById('lab-feature-links'),null);
  assert.match(document.getElementById('lab-message').textContent,/No payment required/);
  assert.doesNotMatch(document.getElementById('lab-message').textContent,/Cannot set|properties of null/);
  events['elementle:lab-change']({detail:{...status,complimentaryExpiresAt:null}});
  assert.equal(document.querySelectorAll('#lab-feature-links').length,0);
  assert.match(document.getElementById('lab-message').textContent,/lifetime access/);
  events['elementle:lab-change']({detail:{status:'none',isLab:false,trialEligible:true,canManage:false}});
  assert.equal(document.getElementById('lab-plans').hidden,false);
  assert.equal(document.querySelector('.lab-secure').hidden,false);
  assert.equal(document.getElementById('lab-feature-links'),null);
}
(async()=>{await verify(false);await verify(true);console.log('Current and older Lab HTML render complimentary membership without billing prompts or null-element failures.');})().catch(error=>{console.error(error);process.exitCode=1;});

/* Extract public, static translation sources. No user data is included. */
const fs = require('node:fs');
const path = require('node:path');
const acorn = require('acorn');
const walk = require('acorn-walk');
const {parseHTML} = require('linkedom');
const sources = new Set();
function add(value) {
  if (typeof value !== 'string') return;
  value = value.replace(/\s+/g, ' ').trim();
  if (/^[a-z]+:[a-z:-]+$/.test(value) || /^[0-9A-F]{6}$/.test(value) || ['GET','POST','INPUT','SCRIPT','SELECT','TEXTAREA','ELEME','TLE','UTC'].includes(value)) return;
  if (/^(?:[.#/]|--|&\w+;|\(prefers-|\{\d+\}$)/.test(value)) return;
  if (!/[a-zA-Z]{2}/.test(value) || /https?:\/\/|^[/#.][\w/]|^[\w]+[-_][\w_-]+$|^\w*[a-z]\w*[A-Z]\w*$|^[a-z]+\.[a-z]+$/.test(value)) return;
  if (/^[\w]+$/.test(value) && /^[a-z]/.test(value)) return;
  sources.add(value);
}
function markup(value) {
  const {document} = parseHTML('<html><body>'+value+'</body></html>');
  document.normalize();
  const visit = node => {
    if (node.nodeType === 3) add(node.textContent);
    if (node.nodeType === 1) {
      if (['SCRIPT','STYLE','SVG'].includes(node.tagName)) return;
      for (const attr of ['placeholder','title','alt','aria-label']) add(node.getAttribute(attr));
    }
    for (const child of node.childNodes || []) visit(child);
  };
  visit(document.body);
}
for (const dir of ['.','scripts','lib','data']) {
  for (const file of fs.readdirSync(dir)) {
    if (!/\.(?:html|js)$/.test(file) || /^(?:test-|audit-|extract-i18n|i18n|locales)/.test(file) || ['social-auth.js','lab-proxy.js','dev.js'].includes(file)) continue;
    const source = fs.readFileSync(path.join(dir,file),'utf8');
    if (file.endsWith('.html')) {markup(source); continue;}
    const tree = acorn.parse(source,{ecmaVersion:'latest',sourceType:'script'});
    walk.simple(tree, {
      Literal(node) {if (typeof node.value === 'string') node.value.includes('<') ? markup(node.value) : add(node.value);},
      TemplateLiteral(node) {
        const text = node.quasis.map((q,i)=>(q.value.cooked || '')+(i<node.expressions.length?'{'+i+'}':'')).join('');
        text.includes('<') ? markup(text) : add(text);
      }
    });
  }
}
for (const element of require('../data/element-reference.json')) {
  for (const key of ['name','family','summary','appearance','discoveredBy']) add(element[key]);
  for (const [key,value] of Object.entries(element.attributes)) {add(key);add(value);}
}
for (const text of ['Settings','Language','Choose the language for the game, hints, and pages. Your choice is saved in this browser.','Language saved.','Could not save your language. Check your browser storage settings.']) add(text);
fs.writeFileSync('data/i18n-source.json',JSON.stringify([...sources].sort(),null,2)+'\n');
console.log(`${sources.size} public translation sources`);

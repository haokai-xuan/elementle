/* Extract public, static translation sources. No user data is included. */
const fs = require('node:fs');
const path = require('node:path');
const acorn = require('acorn');
const walk = require('acorn-walk');
const {parseHTML} = require('linkedom');
const sources = new Set();
function add(value, visible = false) {
  if (typeof value !== 'string') return;
  value = value.replace(/\s+/g, ' ').trim();
  if (/^[a-z]+:[a-z:-]+$/.test(value) || /^[0-9A-F]{6}$/.test(value) || ['GET','POST','INPUT','SCRIPT','SELECT','TEXTAREA','ELEME','TLE','UTC','ot','translate="no"'].includes(value)) return;
  if (!visible && /^(?:[.#/]|--|&\w+;|\(prefers-|\{\d+\}$)/.test(value)) return;
  if (!/[a-zA-Z]{2}/.test(value) || /https?:\/\/|^[/#.][\w/]|^[\w]+[-_][\w_-]+$|^\w*[a-z]\w*[A-Z]\w*$|^[a-z]+\.[a-z]+$/.test(value)) return;
  if (!visible && /^[\w]+$/.test(value) && /^[a-z]/.test(value)) return;
  sources.add(value);
}
function markup(value) {
  const {document} = parseHTML('<html><body>'+value+'</body></html>');
  document.normalize();
  const visit = node => {
    if (node.nodeType === 3) add(node.textContent, true);
    if (node.nodeType === 1) {
      if (['SCRIPT','STYLE'].includes(node.tagName)) return;
      if (node.matches('meta[name="description"], meta[property="og:title"], meta[property="og:description"]')) add(node.getAttribute('content'),true);
      for (const attr of ['placeholder','title','alt','aria-label','aria-valuetext','data-i18n']) add(node.getAttribute(attr), true);
      if (node.hasAttribute('data-i18n')) return;
    }
    for (const child of node.childNodes || []) visit(child);
  };
  visit(document.body);
}
for (const dir of ['.','scripts','lib','data']) {
  for (const file of fs.readdirSync(dir)) {
    if (!/\.(?:html|js)$/.test(file) || /^(?:test-|audit-|extract-i18n|i18n|locales)/.test(file) || ['social-auth.js','lab-proxy.js','ad-session.js','ad-guard.js','public-assets.js','dev.js'].includes(file)) continue;
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
for (const text of ['Settings','Language','Choose the language for the game, hints, and pages. Your choice is saved in this browser.','Language saved.','Could not save your language. Check your browser storage settings.','daily solves']) add(text);
// These words are interpolated into visible labels, rather than rendered alone.
for (const text of ['answer','answers','bits','feedback','eliminated','rating','efficiency','information','independence','game rating','guess efficiency','information gain','solve','solves','gained','lost','unchanged','monthly','yearly']) add(text,true);
for (const element of require('../data/element-reference.json')) add(element.family.toLowerCase(),true);
// Structural accessibility labels translate the names/families in their slots.
sources.add('{0}. {1} ({2}), {3}');
sources.add('{0}. {1} ({2})');
sources.add('{0} · {1}');
add('estimated',true);
const output=JSON.stringify([...sources].sort(),null,2)+'\n';
if (process.argv.includes('--check')) {
  if (fs.readFileSync('data/i18n-source.json','utf8') !== output) throw new Error('Translation sources changed. Run npm run i18n:extract and update every language catalog.');
} else fs.writeFileSync('data/i18n-source.json',output);
console.log(`${sources.size} public translation sources`);

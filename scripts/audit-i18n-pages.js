/* Check rendered public pages, including text assembled by server templates. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {parseHTML} = require('linkedom');
module.exports = function auditPages(i18n,catalog) {
  const root = path.resolve(__dirname,'..');
  const elements = require('../lib/element-pages').createElementPages(root);
  const vault = require('../lib/vault-pages').createVaultPages(root);
  const pages = [['elements',elements.overview],...elements.details,
    ['vault',vault.overview],...vault.details,
    ['analysis',require('../lib/analysis-page')(root)],
    ['saved game',require('../lib/game-history-page')(root)]];
  for (const file of fs.readdirSync(root).filter(file=>file.endsWith('.html'))) pages.push([file,require('../lib/page-template').readPage(root,file.slice(0,-5))]);
  const canonical = new Set(['PubChem','Periodic-Table-JSON','ELEME','TLE','El','ot']);
  function mapped(text) {
    text = text.replace(/\s+/g,' ').trim();
    if (!/[a-zA-Z]{2}/.test(text) || Object.hasOwn(catalog,text) || i18n.t(text) !== text || canonical.has(text)) return true;
    // Some element names are spelled identically in French and English.
    const named = text.match(/^\d+\. (.+) \([A-Z][a-z]?\)$/);
    if (named) return mapped(named[1]);
    const tile = text.match(/^\d+\. (.+) \([A-Z][a-z]?\), (.+)$/);
    if (tile) return mapped(tile[1]) && mapped(tile[2]);
    const numbered = text.match(/^\d+ · (.+)$/);
    return numbered ? mapped(numbered[1]) : false;
  }
  for (const [name,html] of pages) {
    const {document} = parseHTML(html);
    document.normalize();
    function visit(node) {
      const parent = node.nodeType === 1 ? node : node.parentElement;
      if (!parent || parent.closest('script,style,code,pre,textarea,[translate="no"],.home-logo,.nav-text,.cell-symbol,.symbol,.reveal-answer-symbol')) return;
      if (node.nodeType === 3) assert.ok(mapped(node.textContent),`${name}: unmapped rendered text: ${node.textContent.trim()}`);
      if (node.nodeType === 1) {
        if (node.hasAttribute('data-i18n')) {
          assert.ok(mapped(node.getAttribute('data-i18n')),`${name}: unmapped complete label`);
          return;
        }
        const attributes = ['placeholder','title','alt','aria-label','aria-valuetext'];
        if (node.matches('meta[name="description"],meta[property="og:title"],meta[property="og:description"]')) attributes.push('content');
        for (const attr of attributes) if (node.hasAttribute(attr)) assert.ok(mapped(node.getAttribute(attr)),`${name}: unmapped ${attr}: ${node.getAttribute(attr)}`);
        for (const child of node.childNodes) visit(child);
      }
    }
    visit(document.documentElement);
  }
  return pages.length;
};

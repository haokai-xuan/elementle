const assert = require('node:assert/strict');
const path = require('node:path');
const { createElementPages, elements } = require('../lib/element-pages');

const pages = createElementPages(path.join(__dirname, '..')).details;
assert.equal(pages.size, 118, 'all 118 element detail pages must be generated');

const editorialBlocks = new Map();
for (const element of elements) {
  const html = pages.get(String(element.number));
  assert.ok(html, `missing page for ${element.name}`);
  assert.match(html, new RegExp(`<h1>${element.name}</h1>`), `${element.name} needs its own heading`);
  assert.match(html, /Three reasons .* stands out/, `${element.name} needs signature facts`);

  const article = html.match(/<article class="element-description">([\s\S]*?)<\/article>/)?.[1] || '';
  const plainText = article
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  assert.ok(plainText.length >= 1000, `${element.name} editorial content is too thin (${plainText.length} characters)`);

  const blocks = [...article.matchAll(/<(?:p|li)>[\s\S]*?<\/(?:p|li)>/g)]
    .map(match => match[0].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(text => text.length >= 40);
  for (const block of blocks) {
    assert.ok(!editorialBlocks.has(block), `${element.name} repeats editorial copy from ${editorialBlocks.get(block)}`);
    editorialBlocks.set(block, element.name);
  }
}

const normalizedArticles = [...pages.values()].map(html =>
  html.match(/<article class="element-description">([\s\S]*?)<\/article>/)?.[1]
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
);
assert.equal(new Set(normalizedArticles).size, 118, 'every element article must be unique');

console.log(`Audited ${pages.size} element pages: all are substantial and no editorial block is duplicated.`);

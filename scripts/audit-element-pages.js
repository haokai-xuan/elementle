const assert = require('node:assert/strict');
const path = require('node:path');
const { createElementPages, elements } = require('../lib/element-pages');
const stories = require('../data/element-stories');

const pages = createElementPages(path.join(__dirname, '..')).details;
assert.equal(pages.size, 118, 'all 118 element detail pages must be generated');
assert.equal(stories.length, 118, 'all 118 elements need static editorial stories');

const editorialBlocks = new Map();
for (const element of elements) {
  const html = pages.get(String(element.number));
  assert.ok(html, `missing page for ${element.name}`);
  assert.match(html, new RegExp(`<h1>${element.name}</h1>`), `${element.name} needs its own heading`);
  assert.match(html, new RegExp(`Three reasons ${element.name} stands out`), `${element.name} needs its three hints`);
  const hintSection = html.match(/<section class="element-signatures"[\s\S]*?<\/section>/)?.[0] || '';
  assert.equal((hintSection.match(/<li>/g) || []).length, 3, `${element.name} needs exactly three hints`);
  assert.equal((html.match(/class="element-editorial"/g) || []).length, 1, `${element.name} needs one static editorial story`);
  const story = stories[element.number - 1];
  assert.ok(story.title.length >= 12, `${element.name} needs an interesting story title`);
  assert.ok(story.body.length >= 180, `${element.name} static story is too short`);
  assert.ok(html.includes(story.body.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;')), `${element.name} must render its stored static copy`);

  const article = html.match(/<article class="element-description">([\s\S]*?)<\/article>/)?.[1] || '';
  const plainText = article
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  assert.ok(plainText.length >= 650, `${element.name} page content is too thin (${plainText.length} characters)`);

  const blocks = [...article.matchAll(/<(?:p|li)>[\s\S]*?<\/(?:p|li)>/g)]
    .map(match => match[0].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(text => text.length >= 40);
  for (const block of blocks) {
    assert.ok(!editorialBlocks.has(block), `${element.name} repeats editorial copy from ${editorialBlocks.get(block)}`);
    editorialBlocks.set(block, element.name);
  }
}

const sentences = new Map();
for (const element of elements) {
  const article = pages.get(String(element.number)).match(/<article class="element-description">([\s\S]*?)<\/article>/)?.[1] || '';
  const editorial = [...article.matchAll(/<section class="element-editorial">([\s\S]*?)<\/section>/g)].map(match => match[1]).join(' ');
  const prose = editorial.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  for (const sentence of prose.split(/(?<!\b[A-Z]\.)(?<=[.!?])\s+(?=[A-Z])/)) {
    const normalized = sentence.trim();
    if (normalized.length < 45) continue;
    assert.ok(!sentences.has(normalized), `${element.name} repeats a sentence from ${sentences.get(normalized)}`);
    sentences.set(normalized, element.name);
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

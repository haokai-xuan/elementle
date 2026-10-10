const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, 'stats.js'), 'utf8');
const context = vm.createContext({
  window:{},
  localStorage: { getItem: key => key === 'guessDistribution' ? JSON.stringify({1:1,2:2,X:4}) : '0' },
  ResizeObserver: class { observe() {} },
});
// Exercise the actual template for guests and accounts without starting network requests.
vm.runInContext(fs.readFileSync(require.resolve('./elelo.js'),'utf8'), context);
context.window.ElementleElo.initialize = () => {};
vm.runInContext(source.replace(/initializeStats\(\);\s*$/, ''), context);
vm.runInContext('bindLeaderboardToggle = () => {}; syncStatsSwipeViewportHeight = () => {};', context);
for (const loading of [false, true]) {
  const root = { innerHTML:'', querySelector: () => ({}) };
  context.root = root;
  context.loading = loading;
  vm.runInContext('renderStatsPage(root, loading)',context);
  assert.match(root.innerHTML,/Statistics/);
  assert.match(root.innerHTML,/js-elelo-rating/);
  assert.match(root.innerHTML,/Only completed main games played while signed in count/);
  assert.match(root.innerHTML,/data-stat="average"/);
  assert.match(root.innerHTML,/aria-labelledby="today-title"/);
  assert.equal((root.innerHTML.match(/js-today-distribution/g)||[]).length,1);
  assert.doesNotMatch(root.innerHTML,/js-yesterday-distribution/);
  if (!loading) assert.match(root.innerHTML,/>1\.7<\/span>/);
}
console.log('Stats renders for guests and accounts with one community section and average guesses.');

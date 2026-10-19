const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {parseHTML} = require('linkedom');
const elements = require('../data/elements');
const {run:runAnalysis,result:analysisResult} = require('./test-analysis');
const source = fs.readFileSync(__dirname+'/i18n.js','utf8');
const codes = ['en','fr','es','de','pt','nl','tr','pl','sv','sr','ru','ar','vi','zh','ko','ja'];
const guessLabels = {en:'GUESS', fr:'DEVINER', es:'ADIVINAR', de:'RATEN', pt:'ADIVINHAR', nl:'RADEN', tr:'TAHMİN ET', pl:'ZGADNIJ', sv:'GISSA', sr:'ПОГОДИ', ru:'УГАДАТЬ', ar:'خمّن', vi:'ĐOÁN', zh:'猜测', ko:'추측', ja:'回答'};
const languageLabels = {en:'🇬🇧 English', fr:'🇫🇷 Français', es:'🇪🇸 Español', de:'🇩🇪 Deutsch', pt:'🇧🇷 Português', nl:'🇳🇱 Nederlands', tr:'🇹🇷 Türkçe', pl:'🇵🇱 Polski', sv:'🇸🇪 Svenska', sr:'🇷🇸 Српски', ru:'🇷🇺 Русский', ar:'🇸🇦 العربية الفصحى', vi:'🇻🇳 Tiếng Việt', zh:'🇨🇳 简体中文', ko:'🇰🇷 한국어', ja:'🇯🇵 日本語'};
async function browser(locale, denied = false, failFetch = false, html = '<!doctype html><html><head></head><body><main class="js-account-page"><p>Play</p><p class="auth-account-name">Gold</p></main><div id="dynamic"></div></body></html>') {
  const {window} = parseHTML(html);
  const saved = new Map([['elementle_language',locale],['guessesList',JSON.stringify([{name:'Gold',atomicNumber:79}])]]);
  let reloaded = false;
  const storage = {getItem:key=>saved.get(key)||null,setItem:(key,value)=>{if(denied)throw Error('blocked');saved.set(key,value);}};
  const catalog = locale==='en'||!codes.includes(locale)?{}:JSON.parse(fs.readFileSync(__dirname+'/../data/i18n-'+locale+'.json','utf8'));
  const context = vm.createContext({window,document:window.document,localStorage:storage,location:{reload:()=>{reloaded=true;}},MutationObserver:window.MutationObserver,CustomEvent:window.CustomEvent,Event:window.Event,AbortController,console:{...console,warn(){}},setTimeout,clearTimeout,fetch:async()=>{if(failFetch)throw Error('Offline');return {ok:true,json:async()=>catalog};}});
  vm.runInContext(source,context);
  window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
  // linkedom lacks the writable select.value property that browsers provide.
  const select = window.document.querySelector('#account-language');
  if (select) Object.defineProperty(select,'value',{configurable:true,writable:true,value:select.value});
  await window.ElementleI18n.ready;
  await new Promise(resolve=>setTimeout(resolve,0));
  return {window,saved,reloaded:()=>reloaded,catalog};
}
async function translatedGuess(api) {
  const controller = fs.readFileSync(__dirname+'/elementle.js','utf8');
  const code = controller.slice(controller.indexOf('async function processGuess()'),controller.indexOf('function invalidGuess()'));
  const saved=new Map(), guesses=[{...elements[1]}];
  let duplicate=false, payload;
  const input={value:api.elementName(elements[1]),focus(){},disabled:false};
  const context=vm.createContext({window:{ElementleI18n:api,innerWidth:1000,dispatchEvent(){}},Event:class {},console,Date,elements,
    checkDailyDateLock:()=>false,dailyReadOnly:false,_guessInFlight:false,practice:false,
    inputElement:input,numberOfGuesses:1,guessedCorrectly:'false',guessesList:guesses,
    getMysteryElement:()=>elements[25],alreadyGuessedPopup:()=>{duplicate=true;},invalidGuess:()=>assert.fail('Localized name rejected'),
    gameStorage:{getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,String(v))},localStorage:{setItem(){}},
    getAuthToken:()=> 'test-token',getTodayDateInt:()=>20261014,API_BASE:'/api',
    removeAutocompleteDropdown(){},renderGuess(){},recordVaultDaily(){},_pendingGuessPromise:null,
    fetch:async(url,options)=>{payload=JSON.parse(options.body);return {ok:true,json:async()=>({})};},
    confetti(){},showGameResult(){},displayResults(){}
  });
  vm.runInContext(code,context);
  await context.processGuess();
  assert.equal(duplicate,true);assert.equal(guesses.length,1);
  input.value=api.elementName(elements[25]);
  await context.processGuess();
  assert.equal(payload.guess,26);assert.equal(guesses[1].name,'Iron');
  assert.equal(JSON.parse(saved.get('guessesList'))[1].atomicNumber,26);
  assert.equal(saved.get('guessedCorrectly'),'true');
}
async function verifyAnalysis(i18n, catalog, locale, window) {
  const original = '{0} was the answer. Your guess had {1}/100 information quality before you saw the result.';
  const suffix = 'That was my optimal guess, too.';
  const translated = key => locale === 'en' ? key : catalog[key];
  const expected = translated(original).replace('{0}',translated('Terbium')).replace('{1}','100')+' '+translated(suffix);
  const reported = 'Terbium was the answer. Your guess had 100/100 information quality before you saw the result. '+suffix;
  assert.equal(i18n.t(reported),expected,`${locale}: composed Terbium explanation`);
  const dynamic = window.document.querySelector('#dynamic');
  dynamic.textContent = reported;
  await new Promise(resolve=>setTimeout(resolve,0));
  assert.equal(dynamic.textContent,expected,`${locale}: observed composed explanation`);
  i18n.refresh();
  assert.equal(dynamic.textContent,expected,`${locale}: stable composed explanation`);
  const base = {...analysisResult.steps[0],guess:65,optimal:65,before:[26,65],after:[65],quality:100,correct:true};
  const fixtures = [base,{...base,optimal:26},{...base,before:[65]},
    {...base,correct:false,before:[65],guess:26,quality:0,possible:false},
    {...base,correct:false,guess:26,quality:30,possible:true},
    {...base,correct:false,guess:26,optimal:79,quality:30,possible:false,hintAvailable:true},
    {...base,correct:false,quality:95},{...base,correct:false,quality:95,optimal:26},
    {...base,correct:false,quality:60,optimal:26}];
  for (const [index,step] of fixtures.entries()) {
    const page = await runAnalysis({i18n,steps:[step],answer:65});
    const message = page.get('bot-message').textContent;
    assert.ok(message && !message.includes('undefined'),`${locale}: branch ${index} renders`);
    if (index === 0) {
      assert.equal(message,expected,`${locale}: real elBot Terbium explanation`);
      assert.equal(page.get('bot-title').textContent,translated('Discovery complete!'));
    }
    if (locale !== 'en') assert.doesNotMatch(message,/was the answer|information quality before|scored \d|expected bits|was already ruled out|Your hint was available|only remaining answer|narrowing \d|My suggestion is an information probe/,`${locale}: branch ${index} fully translated`);
  }
  const svg = window.document.createElement('div');
  svg.innerHTML = '<svg aria-label="Game Rating"><path d="M0 0 L10 10"></path><text>Information</text></svg><span role="progressbar" aria-valuetext="3 possible answers"></span><meta name="description" content="Your Elementle account."><meta name="robots" content="noindex,follow">';
  window.document.body.append(svg);
  await new Promise(resolve=>setTimeout(resolve,0));
  assert.equal(svg.querySelector('text').textContent,translated('Information'),`${locale}: SVG label`);
  assert.equal(svg.querySelector('svg').getAttribute('aria-label'),translated('Game Rating'));
  assert.equal(svg.querySelector('path').getAttribute('d'),'M0 0 L10 10');
  assert.equal(svg.querySelector('meta[name=description]').getAttribute('content'),translated('Your Elementle account.'));
  assert.equal(svg.querySelector('meta[name=robots]').getAttribute('content'),'noindex,follow');
  assert.equal(svg.querySelector('span').getAttribute('aria-valuetext'),i18n.t('3 possible answers'));
  assert.equal(i18n.t('26. Iron (Fe)'),`26. ${translated('Iron')} (Fe)`);
  assert.equal(i18n.t('26 · Iron'),`26 · ${translated('Iron')}`);
  assert.equal(i18n.t('100 K · estimated'),`100 K · ${translated('estimated')}`);
  assert.equal(i18n.t('1. Hydrogen (H), Nonmetal'),`1. ${translated('Hydrogen')} (H), ${translated('Nonmetal')}`);
}
async function verifyBrandedLabels(i18n,catalog,locale,window) {
  const translated = key => locale === 'en' ? key : catalog[key];
  const controller = fs.readFileSync(__dirname+'/elementle.js','utf8');
  const buttonMarkup = controller.match(/button\.innerHTML = '([^']*data-i18n="Analyze with elBot"[^']*)'/)[1];
  const analysisHtml = require('../lib/analysis-page')(require('node:path').resolve(__dirname,'..'));
  const heading = parseHTML(analysisHtml).document.querySelector('.analysis-heading h1');
  const holder = window.document.createElement('div');
  holder.innerHTML = buttonMarkup+'<a class="plain-analysis">Analyze with elBot</a><p class="stats-caption"></p><div class="stat-result" aria-label="Unsuccessful: 25%"></div>';
  holder.append(heading);
  holder.querySelector('.stats-caption').textContent = 'Oct 19, 2026 · All players · X = unsuccessful';
  window.document.body.append(holder);
  await new Promise(resolve=>setTimeout(resolve,0));
  const caption = locale === 'en' ? 'Oct 19, 2026 · All players · X = unsuccessful' : 'Oct 19, 2026 '+catalog['· All players · X = unsuccessful'];
  for (let repeat=0;repeat<2;repeat++) {
    assert.equal(holder.querySelector('.stats-caption').textContent,caption,`${locale}: complete stats caption`);
    assert.equal(holder.querySelector('.stat-result').getAttribute('aria-label'),translated('Unsuccessful')+': 25%',`${locale}: unsuccessful result label`);
    assert.equal(holder.querySelector('[data-i18n="Meet elBot"]').textContent,translated('Meet elBot'),`${locale}: complete elBot heading`);
    const button = holder.querySelector('[data-i18n="Analyze with elBot"]');
    assert.equal(button.textContent,translated('Analyze with elBot'),`${locale}: full styled analysis action`);
    assert.equal(holder.querySelector('.plain-analysis').textContent,translated('Analyze with elBot'),`${locale}: plain analysis action`);
    for (const label of holder.querySelectorAll('[data-i18n]')) {
      assert.equal(label.querySelector('[translate="no"]').textContent,'elBot',`${locale}: intact brand`);
      assert.equal(label.querySelector('.elbot-brand').textContent,'B',`${locale}: green B styling`);
    }
    i18n.refresh();
  }
  assert.equal(i18n.format('{0} · All players · X = unsuccessful','Oct 19, 2026'),caption);
  const elo = window.document.createElement('div');
  elo.innerHTML = '<p class="elo-label">Top elELO</p><svg><text>elELO</text></svg><span translate="no" class="player-name">elELO</span>';
  window.document.body.append(elo);
  await new Promise(resolve=>setTimeout(resolve,0));
  const label = elo.querySelector('.elo-label');
  for (let repeat=0;repeat<2;repeat++) {
    assert.equal(label.textContent,translated('Top elELO'),`${locale}: translated elELO label`);
    assert.ok(label.querySelector('.green-letter'),`${locale}: green O missing: ${label.outerHTML}`);
    assert.equal(label.querySelector('.green-letter').textContent,'O',`${locale}: green O`);
    assert.equal(label.querySelector('[translate="no"]').textContent,'elELO',`${locale}: intact elELO`);
    assert.equal(label.querySelectorAll('.green-letter').length,1,`${locale}: stable brand styling`);
    assert.equal(elo.querySelector('svg').querySelector('span'),null,`${locale}: valid SVG text`);
    assert.equal(elo.querySelector('.player-name').querySelector('span'),null,`${locale}: protected player name`);
    i18n.refresh();
  }
  label.textContent = 'elELO leaders';
  await new Promise(resolve=>setTimeout(resolve,0));
  assert.equal(label.textContent,translated('elELO leaders'),`${locale}: updated elELO label`);
  assert.equal(label.querySelector('.green-letter').textContent,'O',`${locale}: dynamic green O`);

}
function verifyCompositionInput() {
  const controller = fs.readFileSync(__dirname+'/elementle.js','utf8');
  let submit, autocomplete, guesses = 0, consumedKeys = 0, showList = false;
  const input = {value:'候補',focus(){},addEventListener:(name,handler)=>{autocomplete=handler;}};
  const list = {querySelectorAll:()=>[{getAttribute:()=> '酸素'}]};
  const context = vm.createContext({
    inputElement:input,_acIndex:0,
    document:{body:{addEventListener:(name,handler)=>{submit=handler;}},querySelector:()=>showList?list:null},
    processGuess:()=>{guesses++;},removeAutocompleteDropdown(){},updateAcHighlight(){}
  });
  vm.runInContext(controller.slice(controller.indexOf("document.body.addEventListener('keydown'"),controller.indexOf('const savedGuessesList')),context);
  vm.runInContext(controller.slice(controller.indexOf("inputElement.addEventListener('keydown'"),controller.indexOf('function removeAutocompleteDropdown()')),context);
  const event = (key,extra={}) => ({key,target:{closest:()=>false},preventDefault:()=>{consumedKeys++;},stopPropagation(){},...extra});
  for (const extra of [{isComposing:true},{isComposing:false,keyCode:229}]) {
    showList=false;
    submit(event('Enter',extra));
    showList=true;
    for (const key of ['Enter','ArrowUp','ArrowDown']) autocomplete(event(key,extra));
  }
  assert.equal(guesses,0,'IME confirmation must not submit a guess');
  assert.equal(consumedKeys,0,'IME candidate navigation must not be intercepted');
  assert.equal(input.value,'候補','IME confirmation must not choose an autocomplete result');
  assert.equal(context._acIndex,0);
  showList=false;
  submit(event('Enter'));
  assert.equal(guesses,1,'Normal Enter still submits guesses');
  showList=true;
  autocomplete(event('Enter'));
  assert.equal(input.value,'酸素','Normal Enter still chooses an autocomplete result');
}
module.exports = {browser};
if (require.main === module) (async()=>{
  verifyCompositionInput();
  const sources = JSON.parse(fs.readFileSync(__dirname+'/../data/i18n-source.json'));
  for (const locale of codes) {
    const {window,saved,reloaded,catalog} = await browser(locale);
    const i18n = window.ElementleI18n;
    await translatedGuess(i18n);
    await verifyAnalysis(i18n,catalog,locale,window);
    await verifyBrandedLabels(i18n,catalog,locale,window);
    assert.equal(window.document.documentElement.lang,locale);
    assert.equal(window.document.documentElement.dir,locale==='ar'?'rtl':'ltr');
    assert.equal(window.document.querySelectorAll('#account-language option').length,codes.length);
    assert.equal(window.document.querySelector('#account-language').value,locale);
    for (const option of window.document.querySelectorAll('#account-language option')) {
      assert.equal(option.textContent,languageLabels[option.value]);
    }
    assert.equal(window.document.querySelector('.auth-account-name').textContent,'Gold');
    const before = saved.get('guessesList');
    for (const counter of ['3 / 10 daily solves', 'At capacity · 0 / 10 daily solves']) {
      const prefix = counter.startsWith('At capacity') ? (locale === 'en' ? 'At capacity ·' : catalog['At capacity ·']) + ' ' : '';
      const numbers = counter.startsWith('At capacity') ? '0 / 10 ' : '3 / 10 ';
      const expected = prefix + numbers + (locale === 'en' ? 'daily solves' : catalog['daily solves']);
      assert.equal(i18n.t(counter),expected,`${locale}: daily solve counter`);
      const label = window.document.querySelector('#dynamic');
      label.textContent = counter;
      await new Promise(resolve=>setTimeout(resolve,0));
      assert.equal(label.textContent,expected,`${locale}: rendered daily solve counter`);
      i18n.refresh();
      assert.equal(label.textContent,expected,`${locale}: counter remains translated`);
    }
    for (const element of elements) {
      if (locale !== 'en') {
        assert.equal(i18n.t(element.symbol),element.symbol,`${locale}: canonical symbol ${element.symbol}`);
        assert.ok(catalog[element.name],`${locale}: missing element ${element.name}`);
        assert.ok(catalog[element.family],`${locale}: missing family ${element.family}`);
        for (const hint of element.hints) assert.ok(catalog[hint.replace(/\s+/g,' ').trim()],`${locale}: missing hint ${element.atomicNumber}`);
      }
      assert.equal(i18n.matchesElement(element,i18n.elementName(element)),true);
      assert.equal(i18n.matchesElement(element,i18n.elementName(element).toLocaleUpperCase(locale)),true,`${locale}: uppercase element ${element.name}`);
      assert.equal(i18n.matchesElement(element,element.name),true);
      assert.equal(i18n.matchesElement(element,element.symbol),true);
      assert.ok(i18n.searchElements(elements,i18n.elementName(element)).some(e=>e.atomicNumber===element.atomicNumber));
    }
    if (locale !== 'en') {
      for (const text of sources) {
        assert.ok(typeof catalog[text] === 'string' && catalog[text].trim(),`${locale}: missing translation: ${text}`);
        assert.deepEqual((catalog[text].match(/\{\d+\}/g)||[]).sort(),(text.match(/\{\d+\}/g)||[]).sort(),`${locale}: invalid placeholders: ${text}`);
      }
      for (const [text,translation] of Object.entries(catalog)) {
        const icons = value => (value.match(/[\p{Extended_Pictographic}\p{Regional_Indicator}\u2190-\u21ff✓◦]\uFE0F?/gu)||[]).sort();
        assert.deepEqual(icons(translation),icons(text),`${locale}: altered emoji or UI symbols: ${text}`);
      }
      const dynamic = window.document.querySelector('#dynamic');
      dynamic.textContent = 'Reveal a hint?';
      await new Promise(resolve=>setTimeout(resolve,0));
      assert.equal(dynamic.textContent,catalog['Reveal a hint?']);
      dynamic.textContent = '⬆️ / ⬇️ The answer’s atomic number is higher / lower.';
      await new Promise(resolve=>setTimeout(resolve,0));
      assert.equal(dynamic.textContent,catalog['⬆️ / ⬇️ The answer’s atomic number is higher / lower.']);
      assert.ok(dynamic.textContent.startsWith('⬆️ / ⬇️ '));
      i18n.refresh(); i18n.refresh();
      assert.equal(dynamic.textContent,catalog['⬆️ / ⬇️ The answer’s atomic number is higher / lower.']);
    }
    const select = window.document.querySelector('#account-language');
    // linkedom has a read-only select.value; select the desired option as browsers do.
    Object.defineProperty(select,'value',{configurable:true,writable:true,value:'en'});
    const englishChoice = window.document.querySelector('[data-language="en"]');
    assert.equal(englishChoice.querySelector('.language-flag').getAttribute('aria-hidden'),'true');
    englishChoice.click();
    assert.equal(saved.get('elementle_language'),'en');assert.equal(reloaded(),true);
    assert.equal(saved.get('guessesList'),before);
    // Exercise the real game markup, including its uppercase button label.
    const game = await browser(locale,false,false,fs.readFileSync(__dirname+'/../index.html','utf8'));
    const button = game.window.document.querySelector('.js-guess-button');
    assert.equal(button.textContent,guessLabels[locale],`${locale}: game Guess button`);
    assert.equal(game.window.document.querySelector('#guess-input').getAttribute('placeholder'),locale === 'en' ? 'Element' : catalog.Element);
    const stats = await browser(locale,false,false,'<html><body><span class="freeze-count">❄ <strong class="js-freeze-count">0 / 2</strong><small> freezes</small></span></body></html>');
    const freezeCounter = stats.window.document.querySelector('.freeze-count');
    assert.equal(freezeCounter.querySelector('small').textContent,' ' + (locale === 'en' ? 'freezes' : catalog.freezes),`${locale}: freeze balance label`);
    assert.equal(freezeCounter.querySelector('strong').textContent,'0 / 2');
    assert.ok(freezeCounter.textContent.startsWith('❄ '));
    button.textContent = 'GUESS';
    await new Promise(resolve=>setTimeout(resolve,0));
    assert.equal(button.textContent,guessLabels[locale],`${locale}: updated Guess button`);
  }
  const french = await browser('fr');
  const auditedPages = require('./audit-i18n-pages')(french.window.ElementleI18n,french.catalog);
  assert.ok(auditedPages > 240);
  assert.equal(french.window.ElementleI18n.matchesElement(elements[1],'helium'),true);
  assert.equal(french.window.ElementleI18n.matchesElement(elements[12],'aluminium'),true);
  const blocked = await browser('fr',true);
  const blockedSelect = blocked.window.document.querySelector('#account-language');
  Object.defineProperty(blockedSelect,'value',{configurable:true,writable:true,value:'de'});
  blockedSelect.dispatchEvent(new blocked.window.Event('change'));
  assert.equal(blocked.saved.get('elementle_language'),'fr');
  assert.equal(blocked.reloaded(),false);
  assert.ok(blocked.window.document.querySelector('#language-status').textContent);
  const offline = await browser('fr',false,true);
  assert.equal(offline.window.ElementleI18n.locale,'en');
  assert.equal(offline.saved.get('elementle_language'),'fr');
  assert.ok(offline.window.document.querySelector('#language-status').textContent);
  const unknown = await browser('unsupported');
  assert.equal(unknown.window.ElementleI18n.locale,'en');
  const removedMalay = await browser('ms');
  assert.equal(removedMalay.window.ElementleI18n.locale,'en');
  assert.equal(removedMalay.window.document.querySelector('[data-language="ms"]'),null);
  assert.equal(fs.existsSync(__dirname+'/../data/i18n-ms.json'),false);
  const arabicOffline = await browser('ar',false,true);
  assert.equal(arabicOffline.window.ElementleI18n.locale,'en');
  assert.equal(arabicOffline.window.document.documentElement.dir,'ltr');
  const turkish = await browser('tr');
  assert.equal(turkish.window.ElementleI18n.matchesElement(elements[52],'İYOT'),true);
  assert.equal(turkish.window.ElementleI18n.matchesElement(elements[78],'altin'),true);
  const polish = await browser('pl');
  assert.equal(polish.window.ElementleI18n.matchesElement(elements[81],'OLOW'),true);
  assert.equal(polish.window.ElementleI18n.matchesElement(elements[15],'SIARKA'),true);
  for (const [locale, iron, query, oxygen] of [
    ['sv','Järn','SYR','Syre'],
    ['sr','Гвожђе','КИС','Кисеоник'],
    ['ru','Железо','КИС','Кислород'],
    ['ar','حديد','اكس','أكسجين'],
    ['vi','Sắt','oxy','Ôxy'],
    ['zh','铁','氧','氧'],
    ['ko','철','산','산소'],
    ['ja','鉄','酸','酸素']
  ]) {
    const {window} = await browser(locale);
    const api = window.ElementleI18n;
    assert.equal(api.elementName(elements[25]),iron,`${locale}: localized iron name`);
    assert.equal(api.matchesElement(elements[25],iron.toLocaleUpperCase(locale)),true);
    assert.ok(api.searchElements(elements,query).some(element=>element.name===oxygen),`${locale}: native-script autocomplete`);
    const choice = window.document.querySelector(`[data-language="${locale}"]`);
    assert.equal(choice.getAttribute('aria-pressed'),'true');
  }
  const swedish = await browser('sv');
  assert.equal(swedish.window.ElementleI18n.matchesElement(elements[25],'jarn'),true);
  const arabic = await browser('ar');
  assert.equal(arabic.window.ElementleI18n.matchesElement(elements[7],'اكسجين'),true);
  assert.equal(arabic.window.ElementleI18n.matchesElement(elements[25],'حَدِيد'),true);
  const vietnamese = await browser('vi');
  assert.equal(vietnamese.window.ElementleI18n.matchesElement(elements[28],'dong'),true);
  assert.ok(vietnamese.window.ElementleI18n.searchElements(elements,'dong').some(element=>element.atomicNumber===29));
  for (const [locale, mercury, lead, tin] of [
    ['sv','Kvicksilver','Bly','Tenn'],
    ['sr','Жива','Олово','Калај'],
    ['ru','Ртуть','Свинец','Олово'],
    ['ar','زئبق','رصاص','قصدير'],
    ['vi','Thủy ngân','Chì','Thiếc'],
    ['zh','汞','铅','锡'],
    ['ko','수은','납','주석'],
    ['ja','水銀','鉛','スズ']
  ]) {
    const {catalog} = await browser(locale);
    assert.equal(catalog.Mercury,mercury,`${locale}: chemical mercury, not the planet`);
    assert.equal(catalog.Lead,lead,`${locale}: chemical lead, not the verb`);
    assert.equal(catalog.Tin,tin,`${locale}: chemical tin`);
    for (const element of elements) assert.equal(catalog[element.symbol],element.symbol,`${locale}: canonical chemical symbol`);
    assert.equal(catalog['[Xe]6s2 4f14 5d10 6p3'],'[Xe]6s2 4f14 5d10 6p3',`${locale}: scientific notation`);
    for (const [label,unit] of [['Atomic mass (u)','u'],['Atomic radius (pm)','pm'],['Density (g/cm³)','g/cm³'],['Electron affinity (eV)','eV']]) {
      assert.ok(catalog[label].includes(`(${unit})`),`${locale}: canonical unit in ${label}`);
    }
    assert.equal(catalog['ELEMENTLE LAB'],'ELEMENTLE LAB',`${locale}: uppercase brand`);
    if (locale === 'sr') {
      for (const [text,translation] of Object.entries(catalog)) {
        const symbol = text.length > 100 && text.match(/\bsymbol\s+(?:of\s+)?([A-Z][a-z]?)\b/);
        if (symbol) assert.ok(new RegExp(`симбол(?:ом|а)? ${symbol[1]}(?:\\W|$)`,'u').test(translation),`Serbian: symbol ${symbol[1]} in reference paragraph`);
      }
    }
  }
  console.log(`All ${codes.length} languages: complete hints, names, placeholders, native-script search and guesses, dynamic UI, settings, offline fallback, and progress preservation.`);
})().catch(error=>{console.error(error);process.exitCode=1;});

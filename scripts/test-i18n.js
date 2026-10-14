const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {parseHTML} = require('linkedom');
const elements = require('../data/elements');
const source = fs.readFileSync(__dirname+'/i18n.js','utf8');
const codes = ['en','fr','es','de','pt','nl'];
const guessLabels = {en:'GUESS', fr:'DEVINER', es:'ADIVINAR', de:'RATEN', pt:'ADIVINHAR', nl:'RADEN'};
const languageLabels = {en:'🇬🇧 English', fr:'🇫🇷 Français', es:'🇪🇸 Español', de:'🇩🇪 Deutsch', pt:'🇧🇷 Português', nl:'🇳🇱 Nederlands'};
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
(async()=>{
  const sources = JSON.parse(fs.readFileSync(__dirname+'/../data/i18n-source.json'));
  for (const locale of codes) {
    const {window,saved,reloaded,catalog} = await browser(locale);
    const i18n = window.ElementleI18n;
    await translatedGuess(i18n);
    assert.equal(window.document.documentElement.lang,locale);
    assert.equal(window.document.documentElement.dir,locale==='ar'?'rtl':'ltr');
    assert.equal(window.document.querySelectorAll('#account-language option').length,codes.length);
    assert.equal(window.document.querySelector('#account-language').value,locale);
    for (const option of window.document.querySelectorAll('#account-language option')) {
      assert.equal(option.textContent,languageLabels[option.value]);
    }
    assert.equal(window.document.querySelector('.auth-account-name').textContent,'Gold');
    const before = saved.get('guessesList');
    for (const element of elements) {
      if (locale !== 'en') {
        assert.ok(catalog[element.name],`${locale}: missing element ${element.name}`);
        assert.ok(catalog[element.family],`${locale}: missing family ${element.family}`);
        for (const hint of element.hints) assert.ok(catalog[hint.replace(/\s+/g,' ').trim()],`${locale}: missing hint ${element.atomicNumber}`);
      }
      assert.equal(i18n.matchesElement(element,i18n.elementName(element)),true);
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
    button.textContent = 'GUESS';
    await new Promise(resolve=>setTimeout(resolve,0));
    assert.equal(button.textContent,guessLabels[locale],`${locale}: updated Guess button`);
  }
  const french = await browser('fr');
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
  console.log('All 6 languages: complete hints, names, placeholders, dynamic UI, settings, offline fallback, and progress preservation.');
})().catch(error=>{console.error(error);process.exitCode=1;});

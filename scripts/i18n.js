/* Browser-wide localization for static pages and dynamically rendered game panels.
   Canonical game data, API payloads, links, and player-entered values stay unchanged. */
(() => {
  'use strict';
  const KEY = 'elementle_language';
  const languages = {en:'English', fr:'Français', es:'Español', de:'Deutsch', pt:'Português', nl:'Nederlands', tr:'Türkçe', pl:'Polski', sv:'Svenska', sr:'Српски', ru:'Русский', ar:'العربية الفصحى', vi:'Tiếng Việt', zh:'简体中文', ko:'한국어', ja:'日本語'};
  const languageOptions = Object.entries(languages).sort(([,a],[,b]) => a.localeCompare(b, 'en', {sensitivity:'base'}));
  const flags = {en:'🇬🇧', fr:'🇫🇷', es:'🇪🇸', de:'🇩🇪', pt:'🇧🇷', nl:'🇳🇱', tr:'🇹🇷', pl:'🇵🇱', sv:'🇸🇪', sr:'🇷🇸', ru:'🇷🇺', ar:'🇸🇦', vi:'🇻🇳', zh:'🇨🇳', ko:'🇰🇷', ja:'🇯🇵'};
  const normalize = value => String(value).normalize('NFD').replace(/[\u0300-\u036f\u0640\u064b-\u065f\u0670]/g, '').toLowerCase().replace(/ı/g, 'i').replace(/ł/g, 'l').replace(/đ/g, 'd').trim();
  let locale = 'en';
  try { const saved = localStorage.getItem(KEY); if (Object.hasOwn(languages, saved)) locale = saved; } catch {}
  let catalog = {}, patterns = [], fragments = [], observer, loadError = false;
  const textHistory = new WeakMap();
  const attributeHistory = new WeakMap();
  const excluded = 'script, style, code, pre, textarea, [translate="no"], .auth-account-name, .auth-account-email, .nav-profile-initial, .leaderboard-name-text, .cell-symbol, .symbol, .reveal-answer-symbol';
  const clean = value => value.replace(/\s+/g, ' ').trim();
  const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  function t(value, depth = 0) {
    if (typeof value !== 'string' || locale === 'en') return value;
    const source = clean(value);
    if (!/[\p{L}]/u.test(source)) return value;
    if (Object.hasOwn(catalog, source)) return value.match(/^\s*/)[0] + catalog[source] + value.match(/\s*$/)[0];
    if (depth > 8) return value;
    for (const pattern of patterns) {
      const match = source.match(pattern.regex);
      if (match) {
        const translated = pattern.target.replace(/\{(\d+)\}/g, (_, n) => t(match[pattern.indices.indexOf(Number(n)) + 1] || '', depth + 1));
        return value.match(/^\s*/)[0] + translated + value.match(/\s*$/)[0];
      }
    }
    // A rendered paragraph may join several independently mapped messages.
    for (const pattern of patterns) {
      if (!pattern.prefixRegex) continue;
      const match = source.match(pattern.prefixRegex);
      if (match && match[0].length < source.length) {
        const translated = pattern.target.replace(/\{(\d+)\}/g, (_, n) => t(match[pattern.indices.indexOf(Number(n)) + 1] || '', depth + 1));
        return value.match(/^\s*/)[0] + translated + t(source.slice(match[0].length),depth + 1) + value.match(/\s*$/)[0];
      }
    }
    // Legacy screens also compose labels by concatenation (for example, FILE: + date).
    for (const [prefix,target] of fragments) {
      if (source.startsWith(prefix + ' ')) {
        return value.match(/^\s*/)[0] + target + ' ' + t(source.slice(prefix.length + 1),depth + 1) + value.match(/\s*$/)[0];
      }
    }
    const colon = source.match(/^(.+?): (.+)$/);
    if (colon) return value.match(/^\s*/)[0] + t(colon[1],depth + 1) + ': ' + t(colon[2],depth + 1) + value.match(/\s*$/)[0];
    // Translate both parts of compact labels after checking mapped prefixes.
    const parts = source.match(/^(.+) · (.+)$/);
    if (parts) return value.match(/^\s*/)[0] + t(parts[1],depth + 1) + ' · ' + t(parts[2],depth + 1) + value.match(/\s*$/)[0];
    // Preserve leading numbers/icons while translating the label that follows.
    const label = source.match(/^(\P{L}+)(.*\p{L}.*)$/u);
    if (label) return value.match(/^\s*/)[0] + label[1] + t(label[2],depth + 1) + value.match(/\s*$/)[0];
    return value;
  }
  function format(source, ...values) {
    const target = Object.hasOwn(catalog,source) ? catalog[source] : source;
    return target.replace(/\{(\d+)\}/g, (_, n) => t(String(values[Number(n)] ?? '')));
  }
  function compilePatterns() {
    fragments = Object.entries(catalog).filter(([s])=>s.length >= 3 && !s.includes('{')).sort((a,b)=>b[0].length-a[0].length);
    patterns = Object.entries(catalog).filter(([s]) => /\{\d+\}/.test(s) && s.replace(/\{\d+\}/g,'').trim().length > 2).map(([source,target]) => {
      const indices = [];
      let regex = '', last = 0;
      for (const match of source.matchAll(/\{(\d+)\}/g)) {
        regex += escapeRegex(source.slice(last,match.index)) + '(.*?)';
        indices.push(Number(match[1])); last = match.index + match[0].length;
      }
      regex += escapeRegex(source.slice(last));
      return {regex:new RegExp('^'+regex+'$'), prefixRegex:/[.!?…]$/.test(source) ? new RegExp('^'+regex+'(?=\\s|$)') : null, target, indices, length:source.replace(/\{\d+\}/g,'').length};
    }).sort((a,b)=>b.length-a.length);
  }
  function translateNode(node) {
    const parent = node.nodeType === 1 ? node : node.parentElement;
    if (!parent || parent.closest(excluded)) return;
    if (node.nodeType === 3) {
      const value = node.nodeValue;
      const previous = textHistory.get(node);
      const source = previous && previous.output === value ? previous.source : value;
      const output = t(source);
      if (output.includes('elELO') && parent.namespaceURI === 'http://www.w3.org/1999/xhtml' && !parent.closest('title, option')) {
        const label = document.createElement('span');
        label.setAttribute('data-i18n',source);
        node.replaceWith(label);
        translateNode(label);
        return;
      }
      if (output !== value) node.nodeValue = output;
      textHistory.set(node, {source,output});
    } else if (node.nodeType === 1) {
      // Translate styled labels as a whole so brand names cannot be split.
      if (node.hasAttribute('data-i18n')) {
        const output = t(node.getAttribute('data-i18n'));
        if (node.textContent !== output) {
          const children = [];
          for (const part of output.split(/(elBot|elELO)/g)) {
            if (part === 'elBot' || part === 'elELO') {
              const brand = document.createElement('span');
              brand.setAttribute('translate','no');
              brand.innerHTML = part === 'elBot' ? 'el<span class="elbot-brand">B</span>ot' : 'elEL<span class="green-letter">O</span>';
              children.push(brand);
            } else children.push(document.createTextNode(part));
          }
          node.replaceChildren(...children);
        }
        return;
      }
      const history = attributeHistory.get(node) || {};
      const attributes = ['placeholder','title','alt','aria-label','aria-valuetext'];
      if (node.matches('meta[name="description"], meta[property="og:title"], meta[property="og:description"]')) attributes.push('content');
      for (const attribute of attributes) {
        if (!node.hasAttribute(attribute)) continue;
        const value = node.getAttribute(attribute), previous = history[attribute];
        const source = previous && previous.output === value ? previous.source : value;
        const output = t(source);
        if (value !== output) node.setAttribute(attribute,output);
        history[attribute] = {source,output};
      }
      attributeHistory.set(node,history);
      if (node.matches('.home-logo, .nav-text')) return;
      for (const child of node.childNodes) translateNode(child);
    }
  }
  function refresh(root = document.documentElement) {
    observer?.disconnect();
    translateNode(root);
    observer?.observe(document.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['placeholder','title','alt','aria-label','aria-valuetext','content']});
  }
  function settings() {
    return `<section class="account-settings page-card" aria-labelledby="account-settings-heading">
      <h2 id="account-settings-heading">Settings</h2>
      <span class="language-label" id="account-language-label">Language</span>
      <select id="account-language" hidden translate="no">${languageOptions.map(([code,name])=>`<option value="${code}"${code===locale?' selected':''}>${flags[code]} ${name}</option>`).join('')}</select>
      <details class="language-picker" translate="no">
        <summary aria-labelledby="account-language-label account-language-value" aria-describedby="language-description language-status"><span id="account-language-value" class="language-choice"><span class="language-flag" aria-hidden="true">${flags[locale]}</span><span>${languages[locale]}</span></span></summary>
        <div class="language-options" role="group" aria-labelledby="account-language-label">${languageOptions.map(([code,name])=>`<button type="button" class="language-choice" data-language="${code}" aria-pressed="${code===locale}"><span class="language-flag" aria-hidden="true">${flags[code]}</span><span>${name}</span></button>`).join('')}</div>
      </details>
      <p class="auth-help-text" id="language-description">Choose the language for the game, hints, and pages. Your choice is saved in this browser.</p>
      <p id="language-status" class="auth-help-text" role="status" aria-live="polite"></p>
    </section>`;
  }
  function mountSettings() {
    const root = document.querySelector('.js-account-page');
    if (!root || root.querySelector('.account-settings')) return;
    root.insertAdjacentHTML('beforeend', settings());
    const picker = root.querySelector('.language-picker');
    const options = picker.querySelector('.language-options');
    function positionOptions(event) {
      if (!picker.open || (event && options.contains(event.target))) return;
      const bounds = picker.querySelector('summary').getBoundingClientRect();
      const height = window.innerHeight, width = window.innerWidth, margin = 12, gap = 6;
      if (!picker.isConnected || bounds.bottom <= margin || bounds.top >= height - margin) {
        picker.open = false;
        return;
      }
      const below = Math.max(0, height - bounds.bottom - gap - margin);
      const above = Math.max(0, bounds.top - gap - margin);
      const openAbove = below < Math.min(320, above);
      const menuWidth = Math.min(bounds.width, Math.max(0, width - margin * 2));
      options.style.width = `${menuWidth}px`;
      options.style.left = `${Math.max(margin, Math.min(bounds.left, width - menuWidth - margin))}px`;
      options.style.top = openAbove ? 'auto' : `${bounds.bottom + gap}px`;
      options.style.bottom = openAbove ? `${height - bounds.top + gap}px` : 'auto';
      options.style.maxHeight = `${Math.min(320, openAbove ? above : below)}px`;
      options.style.visibility = 'visible';
    }
    picker.addEventListener('toggle', () => {
      window.removeEventListener('resize', positionOptions);
      window.removeEventListener('scroll', positionOptions, true);
      if (picker.open) {
        positionOptions();
        window.addEventListener('resize', positionOptions);
        window.addEventListener('scroll', positionOptions, true);
      } else options.style.visibility = 'hidden';
    });
    picker.addEventListener('keydown', event => {
      if (event.key === 'Escape') { picker.open = false; picker.querySelector('summary').focus(); }
    });
    for (const button of picker.querySelectorAll('[data-language]')) {
      button.addEventListener('click', () => {
        const select = root.querySelector('#account-language');
        select.value = button.dataset.language;
        select.dispatchEvent(new Event('change', {bubbles:true}));
        picker.open = false;
        picker.querySelector('summary').focus();
      });
    }
    root.querySelector('#account-language').addEventListener('change', event => {
      const language = event.target.value;
      if (!Object.hasOwn(languages,language)) return;
      try {
        localStorage.setItem(KEY, language);
        if (localStorage.getItem(KEY) !== language) throw new Error('Storage unavailable');
        // Account has no unsaved guesses; reload also updates all panels and dates.
        location.reload();
      } catch {
        event.target.value = locale;
        root.querySelector('#language-status').textContent = t('Could not save your language. Check your browser storage settings.');
      }
    });
    refresh(root);
  }
  const api = {
    t, format, normalize, languages, get locale() {return locale;}, refresh,
    elementName(element) { return t(element.name); },
    matchesElement(element,input) {
      return [element.name,t(element.name),element.symbol, ...(element.atomicNumber===13?['Aluminium']:[]), ...(element.atomicNumber===55?['Caesium']:[])].some(name=>normalize(name)===normalize(input));
    },
    searchElements(elements,input) {
      const query = normalize(input);
      return elements.filter(element=>[t(element.name),element.name,element.symbol].some(name=>normalize(name).startsWith(query)))
        .map(element=>({name:t(element.name),symbol:element.symbol,atomicNumber:element.atomicNumber}))
        .sort((a,b)=>a.name.localeCompare(b.name,locale));
    }
  };
  window.ElementleI18n = api;
  document.documentElement.lang = locale;
  document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
  const load = async () => {
    if (locale === 'en') return;
    const controller = new AbortController();
    const timeout = setTimeout(()=>controller.abort(),8000);
    try {
      const response = await fetch('/data/i18n-'+locale+'.json',{signal:controller.signal});
      if (!response.ok) throw new Error('Catalog unavailable');
      catalog = await response.json();
      if (!catalog.Settings || !catalog.Language || !catalog['Reveal a hint?']) throw new Error('Incomplete language catalog');
      for (const brand of ['Elementle','elBot','elELO','Wikipedia','GitHub','Discord']) {
        const translatedBrand = catalog[brand];
        if (translatedBrand && translatedBrand !== brand) {
          for (const [source,target] of Object.entries(catalog)) {
            if (source.includes(brand)) catalog[source] = target.split(translatedBrand).join(brand);
          }
        }
        catalog[brand] = brand;
      }
      catalog['Elementle Lab'] = 'Elementle Lab';
      compilePatterns();
    } catch (error) {
      loadError = true;
      console.warn('Elementle language could not be loaded',error);
      document.querySelector('#language-status')?.replaceChildren('Could not load this language. Please try again.');
      locale = 'en'; document.documentElement.lang = 'en'; document.documentElement.dir = 'ltr';
      window.dispatchEvent(new CustomEvent('elementle:language-error'));
    } finally {clearTimeout(timeout);}
  };
  api.ready = load();
  function start() {
    mountSettings();
    api.ready.then(()=>{
      observer = new MutationObserver(records=>{
        const roots = new Set();
        for (const record of records) {
          if (record.type === 'childList') for (const node of record.addedNodes) roots.add(node);
          else roots.add(record.target);
        }
        for (const root of roots) refresh(root);
      });
      refresh();
      if (loadError) document.querySelector('#language-status')?.replaceChildren('Could not load this language. Please try again.');
      const select = document.querySelector('#account-language');
      if (select && select.value !== locale) select.value = locale;
      const picker = document.querySelector('.language-picker');
      if (picker) {
        picker.querySelector('.language-flag').textContent = flags[locale];
        picker.querySelector('#account-language-value > span:last-child').textContent = languages[locale];
        for (const button of picker.querySelectorAll('[data-language]')) button.setAttribute('aria-pressed',String(button.dataset.language === locale));
      }
      window.dispatchEvent(new CustomEvent('elementle:language-ready',{detail:{locale}}));
    });
  }
  window.addEventListener('elementle:account-render',mountSettings);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',start,{once:true}); else start();
})();

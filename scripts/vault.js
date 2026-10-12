(() => {
 const elements = JSON.parse(document.getElementById('vault-elements').textContent);
 const main = document.querySelector('.vault-main');
 const content = document.getElementById('vault-content');
 const number = Number(main.dataset.number);
 const names = ['Undiscovered','Discovered','Familiar','Proficient','Mastered'];
 const icons = ['◇','✧','✦','☆','★'];
 const rules = ['Solve the element once','Solve it twice','Solve it 3 times, including 1 without hints','Solve it 5 times, including 3 without hints'];
 const lock = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4M12 14v3"/></svg>';
 const empty = {encounters:0,solved:0,clean:0,tier:0};
 const date = value => value ? new Date(value + 'T12:00:00').toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'}) : '—';
 const pct = (n,d) => d ? (n / d * 100).toFixed(1).replace(/\.0$/,'') + '%' : '0%';
 function bar(value, label) { return `<div class="vault-progress" role="progressbar" aria-label="${label}" aria-valuenow="${value}" aria-valuemin="0" aria-valuemax="100"><span style="--progress:${value}%"></span></div>`; }
 function help() { return `<div class="tier-help"><button aria-label="Explain proficiency tiers" aria-expanded="false">?</button><div class="tier-tooltip" role="tooltip">${rules.map((r,i)=>`<p><strong>${icons[i+1]} ${names[i+1]}</strong><br>${r}</p>`).join('')}<p>Each element is counted in its highest earned tier.</p></div></div>`; }
 function tile(e,s,hero=false) {
  const discovered = s.solved > 0;
  return `<${hero?'div':'a'} ${hero?'':`href="/vault/${e.number}" aria-label="${e.number}. ${discovered?e.name:'Undiscovered'}"`} class="periodic-cell ${discovered?'family-'+e.css:'vault-locked'} ${hero?'element-hero-tile':''}" style="grid-column:${e.x};grid-row:${e.y+1}"><span class="cell-number">${e.number}</span><span class="cell-symbol">${discovered?e.symbol:lock}</span><span class="cell-name">${discovered?e.name:'?'}</span></${hero?'div':'a'}>`;
 }
 function render(data, guest) {
  const records = [...data.records, ...(guest?window.ElementleVault.guestRecords():[])];
  const stats = window.ElementleVault.aggregate(records,data.startDate);
  const note = `Main daily game only · Counting from ${date(data.startDate)}${guest?' · Guest progress is saved in this browser.':''}`;
  if (number) {
   const e = elements.find(e=>e.number===number), s=stats[number]||empty;
   content.innerHTML = `<a class="vault-back" href="/vault?inside=1">← Back to the vault</a><header class="vault-element-hero">${tile(e,s,true)}<div><p class="element-eyebrow">VAULT / ATOMIC NUMBER ${number}</p><h1>${s.solved?e.name:'?'}</h1><p>${s.solved?e.family:'Undiscovered'}</p></div></header>`;
   if (!s.solved) content.innerHTML += `<section class="vault-empty"><div>${lock}</div><h2>Undiscovered</h2><p>Solve this element in the daily game to unlock its identity and your personal record.</p><a class="vault-button" href="/">Play today’s element →</a></section>`;
   else {
    const values = [['Encounters',s.encounters],['Solved',s.solved],['Win rate',pct(s.solved,s.encounters)],['Avg. guesses · wins',(s.totalGuesses/s.solved).toFixed(1)],['Fewest guesses to solve',s.fewest],['Solved without hints',pct(s.clean,s.solved)],['First solved',date(s.firstSolved)],['Last encountered',date(s.last)]];
    const progress = s.tier===4?100:s.tier===3?75+25*Math.min((s.solved-3)/2,(s.clean-1)/2):s.tier===2?50+25*Math.min(s.solved-2,s.clean):s.tier===1?25:0;
    content.innerHTML += `<section class="vault-proficiency"><div class="vault-section-title"><div><p class="element-eyebrow">ELEMENT PROFICIENCY</p><h2>${icons[s.tier]} ${names[s.tier]}</h2></div>${help()}</div>${bar(Math.min(100,Math.round(progress)),'Element proficiency')}<div class="tier-milestones">${names.slice(1).map((n,i)=>`<span class="${s.tier>=i+1?'earned':''}">${icons[i+1]} ${n}</span>`).join('')}</div><p>${s.tier===4?'All proficiency milestones achieved.':`Next: ${rules[s.tier]}.`} ${s.clean} hint-free ${s.clean===1?'solve':'solves'}.</p></section><dl class="vault-stats">${values.map(([k,v])=>`<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl><p class="vault-note">An encounter begins with your first guess. Win rate includes unfinished encounters; average guesses uses solved games.</p><a class="vault-reference" href="/elements/${number}">Explore ${e.name}’s chemistry & properties ↗</a>`;
   }
   content.innerHTML += `<p class="vault-note">${note}</p>`;
  } else {
   const counts=[0,0,0,0,0];Object.values(stats).forEach(s=>counts[s.tier]++);
   const found=Object.values(stats).filter(s=>s.solved>0).length;
   content.innerHTML = `<header class="vault-heading"><div><p class="element-eyebrow">ELEMENTLE / PERSONAL COLLECTION</p><h1>The vault<span>.</span></h1><p>A place for every element you’ve uncovered.</p></div><span class="vault-online">● VAULT OPEN</span></header><section class="vault-summary"><div class="vault-section-title"><div><p class="element-eyebrow">YOUR DISCOVERIES</p><h2>${found}<span> / 118 elements</span></h2></div><div class="vault-completion"><strong>${pct(found,118)}</strong><span>complete · ${118-found} remaining</span></div></div>${bar(Number((found/118*100).toFixed(2)),'Elements discovered')}<div class="vault-tiers">${names.slice(1).map((n,i)=>`<div><span>${icons[i+1]} ${n}</span><strong>${counts[i+1]}</strong></div>`).join('')}${help()}</div></section><p class="vault-note">${note}</p><div class="vault-table-heading"><h2>Your periodic table</h2><span>↔ Scroll to explore · Select a chamber</span></div><div class="periodic-scroll" tabindex="0" role="region" aria-label="Your periodic table, scroll horizontally"><div class="periodic-table">${Array.from({length:18},(_,i)=>`<span class="group-number" style="grid-column:${i+1};grid-row:1">${i+1}</span>`).join('')}<div class="table-key"><span>118 chambers. One daily discovery.</span><strong>${found} unlocked</strong><span>Keep your curiosity close.</span></div>${elements.map(e=>tile(e,stats[e.number]||empty)).join('')}<a class="series-placeholder" style="grid-column:3;grid-row:7" href="#vault-lanthanides">57–71<span>Lanthanides ↓</span></a><a class="series-placeholder" style="grid-column:3;grid-row:8" href="#vault-actinides">89–103<span>Actinides ↓</span></a><span id="vault-lanthanides" class="series-label" style="grid-column:1/3;grid-row:10">6 · Lanthanides</span><span id="vault-actinides" class="series-label" style="grid-column:1/3;grid-row:11">7 · Actinides</span></div></div>`;
  }
  content.querySelectorAll('.tier-help button').forEach(button=>button.onclick=()=>button.setAttribute('aria-expanded',String(button.getAttribute('aria-expanded')!=='true')));
 }
 async function load() {
  const token=localStorage.getItem('elementle_token');
  let guest=localStorage.getItem('elementle_guest_id');
  if (!guest) {guest=crypto.randomUUID();localStorage.setItem('elementle_guest_id',guest);}
  try {
   const res=await fetch('/api/vault',{headers:token?{Authorization:'Bearer '+token}:{'X-Guest-ID':guest},cache:'no-store',signal:AbortSignal.timeout(12000)});
      window.ElementleLab?.checkResponse?.(res);
   if (!res.ok) throw new Error();
   const data=await res.json();
   render(data,!token);
  } catch {
   content.innerHTML='<section class="vault-empty"><h1>Your vault couldn’t load</h1><p>Your progress hasn’t been changed. Please try again.</p><button class="vault-button" id="retry-vault">Retry</button><a class="vault-back" href="/account">Sign in to your account →</a></section>';
   document.getElementById('retry-vault').onclick=load;
  }
 }
 // Fetch and render all 118 cells while the door is still closed.
 const ready = load();
 const entry = document.querySelector('.vault-entry');
 if (entry) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const background = [main, document.querySelector('.detail-header'), document.querySelector('footer')];
  let cancelled = false;
  let animations = [];
  const enter = () => {
   cancelled = true;
   animations.forEach(animation => animation.cancel());
   entry.remove();
   background.forEach(node => { node.inert = false; });
   document.body.classList.remove('vault-entering', 'vault-revealing');
   main.style.removeProperty('will-change');
   main.focus({ preventScroll: true });
  };
  if (new URLSearchParams(location.search).get('inside') === '1') entry.remove();
  else {
   background.forEach(node => { node.inert = true; });
   document.body.classList.add('vault-entering');
   const verify = document.getElementById('verify-vault');
   const status = document.getElementById('scan-status');
   const pause = ms => new Promise(resolve => setTimeout(resolve, reduced ? 0 : ms));
   document.getElementById('skip-vault').onclick = enter;
   verify.onclick = async () => {
    verify.disabled = true;
    entry.classList.add('scanning');
    status.textContent = 'Verifying identity…';
    await pause(650);
    if (cancelled) return;
    status.textContent = 'Identity verified · Preparing your collection…';
    // Never rebuild the table in the middle of the camera movement.
    await ready;
    if (cancelled) return;
    entry.classList.add('verified');
    status.textContent = 'Identity verified · Access granted';
    verify.textContent = 'Access granted ✓';
    if (reduced) { enter(); return; }
    // Position the real table behind the door before revealing it.
    const tableHeading = content.querySelector('.vault-table-heading');
    if (tableHeading) window.scrollTo({ top: window.scrollY + tableHeading.getBoundingClientRect().top - 24, behavior: 'instant' });
    main.style.willChange = 'transform, opacity';
    await pause(950);
    if (cancelled) return;
    entry.classList.add('opening');
    // Overlap the zoom with the door swing.
    await pause(1000);
    if (cancelled) return;
    document.body.classList.add('vault-revealing');
    entry.classList.add('zooming');
    const timing = { duration: 1350, easing: 'cubic-bezier(.22,.61,.36,1)', fill: 'both' };
    animations = [
     entry.animate([
      { transform: 'scale(1)', opacity: 1 },
      { transform: 'scale(1.25)', opacity: .95, offset: .25 },
      { transform: 'scale(2.8)', opacity: 0 }
     ], timing),
     main.animate([
      { transform: 'scale(.82)', opacity: 0 },
      { transform: 'scale(.88)', opacity: .25, offset: .25 },
      { transform: 'scale(1)', opacity: 1 }
     ], timing)
    ];
    await Promise.all(animations.map(animation => animation.finished.catch(() => {})));
    if (!cancelled) enter();
   };
   verify.focus();
  }
 }
})();

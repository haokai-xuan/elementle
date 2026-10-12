/* Personal elELO history and the public, server-gated leaderboard. */
(() => {
  const tiers = [
    {name:'Lab Apprentice', minimum:-Infinity, range:'Below 550', symbol:'apprentice'},
    {name:'Researcher', minimum:550, range:'550–749', symbol:'researcher'},
    {name:'Chemist', minimum:750, range:'750–949', symbol:'chemist'},
    {name:'Senior Chemist', minimum:950, range:'950–1199', symbol:'senior_chemist'},
    {name:'Lead Chemist', minimum:1200, range:'1200–1449', symbol:'lead_chemist'},
    {name:'Alchemist', minimum:1450, range:'1450–1699', symbol:'alchemist'},
    {name:'Master Alchemist', minimum:1700, range:'1700+', symbol:'master_alchemist'}
  ];
  const symbol = name => '/images/tier_symbols/' + (tiers.find(t=>t.name===name) || tiers[0]).symbol + '.png';
  const states = new WeakMap();
  function markup(account) {
    return `<section class="elelo-card" aria-labelledby="elelo-title">
      <div class="elelo-heading"><div class="elo-title-help"><h2 id="elelo-title">elEL<span class="green-letter">O</span></h2><span class="elo-help"><button type="button" class="js-elelo-help elo-help-button" aria-label="How elELO works" aria-describedby="elelo-tooltip" aria-expanded="false">?</button><span id="elelo-tooltip" class="elo-help-tooltip" role="tooltip">Beat the expected Game Rating for an element to climb; fall short and your rating drops. As you improve, expectations rise too. Higher tiers take consistently stronger play.</span></span></div><button type="button" class="leaderboard-launch js-elelo-leaders" aria-expanded="false" aria-controls="elelo-leaderboard"><i class="fa-solid fa-trophy" aria-hidden="true"></i><span class="js-elelo-launch-label">elELO leaders</span><span aria-hidden="true">↗</span></button></div>
      <div class="js-elelo-personal">
        <div class="elelo-summary"><img class="js-elelo-symbol tier-symbol" src="${symbol('Lab Apprentice')}" alt="" ${account ? 'hidden' : ''}><strong class="js-elelo-rating">—</strong><span class="js-elelo-tier">${account ? 'Loading…' : 'Registered players'}</span></div>
        <div class="js-elelo-progress elo-rank-progress"><div class="elo-rank-labels"><span class="js-elelo-next-tier">Researcher</span><span class="js-elelo-next-rating">550</span></div><progress class="js-elelo-rank-bar" max="100" value="0" aria-label="Progress toward Researcher"></progress></div>
        ${account ? '' : '<p class="elo-sign-in"><a href="/account">Sign in</a> to start at 400 as a Lab Apprentice.</p>'}
        <div class="js-elelo-graph-section">
          <div class="elelo-chart-heading"><h3>Your progress</h3><select class="js-elelo-window" aria-label="Games shown in elELO graph"><option value="30">Last 30 games</option><option value="90">Last 90 games</option><option value="all">All games</option></select></div>
          <p class="js-elelo-chart-status">${account ? 'Loading your rated games…' : 'Sign in and finish a main game to build your graph.'}</p>
          <div class="js-elelo-chart elelo-chart"></div>
          <div class="elelo-inspector" hidden><label class="elelo-scrubber-label">Explore a game <input class="js-elelo-scrubber" type="range" min="0" max="0" value="0" aria-label="Explore your elELO history"></label><output class="js-elelo-detail" aria-live="polite"></output><a class="js-elelo-analysis" hidden>Analyze this game ↗</a></div>
        </div>
      </div>
      <div id="elelo-leaderboard" class="js-elelo-board elelo-board" hidden>
        <div class="leaderboard-header"><button type="button" class="leaderboard-back-btn js-elelo-back" aria-label="Back to your elELO">←</button><h3 class="leaderboard-title">Top elELO</h3></div>
        <p class="elelo-board-caption">Top 10 ranks · Ties share a rank</p><ul class="leaderboard-list js-elelo-list"><li class="leaderboard-loading">Loading…</li></ul>
        <button type="button" class="auth-forgot-link js-elelo-retry" hidden>Try again</button>
      </div>
      <details class="elelo-guide"><summary>How it works &amp; ranking tiers</summary><p>Only completed main games played while signed in count toward your elELO.</p><ul class="elelo-tiers">${tiers.map(t=>`<li><img src="${symbol(t.name)}" alt="" loading="lazy"><span>${t.name}<small>${t.range}</small></span></li>`).join('')}</ul></details>
    </section>`;
  }
  function rankProgress(rating) {
    const next=tiers.find(t=>t.minimum>rating);
    if(!next) return null;
    const index=tiers.indexOf(next), start=index===1?400:tiers[index-1].minimum;
    return {name:next.name,target:next.minimum,value:Math.max(0,Math.min(100,(rating-start)/(next.minimum-start)*100)),remaining:next.minimum-rating};
  }
  function chartModel(history, windowSize='30', baseline=400) {
    const entries = history.filter(p=>Number.isFinite(Number(p.rating)) && Number.isFinite(Number(p.before)));
    if (!entries.length) return {points:[{date:null,rating:baseline,start:true,x:55,y:135}], min:baseline-50,max:baseline+100,partial:false,empty:true};
    const selected = windowSize==='all' ? entries : entries.slice(-Number(windowSize));
    const points = [{date:null, rating:Number(selected[0].before), start:true}, ...selected.map(p=>({...p,rating:Number(p.rating)}))];
    const low = Math.min(...points.map(p=>p.rating)), high = Math.max(...points.map(p=>p.rating));
    const padding = Math.max(15,(high-low)*.16);
    const min = Math.floor((low-padding)/10)*10, max=Math.ceil((high+padding)/10)*10;
    const coords=points.map((p,i)=>({...p,x:55+i*645/(points.length-1),y:190-(p.rating-min)*165/(max-min)}));
    return {points:coords,min,max,partial:selected.length<entries.length};
  }
  const signed = value => (value>=0?'+':'')+Number(value).toFixed(2);
  function renderChart(section) {
    const state=states.get(section), holder=section.querySelector('.js-elelo-chart');
    const model=chartModel(state.history,section.querySelector('.js-elelo-window').value,state.rating);
    holder.replaceChildren();
    section.querySelector('.elelo-inspector').hidden=model.empty;
    section.querySelector('.js-elelo-chart-status').textContent=!model.empty ? 'Hover, tap, or use the slider to explore each rated main game.' : state.account ? (state.loading?'Loading your rated games…':'Finish a main game to start building your progress.') : 'Sign in and finish a main game to build your graph.';
    section.querySelector('.js-elelo-window').disabled=model.empty;
    const svgNode=(name,attrs={})=>{const n=document.createElementNS('http://www.w3.org/2000/svg',name);Object.entries(attrs).forEach(([key,value])=>n.setAttribute(key,String(value)));return n;};
    const svg=svgNode('svg',{viewBox:'0 0 720 220',role:'img','aria-label':`elELO progress across ${model.points.length-1} rated games, from ${model.points[0].rating.toFixed(2)} to ${model.points.at(-1).rating.toFixed(2)}`});
    for(let i=0;i<4;i++) {
      const value=model.min+(model.max-model.min)*i/3, y=190-i*55;
      svg.append(svgNode('line',{x1:55,x2:700,y1:y,y2:y,class:'elo-grid'}));
      const label=svgNode('text',{x:45,y:y+4,'text-anchor':'end',class:'elo-axis'});label.textContent=Math.round(value);svg.append(label);
    }
    for(const t of tiers.slice(1)) if(t.minimum>model.min && t.minimum<model.max) {
      const y=190-(t.minimum-model.min)*165/(model.max-model.min);
      svg.append(svgNode('line',{x1:55,x2:700,y1:y,y2:y,class:'elo-tier-line'}));
      const text=svgNode('text',{x:700,y:y-5,'text-anchor':'end',class:'elo-axis'});text.textContent=t.name+' · '+t.minimum;svg.append(text);
    }
    const line=model.points.map(p=>`${p.x},${p.y}`).join(' ');
    if(model.empty) svg.append(svgNode('line',{x1:55,x2:700,y1:model.points[0].y,y2:model.points[0].y,class:'elo-line elo-empty-line'}));
    else svg.append(svgNode('polygon',{points:`55,190 ${line} 700,190`,class:'elo-area'}),svgNode('polyline',{points:line,class:'elo-line'}));
    const guide=svgNode('line',{y1:25,y2:190,class:'elo-cursor'}), dot=svgNode('circle',{r:5,class:'elo-dot'});
    svg.append(guide,dot);
    const first=svgNode('text',{x:55,y:213,class:'elo-axis'});first.textContent=model.partial?'Before this range':'Start · '+model.points[0].rating.toFixed(0);
    const last=svgNode('text',{x:700,y:213,'text-anchor':'end',class:'elo-axis'});last.textContent=model.empty?'Your next main game':model.points.at(-1).date;
    svg.append(first,last);holder.append(svg);
    const slider=section.querySelector('.js-elelo-scrubber'), detail=section.querySelector('.js-elelo-detail'), link=section.querySelector('.js-elelo-analysis');
    slider.max=model.points.length-1;
    function select(index) {
      const p=model.points[index];slider.value=index;
      guide.setAttribute('x1',p.x);guide.setAttribute('x2',p.x);dot.setAttribute('cx',p.x);dot.setAttribute('cy',p.y);
      detail.textContent=p.start ? `${model.partial?'Before this range':'Starting rating'} · ${p.rating.toFixed(2)} elELO` : `${p.date} · ${p.rating.toFixed(2)} elELO · ${signed(p.change)} · Game Rating ${p.gameRating}/100`;
      slider.setAttribute('aria-valuetext',detail.textContent);
      link.hidden=!!p.start;
      if(!p.start) link.href='/analysis?date='+p.date.replaceAll('-','');
    }
    slider.oninput=()=>select(Number(slider.value));
    svg.addEventListener('pointermove',event=>{const box=svg.getBoundingClientRect();const x=(event.clientX-box.left)*720/box.width;select(Math.max(0,Math.min(model.points.length-1,Math.round((x-55)/645*(model.points.length-1)))));});
    select(model.points.length-1);
  }
  function initialize(root, account) {
    const section=root.querySelector('.elelo-card');
    const state={history:[],rating:400,account,loading:account,request:0};states.set(section,state);
    renderChart(section);
    const help=section.querySelector('.js-elelo-help');
    help.addEventListener('click',()=>help.setAttribute('aria-expanded',String(help.getAttribute('aria-expanded')!=='true')));
    help.addEventListener('blur',()=>help.setAttribute('aria-expanded','false'));
    help.addEventListener('keydown',event=>{if(event.key==='Escape')help.setAttribute('aria-expanded','false');});
    const button=section.querySelector('.js-elelo-leaders'), board=section.querySelector('.js-elelo-board'), personal=section.querySelector('.js-elelo-personal');
    function show(open) {board.hidden=!open;personal.hidden=open;button.setAttribute('aria-expanded',String(open));button.classList.toggle('is-active',open);(open?section.querySelector('.js-elelo-back'):button).focus({preventScroll:true});root.dispatchEvent(new Event('elementle:elo-layout'));}
    button.addEventListener('click',()=>{show(button.getAttribute('aria-expanded')!=='true');void refreshLeaderboard(root);});
    section.querySelector('.js-elelo-back').addEventListener('click',()=>show(false));
    section.querySelector('.js-elelo-window').addEventListener('change',()=>{renderChart(section);root.dispatchEvent(new Event('elementle:elo-layout'));});
    section.querySelector('.js-elelo-retry').addEventListener('click',()=>refreshLeaderboard(root));
    section.querySelector('.elelo-guide').addEventListener('toggle',()=>root.dispatchEvent(new Event('elementle:elo-layout')));
  }
  async function refreshLeaderboard(root) {
    const section=root.querySelector('.elelo-card'), state=states.get(section);
    if(!state) return;
    const id=++state.request, button=section.querySelector('.js-elelo-leaders'), list=section.querySelector('.js-elelo-list'), retry=section.querySelector('.js-elelo-retry');
    try {
      const response=await fetch('/api/leaderboard/elelo',{cache:'no-store',signal:AbortSignal.timeout(12000)});
      if(!response.ok) throw Error('Unavailable');
      const data=await response.json();
      if(id!==state.request || root.querySelector('.elelo-card')!==section) return;
      retry.hidden=true;
      section.querySelector('.js-elelo-launch-label').textContent=data.enabled?'elELO leaders':'Coming soon';
      section.querySelector('.elelo-board-caption').hidden=!data.enabled;
      if(!data.enabled) {
        list.replaceChildren();const li=document.createElement('li');li.className='leaderboard-empty';li.textContent='Coming soon';list.append(li);return;
      }
      list.replaceChildren();
      const username=window.getAuthUser?.()?.username;
      if(!data.leaders.length) {const li=document.createElement('li');li.className='leaderboard-empty';li.textContent='The first rated players will appear here.';list.append(li);}
      for(const [index,entry] of data.leaders.entries()) {
        const li=document.createElement('li');li.className='leaderboard-row elo-leader-row'+(entry.rank<=3?' rank-'+entry.rank:'')+(entry.username===username?' is-current-user':'');li.style.setProperty('--row-i',index);
        if(entry.username===username) li.setAttribute('aria-current','true');
        const rank=document.createElement('span');rank.className='leaderboard-rank';rank.textContent=entry.rank;
        const image=document.createElement('img');image.src=symbol(entry.tier);image.alt=entry.tier;image.className='tier-symbol';
        const name=document.createElement('span');name.className='leaderboard-username';
        const nameText=document.createElement('span');nameText.className='leaderboard-name-text';nameText.textContent=entry.username;name.append(nameText);
        if(entry.isLab===true) {const lab=document.createElement('img');lab.className='leaderboard-lab-icon';lab.src='/images/lab_icon.png';lab.width=18;lab.height=18;lab.alt='Elementle Lab member';lab.title='Elementle Lab member';name.append(lab);}
        const rating=document.createElement('strong');rating.className='leaderboard-streak';rating.textContent=Number(entry.rating).toFixed(2);
        li.append(rank,image,name,rating);list.append(li);
      }
    } catch {
      if(id!==state.request || root.querySelector('.elelo-card')!==section) return;
      if(!section.querySelector('.js-elelo-board').hidden) {list.replaceChildren();const li=document.createElement('li');li.className='leaderboard-error';li.textContent='Could not load elELO leaders.';list.append(li);retry.hidden=false;}
    }
  }
  function update(root, data) {
    const section=root.querySelector('.elelo-card'), state=states.get(section);if(!state)return;
    section.querySelector('.js-elelo-rating').textContent=data?Number(data.rating).toFixed(2):'—';
    section.querySelector('.js-elelo-tier').textContent=data?.tier || 'Rating unavailable';
    const image=section.querySelector('.js-elelo-symbol');image.hidden=!data;if(data) image.src=symbol(data.tier);
    state.rating=data?Number(data.rating):400;state.loading=false;
    const progress=rankProgress(state.rating);
    section.querySelector('.js-elelo-progress').hidden=!progress;
    if(progress) {
      section.querySelector('.js-elelo-next-tier').textContent=progress.name;
      section.querySelector('.js-elelo-next-rating').textContent=progress.target;
      const bar=section.querySelector('.js-elelo-rank-bar');bar.value=progress.value;
      bar.setAttribute('aria-label',`Progress toward ${progress.name}: ${progress.remaining.toFixed(2)} elELO to go`);
    }
    state.history=data?.history || [];renderChart(section);
    if(!data) section.querySelector('.js-elelo-chart-status').textContent='Could not load your progress. Return to this tab to retry.';
  }
  window.ElementleElo={markup,initialize,update,refreshLeaderboard,chartModel,rankProgress,tiers};
})();

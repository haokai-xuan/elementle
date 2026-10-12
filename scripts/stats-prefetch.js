/* Warm Stats after the daily game loads; never delay gameplay or replay notices. */
(() => {
  if (['archive', 'freeplay'].includes(new URLSearchParams(location.search).get('mode'))) return;
  let timer, running = null;
  const read = key => localStorage.getItem(key) || '';
  const day = () => {const now=new Date();return String(now.getFullYear()*10000+(now.getMonth()+1)*100+now.getDate());};
  const scopeRevision = () => read('elementle_stats_revision');
  function cached(key, scope) {
    try {const entry=JSON.parse(sessionStorage.getItem('elementle_stats_cache_'+key) || 'null');return entry?.scope===scope && entry.expiresAt>Date.now();} catch {return false;}
  }
  function save(key, scope, ttl, data) {
    try {sessionStorage.setItem('elementle_stats_cache_'+key,JSON.stringify({scope,expiresAt:Date.now()+ttl,data}));} catch {}
  }
  async function preload() {
    if (document.hidden) return;
    if (running) {try {await running;} catch {} return preload();}
    const work=(async()=>{
      if (await window.ElementleGameReady !== true) return;
      await window.ElementlePendingGameSave?.();
      if (document.hidden) return;
      const token=read('elementle_token'), date=day(), revision=scopeRevision(), labRevision=read('elementle_lab_revision');
      const current=()=>token===read('elementle_token') && date===day() && revision===scopeRevision() && labRevision===read('elementle_lab_revision');
      if (token) {
        const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token));
        const scope=date+':'+Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('')+':'+revision+':0:'+labRevision;
        if (!cached('personal',scope)) {
          const response=await fetch('/api/user/stats?localDate='+date,{cache:'no-store',headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(12000)});
          if (!response.ok) return;
          const data=await response.json();
          if (!current()) return;
          if (data.streakFreezes) data.streakFreezes={...data.streakFreezes,used:0,earned:false};
          save('personal',scope,30000,data);
        }
      }
      if (!current()) return;
      const communityScope=date+':'+revision;
      if (!cached('community',communityScope)) {
        const response=await fetch('/api/guess_distribution',{cache:'no-store',signal:AbortSignal.timeout(12000)});
        if (response.ok) {const data=await response.json();if(current())save('community',communityScope,300000,data);}
      }
    })();
    running=work;
    try {await work;} catch {} finally {if(running===work)running=null;}
  }
  function schedule() {clearTimeout(timer);timer=setTimeout(preload,1500);}
  window.addEventListener('elementle:game-complete',schedule);
  window.addEventListener('elementle:auth-change',schedule);
  window.addEventListener('storage',event=>{if(['elementle_token','elementle_stats_revision','elementle_lab_revision'].includes(event.key))schedule();});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule();});
  schedule();
})();

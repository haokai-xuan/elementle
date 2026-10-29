/* Start daily-game I/O in the head, before optional scripts and page artwork. */
(() => {
  if (['archive','freeplay'].includes(new URLSearchParams(location.search).get('mode'))) return;
  const now=new Date(),date=now.getFullYear()*10000+(now.getMonth()+1)*100+now.getDate();
  const token=localStorage.getItem('elementle_token');
  const promise=fetch(token?'/api/game/bootstrap?localDate='+date:'/api/mystery_element/'+date, {
    cache:token?'no-store':'default',headers:token?{Authorization:'Bearer '+token}:{},signal:AbortSignal.timeout(15000)
  }).then(response=>{
    if (token && response.status===404) return {useLegacyEndpoints:true};
    return response.ok?response.json():null;
  }).catch(()=>null);
  window.ElementleDailyBootstrap={date,token,promise};
})();

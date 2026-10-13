/* Start protected practice I/O before the game controller and artwork load. */
(() => {
  const params=new URLSearchParams(location.search),mode=params.get('mode');
  if (!['archive','freeplay'].includes(mode)) return;
  const token=localStorage.getItem('elementle_token');
  if (!token) return;
  const now=new Date(),localDate=now.getFullYear()*10000+(now.getMonth()+1)*100+now.getDate();
  const date=params.get('date');
  if (mode==='archive' && (!/^\d{8}$/.test(date || '') || Number(date)>=localDate)) return;
  let guest=localStorage.getItem('elementle_guest_id');
  if (!guest) {guest=crypto.randomUUID();localStorage.setItem('elementle_guest_id',guest);}
  const prefix=`elementle_${mode}_${date || 'session'}_${token}_`;
  if (mode==='freeplay') {
    if (!localStorage.getItem(prefix+'sessionId')) return;
    try { if (JSON.parse(localStorage.getItem(prefix+'practiceSnapshot') || 'null')?.draft) return; } catch {}
  }
  const body={mode,date,localDate,gameId:mode==='freeplay'?localStorage.getItem(prefix+'sessionId'):null};
  const promise=fetch('/api/practice/start',{
    method:'POST',cache:'no-store',
    headers:{'Content-Type':'application/json','X-Guest-ID':guest,Authorization:'Bearer '+token},
    body:JSON.stringify(body),signal:AbortSignal.timeout(12000)
  });
  promise.catch(()=>{});
  window.ElementlePracticeBootstrap={token,body,promise,consumed:false};
})();

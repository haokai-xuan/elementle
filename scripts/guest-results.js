/* Retry immutable completed guest main results without blocking local play. */
(() => {
  const storageKey = 'elementle_pending_guest_results';
  let running = false;
  function read() {
    try { return JSON.parse(localStorage.getItem(storageKey) || '{}'); } catch { return {}; }
  }
  function write(queue) { localStorage.setItem(storageKey, JSON.stringify(queue)); }
  async function flush() {
    if (running) return;
    running = true;
    try {
      for (const [key, entry] of Object.entries(read())) {
        try {
          const response = await fetch('/api/game/guest-result', {
            method:'POST', keepalive:true, headers:{'Content-Type':'application/json','X-Guest-ID':entry.guestId},
            body:JSON.stringify(entry.body), signal:AbortSignal.timeout(20000)
          });
          // Success includes duplicate acknowledgements. Invalid/conflicting
          // payloads cannot be retried; retain failures from unavailable services.
          if (response.ok || [400, 404, 409].includes(response.status)) {
            const queue = read();
            if (JSON.stringify(queue[key]) === JSON.stringify(entry)) { delete queue[key]; write(queue); }
          }
        } catch { /* Keep the completed transcript for the next retry. */ }
      }
    } finally { running = false; }
  }
  window.ElementleGuestResults = {
    record(guestId, body) {
      const key = guestId + ':' + body.localDate;
      const queue = read();
      if (!queue[key]) { queue[key] = {guestId, body}; write(queue); }
      void flush();
    },
    flush
  };
  window.addEventListener('online', flush);
  window.addEventListener('focus', flush);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) void flush(); });
  void flush();
})();

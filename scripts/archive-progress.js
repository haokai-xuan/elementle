(function (root) {
  const PREFIX = 'elementle_archive_progress_';
  function key() {
    let guest = localStorage.getItem('elementle_guest_id');
    if (!guest) { guest = crypto.randomUUID(); localStorage.setItem('elementle_guest_id', guest); }
    return PREFIX + (localStorage.getItem('elementle_token') || guest);
  }
  function read() {
    try { return JSON.parse(localStorage.getItem(key())) || { snapshot: null, progress: {} }; }
    catch { return { snapshot: null, progress: {} }; }
  }
  function save(value) {
    try { localStorage.setItem(key(), JSON.stringify(value)); } catch {}
  }
  root.ElementleArchiveProgress = {
    prefix: PREFIX,
    read,
    publish(date, completed, pending) {
      const value = read();
      value.progress[String(date)] = { status: completed ? 'complete' : 'in-progress', pending: !!pending };
      save(value);
      root.dispatchEvent(new Event('elementle:archive-progress'));
    },
    cache(snapshot) {
      const value = read();
      value.snapshot = snapshot;
      save(value);
    },
    merge(snapshot) {
      const progress = { ...(snapshot.progress || {}) };
      for (const [date, entry] of Object.entries(read().progress || {})) {
        // An archive can only advance. Never let a delayed response erase local progress.
        if (progress[date] !== 'complete') progress[date] = entry.status;
      }
      return { ...snapshot, progress };
    }
  };
})(window);

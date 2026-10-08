(function (root) {
  function tier(solved, clean) {
    return solved >= 5 && clean >= 3 ? 4 : solved >= 3 && clean >= 1 ? 3 : solved >= 2 ? 2 : solved >= 1 ? 1 : 0;
  }
  function aggregate(records, startDate) {
    const result = {};
    for (const r of records) {
      if (!Number.isInteger(r.number) || r.number < 1 || r.number > 118 || r.date < startDate || !r.guesses) continue;
      const s = result[r.number] ||= { encounters: 0, solved: 0, clean: 0, totalGuesses: 0, fewest: null, firstSolved: null, last: r.date };
      s.encounters++;
      s.last = [s.last, r.lastDate || r.date].sort().at(-1);
      if (r.won) {
        s.solved++; s.clean += r.hint === false ? 1 : 0; s.totalGuesses += r.guesses;
        s.fewest = Math.min(s.fewest ?? 8, r.guesses);
        s.firstSolved = [s.firstSolved || r.lastDate || r.date, r.lastDate || r.date].sort()[0];
      }
      s.tier = tier(s.solved, s.clean);
    }
    return result;
  }
  const key = 'elementle_vault_guest_daily_v1';
  function guestRecords() {
    try {
      // Import the current guest daily game, including a solve made before the vault shipped.
      const cached = JSON.parse(localStorage.getItem('elementle_mystery_element') || 'null');
      const day = localStorage.getItem('gameDate');
      const guesses = Number(localStorage.getItem('numberOfGuesses'));
      if (!localStorage.getItem('elementle_token') && cached && String(cached.date) === day && /^\d{8}$/.test(day) && guesses > 0) {
        const won = localStorage.getItem('guessedCorrectly') === 'true';
        const hintAt = localStorage.getItem('hintUsedAtGuess:' + day);
        recordGuest({number: Number(cached.atomicNumber), date: day.slice(0,4)+'-'+day.slice(4,6)+'-'+day.slice(6,8), guesses, won,
          hint: localStorage.getItem('hintUsed:' + day) === 'true' && !(won && hintAt !== null && Number(hintAt) >= guesses)});
      }
      return Object.values(JSON.parse(localStorage.getItem(key) || '{}'));
    } catch { return []; }
  }
  function recordGuest(record) {
    if (localStorage.getItem('elementle_token')) return;
    try {
      const records = JSON.parse(localStorage.getItem(key) || '{}');
      const previous = records[record.date];
      if (previous && previous.guesses > record.guesses) return;
      records[record.date] = { ...record, hint: !!(record.hint || previous?.hint) };
      localStorage.setItem(key, JSON.stringify(records));
    } catch { /* Storage may be disabled. The game remains playable. */ }
  }
  const api = { tier, aggregate, guestRecords, recordGuest };
  if (typeof module !== 'undefined') module.exports = api;
  else root.ElementleVault = api;
})(typeof window === 'undefined' ? globalThis : window);

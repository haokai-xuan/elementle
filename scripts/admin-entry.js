(async () => {
  try {
    const token = localStorage.getItem('elementle_token');
    if (!token) return;
    const response = await fetch('/api/admin/page', {
      headers: { Authorization: 'Bearer ' + token }, cache: 'no-store'
    });
    if (!response.ok) return;
    const html = await response.text();
    // Discard a response belonging to an account that signed out while loading.
    if (localStorage.getItem('elementle_token') !== token) return;
    document.open();
    document.write(html);
    document.close();
  } catch {
    // Missing/invalid sessions and unavailable verification leave the page blank.
  }
})();

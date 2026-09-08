(function () {
  document.querySelectorAll('.js-current-year').forEach(function (element) {
    element.textContent = String(new Date().getFullYear());
  });

  function openGooglePrivacyChoices(event) {
    if (!window.googlefc || typeof window.googlefc.showRevocationMessage !== 'function') return;
    event.preventDefault();
    window.googlefc.showRevocationMessage();
  }

  document.querySelectorAll('.js-privacy-settings').forEach(function (link) {
    link.addEventListener('click', openGooglePrivacyChoices);
  });
})();

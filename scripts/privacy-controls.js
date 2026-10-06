(function () {
  document.querySelectorAll('.js-current-year').forEach(function (element) {
    element.textContent = String(new Date().getFullYear());
  });

  // Privacy links lead to the policy; Mediavine supplies its own Manage Preferences control.
})();

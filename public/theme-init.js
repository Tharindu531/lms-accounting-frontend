// Applies the saved theme before first paint so dark-mode users never see a white flash.
(function () {
  try {
    var t = localStorage.getItem('theme') || 'system';
    var dark = t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (dark) document.documentElement.classList.add('dark');
    var l = localStorage.getItem('lang');
    if (l === 'si') document.documentElement.lang = 'si';
  } catch { /* storage blocked: default light theme */ }
})();

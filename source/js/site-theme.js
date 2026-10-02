/* Standalone study pages use the same preference as Fluid's blog switch. */
(function () {
  'use strict';
  var key = 'Fluid_Color_Scheme';
  var root = document.documentElement;
  function savedScheme() {
    try { return localStorage.getItem(key) === 'dark' ? 'dark' : 'light'; }
    catch (_) { return 'light'; }
  }
  function apply(scheme) {
    root.setAttribute('data-user-color-scheme', scheme);
    var button = document.querySelector('.site-theme-toggle');
    if (button) {
      var label = scheme === 'dark' ? '切换到明亮模式' : '切换到深色模式';
      button.setAttribute('aria-label', label);
      button.title = label;
      button.innerHTML = scheme === 'dark'
        ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M20.5 14A8.5 8.5 0 0 1 10 3.5 8.5 8.5 0 1 0 20.5 14Z"/></svg>';
    }
  }
  apply(savedScheme());
  document.addEventListener('DOMContentLoaded', function () {
    var nav = document.createElement('nav');
    nav.className = 'site-nav';
    nav.setAttribute('aria-label', '站点导航');
    nav.innerHTML = '<div class="site-nav-inner"><a class="site-brand" href="/">zhp的博客</a><div class="site-nav-links"><a href="/">博客</a><a href="/quiz/">刷题中心</a><a href="/ai/">AI 对话</a><button class="site-theme-toggle" type="button"></button></div></div>';
    document.body.prepend(nav);
    nav.querySelectorAll('.site-nav-links a').forEach(function (link) {
      if (link.getAttribute('href') === window.location.pathname) link.setAttribute('aria-current', 'page');
    });
    nav.querySelector('button').addEventListener('click', function () {
      var scheme = root.getAttribute('data-user-color-scheme') === 'dark' ? 'light' : 'dark';
      try {
        if (scheme === 'light') localStorage.removeItem(key);
        else localStorage.setItem(key, scheme);
      } catch (_) {}
      apply(scheme);
    });
    apply(savedScheme());
  });
  window.addEventListener('storage', function (event) {
    if (event.key === key || event.key === null) apply(savedScheme());
  });
})();

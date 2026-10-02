/* Restore math on archived standalone reading pages using the blog engine. */
(function () {
  'use strict';
  var reading = document.querySelector('.page-content.markdown-body');
  if (!reading) return;
  if (window.Fluid && Fluid.boot) Fluid.boot.refresh();
  if (!reading.querySelector('.math-inline-legacy, .math-display-legacy') || window.MathJax) return;
  window.MathJax = {
    tex: { inlineMath: { '[+]': [['$', '$']] } },
    loader: { load: ['ui/lazy'] }
  };
  var script = document.createElement('script');
  script.src = 'https://lib.baomitu.com/mathjax/3.2.2/es5/tex-mml-chtml.js';
  script.async = true;
  document.head.appendChild(script);
})();

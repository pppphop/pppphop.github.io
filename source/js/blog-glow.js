/* Layout enhancements for Fluid; article text and copy targets stay intact. */
(function () {
  "use strict";

  document.querySelectorAll(".markdown-body figure.highlight").forEach(function (figure) {
    var table = figure.querySelector("table");
    if (table) {
      var scroll = document.createElement("div");
      scroll.className = "glow-code-scroll";
      table.before(scroll);
      scroll.appendChild(table);
    }
    figure.querySelectorAll("pre").forEach(function (pre) {
      pre.classList.add("glow-code-pre");
    });
  });

  document.querySelectorAll(".markdown-body pre").forEach(function (pre) {
    if (pre.closest("figure.highlight") || pre.querySelector("code.mermaid")) return;
    var wrapper = pre.closest(".code-wrapper");
    if (!wrapper) {
      wrapper = document.createElement("div");
      wrapper.className = "code-wrapper";
      pre.before(wrapper);
      wrapper.appendChild(pre);
    }
    var scroll = document.createElement("div");
    scroll.className = "glow-code-scroll";
    pre.before(scroll);
    scroll.appendChild(pre);
    pre.classList.add("glow-code-pre");
  });

  var root = document.documentElement;
  var markdown = document.querySelector(".markdown-body");
  if (markdown) {
    var mathPending = false;
    function fitMath() {
      mathPending = false;
      markdown.querySelectorAll("mjx-container").forEach(function (container) {
        var math = container.querySelector("mjx-math, svg");
        if (!math) return;
        // Only long formulas need a scrolling box; short inline formulas
        // keep their natural baseline and never acquire tiny scrollbars.
        var parent = container.parentElement;
        while (parent && (!parent.clientWidth || getComputedStyle(parent).display === "inline")) {
          parent = parent.parentElement;
        }
        var available = parent ? parent.clientWidth : 0;
        container.classList.toggle("glow-wide-math",
          available > 0 && math.getBoundingClientRect().width > available);
      });
    }
    function scheduleMath() {
      if (!mathPending) {
        mathPending = true;
        requestAnimationFrame(fitMath);
      }
    }
    new MutationObserver(scheduleMath).observe(markdown, { childList: true, subtree: true });
    window.addEventListener("resize", scheduleMath);
    if (document.fonts) document.fonts.ready.then(scheduleMath);
    scheduleMath();
  }
  var article = document.querySelector(".post-content .markdown-body");
  if (article) {
    var bar = document.createElement("div");
    bar.className = "read-progress";
    bar.setAttribute("aria-hidden", "true");
    document.body.appendChild(bar);
    var ticking = false;
    function update() {
      var rect = article.getBoundingClientRect();
      var start = window.scrollY + rect.top - 80;
      var length = Math.max(1, rect.height - window.innerHeight + 80);
      var progress = Math.max(0, Math.min(1, (window.scrollY - start) / length));
      bar.style.width = progress * 100 + "%";
      ticking = false;
    }
    function schedule() {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    }
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    if ("ResizeObserver" in window) new ResizeObserver(schedule).observe(article);
    update();
  }

  var cards = document.querySelectorAll(".index-card:not(.home-taxonomy-panel)");
  if (cards.length && "IntersectionObserver" in window &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px" });
    cards.forEach(function (card) { observer.observe(card); });
    root.classList.add("js-reveal");
  }
})();

/* Give each tag-cloud link a distinct, readable color.
 * Fluid renders the tag cloud as a gradient between two close-in-hue
 * colors (light lavender -> blue), which is low-contrast and hard to
 * tell apart. We override each link with an evenly-spaced hue so every
 * tag gets its own color, while keeping Fluid's font-size (popularity)
 * differences untouched. */
(function () {
  "use strict";

  function isDark() {
    return document.documentElement.getAttribute("data-user-color-scheme") === "dark";
  }

  function colorize() {
    // Fluid puts the tag cloud inside .tag-cloud-tags (tag page) /
    // .tagcloud. Grab the links that carry an inline gradient color.
    var containers = document.querySelectorAll(
      ".tag-cloud-tags, .tagcloud, #tag-cloud, .post-tags"
    );
    var links = [];
    containers.forEach(function (box) {
      box.querySelectorAll("a").forEach(function (a) { links.push(a); });
    });
    if (!links.length) return;

    var dark = isDark();
    // Dark bg -> lighter, more saturated text; light bg -> deeper text.
    var sat = dark ? 70 : 68;
    var light = dark ? 68 : 42;
    var n = links.length;

    links.forEach(function (a, i) {
      var hue = Math.round((360 / n) * i);
      var col = "hsl(" + hue + ", " + sat + "%, " + light + "%)";
      a.style.setProperty("color", col, "important");
      // Fluid colors tags via -webkit-text-fill-color, which wins over
      // `color`, so we must override it too or our color has no effect.
      a.style.setProperty("-webkit-text-fill-color", col, "important");
      a.style.setProperty("font-weight", "500", "important");
      a.dataset.tagHue = hue; // remember hue so hover/theme flip can reuse it
    });
  }

  function run() {
    // Defer one tick so Fluid finishes writing its inline colors first.
    setTimeout(colorize, 0);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }

  // Re-run when the user toggles dark/light mode.
  var observer = new MutationObserver(function (mutations) {
    for (var i = 0; i < mutations.length; i++) {
      if (mutations[i].attributeName === "data-user-color-scheme") {
        colorize();
        break;
      }
    }
  });
  observer.observe(document.documentElement, { attributes: true });
})();

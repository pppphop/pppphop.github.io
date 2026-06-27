(function () {
  function restoreLegacyMathScripts() {
    var scripts = document.querySelectorAll('script[type^="math/tex"]');
    if (!scripts.length) return false;

    Array.prototype.forEach.call(scripts, function (script) {
      var type = (script.getAttribute('type') || '').toLowerCase();
      var tex = script.textContent || '';
      var isDisplay = type.indexOf('mode=display') !== -1;
      var wrapper = document.createElement(isDisplay ? 'div' : 'span');

      wrapper.className = isDisplay ? 'math-display-legacy' : 'math-inline-legacy';
      wrapper.textContent = isDisplay ? '\\[' + tex + '\\]' : '\\(' + tex + '\\)';
      script.parentNode.replaceChild(wrapper, script);
    });

    return true;
  }

  function typesetRestoredMath() {
    if (!window.MathJax) return;

    try {
      if (
        MathJax.startup &&
        MathJax.startup.document &&
        typeof MathJax.startup.document.state === 'function'
      ) {
        MathJax.startup.document.state(0);
      }
      if (typeof MathJax.texReset === 'function') {
        MathJax.texReset();
      }
      if (typeof MathJax.typesetPromise === 'function') {
        MathJax.typesetPromise();
      } else if (typeof MathJax.typeset === 'function') {
        MathJax.typeset();
      }
    } catch (error) {
      setTimeout(typesetRestoredMath, 120);
    }
  }

  if (restoreLegacyMathScripts()) {
    typesetRestoredMath();
  }

  var excerpts = document.querySelectorAll('.index-excerpt');
  if (!excerpts.length) return;

  var texWords = {
    '\\subseteq': ' subseteq ',
    '\\subset': ' subset ',
    '\\supseteq': ' supseteq ',
    '\\supset': ' supset ',
    '\\cup': ' union ',
    '\\cap': ' intersect ',
    '\\in': ' in ',
    '\\notin': ' notin ',
    '\\emptyset': ' empty set ',
    '\\varnothing': ' empty set ',
    '\\leq': ' <= ',
    '\\le': ' <= ',
    '\\geq': ' >= ',
    '\\ge': ' >= ',
    '\\neq': ' != ',
    '\\ne': ' != ',
    '\\approx': ' approx ',
    '\\times': ' x ',
    '\\cdot': ' * ',
    '\\pm': ' +- ',
    '\\to': ' -> ',
    '\\rightarrow': ' -> ',
    '\\leftarrow': ' <- ',
    '\\Rightarrow': ' => ',
    '\\implies': ' => ',
    '\\forall': ' for all ',
    '\\exists': ' exists ',
    '\\infty': ' infinity '
  };

  function simplifyTex(tex) {
    return String(tex || '')
      .replace(/\\(?:mathbb|mathrm|text|operatorname)\{([^{}]+)\}/g, '$1')
      .replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '$1/$2')
      .replace(/\\sqrt\{([^{}]+)\}/g, 'sqrt($1)')
      .replace(/\\[a-zA-Z]+/g, function (token) {
        return texWords[token] || token.replace(/^\\/, '');
      })
      .replace(/\\([{}()[\],;])/g, '$1')
      .replace(/[{}]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function cleanExcerpt(text) {
    var cleaned = String(text || '')
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\$\$([\s\S]*?)\$\$/g, function (_, tex) { return simplifyTex(tex); })
      .replace(/\$([^$\n]+)\$/g, function (_, tex) { return simplifyTex(tex); })
      .replace(/\\\((.*?)\\\)/g, function (_, tex) { return simplifyTex(tex); })
      .replace(/\\\[([\s\S]*?)\\\]/g, function (_, tex) { return simplifyTex(tex); })
      .replace(/^#+\s*/gm, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (cleaned.length > 190) {
      cleaned = cleaned.slice(0, 190).replace(/[，。；、,.!?:：;]\s*[^，。；、,.!?:：;]*$/, '') + '...';
    }
    return cleaned;
  }

  Array.prototype.forEach.call(excerpts, function (node) {
    var text = cleanExcerpt(node.textContent || '');
    node.textContent = text;
    node.classList.add('index-excerpt-clean');
  });
})();

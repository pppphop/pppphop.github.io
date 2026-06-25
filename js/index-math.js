(function () {
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

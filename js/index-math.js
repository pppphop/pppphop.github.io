(function () {
  var excerpts = document.querySelectorAll('.index-excerpt');
  if (!excerpts.length) return;

  var texMap = {
    '\\subseteq': '⊆',
    '\\subset': '⊂',
    '\\supseteq': '⊇',
    '\\supset': '⊃',
    '\\cup': '∪',
    '\\cap': '∩',
    '\\in': '∈',
    '\\notin': '∉',
    '\\emptyset': '∅',
    '\\varnothing': '∅',
    '\\leq': '≤',
    '\\le': '≤',
    '\\geq': '≥',
    '\\ge': '≥',
    '\\neq': '≠',
    '\\ne': '≠',
    '\\approx': '≈',
    '\\times': '×',
    '\\cdot': '·',
    '\\pm': '±',
    '\\to': '→',
    '\\rightarrow': '→',
    '\\leftarrow': '←',
    '\\Rightarrow': '⇒',
    '\\implies': '⇒',
    '\\forall': '∀',
    '\\exists': '∃',
    '\\infty': '∞'
  };

  function plainTex(text) {
    return String(text || '')
      .replace(/\\mathbb\{([^}]+)\}/g, '$1')
      .replace(/\\mathrm\{([^}]+)\}/g, '$1')
      .replace(/\\text\{([^}]+)\}/g, '$1')
      .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '$1/$2')
      .replace(/\\sqrt\{([^}]+)\}/g, '√($1)')
      .replace(/\\+[a-zA-Z]+/g, function (token) {
        var command = '\\' + token.replace(/^\\+/, '');
        return texMap[command] || command.replace(/^\\/, '');
      })
      .replace(/\\+([{}()[\],;])/g, '$1')
      .replace(/[{}]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function cleanExcerpt(text) {
    var cleaned = String(text || '')
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/\s+/g, ' ')
      .trim();

    var dollars = cleaned.match(/(^|[^\\])\$/g) || [];
    if (dollars.length % 2 === 1) {
      cleaned = cleaned.slice(0, cleaned.lastIndexOf('$')).trim();
    }

    return cleaned
      .replace(/\$\$([^$]+)\$\$/g, function (_, tex) { return plainTex(tex); })
      .replace(/\$([^$\n]+)\$/g, function (_, tex) { return plainTex(tex); })
      .replace(/\\\((.*?)\\\)/g, function (_, tex) { return plainTex(tex); })
      .replace(/\\\[(.*?)\\\]/g, function (_, tex) { return plainTex(tex); })
      .replace(/\s+/g, ' ')
      .trim();
  }

  Array.prototype.forEach.call(excerpts, function (node) {
    node.textContent = cleanExcerpt(node.textContent || '');
  });
})();

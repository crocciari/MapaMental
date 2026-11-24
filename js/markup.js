/**
 * Mini-marcação segura (sem innerHTML) para negrito (**texto**),
 * itálico (__texto__), destaque invertido (==texto==) e texto menor (--texto--).
 */

const TOKEN_RE = /(==([^\n]+?)==|\*\*([^\n]+?)\*\*|__([^\n]+?)__|--([^\n]+?)--)/g;

export function parseInlineMarkup(text) {
  const src = String(text || '');
  if (!src) return [];

  const tokens = [];
  let lastIndex = 0;
  TOKEN_RE.lastIndex = 0;

  let match;
  while ((match = TOKEN_RE.exec(src)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ type: 'text', value: src.slice(lastIndex, match.index) });
    }
    if (match[2] !== undefined) {
      tokens.push({ type: 'highlight', value: match[2] });
    } else if (match[3] !== undefined) {
      tokens.push({ type: 'bold', value: match[3] });
    } else if (match[4] !== undefined) {
      tokens.push({ type: 'italic', value: match[4] });
    } else if (match[5] !== undefined) {
      tokens.push({ type: 'small', value: match[5] });
    }
    lastIndex = TOKEN_RE.lastIndex;
  }

  if (lastIndex < src.length) {
    tokens.push({ type: 'text', value: src.slice(lastIndex) });
  }

  return tokens;
}

export function stripMarkup(text) {
  return parseInlineMarkup(text)
    .map((t) => t.value)
    .join('');
}

export function renderFormattedText(el, text) {
  el.textContent = '';
  const tokens = parseInlineMarkup(text);
  if (!tokens.length) return;

  const frag = document.createDocumentFragment();
  for (const tok of tokens) {
    if (tok.type === 'bold') {
      const strong = document.createElement('strong');
      strong.className = 'fmt-bold';
      strong.textContent = tok.value;
      frag.appendChild(strong);
    } else if (tok.type === 'italic') {
      const em = document.createElement('em');
      em.className = 'fmt-italic';
      em.textContent = tok.value;
      frag.appendChild(em);
    } else if (tok.type === 'highlight') {
      const mark = document.createElement('mark');
      mark.className = 'fmt-highlight';
      mark.textContent = tok.value;
      frag.appendChild(mark);
    } else if (tok.type === 'small') {
      const small = document.createElement('small');
      small.className = 'fmt-small';
      small.textContent = tok.value;
      frag.appendChild(small);
    } else {
      frag.appendChild(document.createTextNode(tok.value));
    }
  }
  el.appendChild(frag);
}

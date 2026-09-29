// TypeForge lexer — Tyl language tokens with line positions.

export class LexError extends Error {
  constructor(message, line) {
    super(`${message} (line ${line})`);
    this.line = line;
  }
}

const KEYWORDS = new Set(['let', 'in', 'fn', 'if', 'then', 'else', 'true', 'false']);

export function lex(src) {
  const tokens = [];
  let i = 0;
  let line = 1;

  const push = (type, value) => tokens.push({ type, value, line });

  while (i < src.length) {
    const c = src[i];
    if (c === '\n') { line++; i++; continue; }
    if (/\s/.test(c)) { i++; continue; }
    if (src.startsWith('//', i)) { while (i < src.length && src[i] !== '\n') i++; continue; }

    if (/[0-9]/.test(c)) {
      let n = '';
      while (i < src.length && /[0-9]/.test(src[i])) { n += src[i]; i++; }
      push('INT', Number(n));
      continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      let name = '';
      while (i < src.length && /[A-Za-z0-9_']/.test(src[i])) { name += src[i]; i++; }
      push(KEYWORDS.has(name) ? name.toUpperCase() : 'IDENT', name);
      continue;
    }
    if (c === '"') {
      i++;
      let s = '';
      while (i < src.length && src[i] !== '"') {
        if (src[i] === '\n') throw new LexError('unterminated string', line);
        s += src[i];
        i++;
      }
      if (i >= src.length) throw new LexError('unterminated string', line);
      i++;
      push('STR', s);
      continue;
    }
    const two = src.slice(i, i + 2);
    if (['=>', '::', '==', '!=', '<=', '>='].includes(two)) {
      push(two === '=>' ? 'ARROW' : two, two);
      i += 2;
      continue;
    }
    if ('+-*/<>=()[]::,.'.includes(c)) {
      push(c, c);
      i++;
      continue;
    }
    throw new LexError(`unexpected character '${c}'`, line);
  }
  push('EOF', null, line);
  return tokens;
}

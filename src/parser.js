// TypeForge parser — Tyl expressions → AST (with line positions).
//
//   expr := let IDENT = expr in expr
//         | fn IDENT => expr
//         | if expr then expr else expr
//         | cmp
//   cmp  := add (('==' | '!=' | '<' | '>') add)?
//   add  := mul (('+' | '-') mul)*
//   mul  := cons (('*' | '/') cons)*        — cons binds loosest of these
//   cons := unary ('::' cons)?              — right-assoc list cons
//   unary:= '-' unary | app
//   app  := atom atom*                      — left-assoc application
//   atom := INT | STR | true | false | IDENT | (expr) | [expr, …] | []

import { lex } from './lexer.js';
import { LexError } from './lexer.js';

export class ParseError extends Error {
  constructor(message, line) {
    super(`${message} (line ${line})`);
    this.line = line;
  }
}

export function parse(src) {
  const tokens = lex(src);
  let p = 0;
  const peek = () => tokens[p];
  const eat = (t) => (peek().type === t ? (p++, true) : false);
  const expect = (t, what) => {
    if (!eat(t)) throw new ParseError(`expected ${what ?? t} but found '${peek().value ?? peek().type}'`, peek().line);
    return tokens[p - 1];
  };

  function parseExpr() {
    if (eat('LET')) {
      const line = peek().line;
      const name = expect('IDENT', 'a name').value;
      expect('=', "'='");
      const value = parseExpr();
      expect('IN', "'in'");
      const body = parseExpr();
      return { kind: 'let', name, value, body, line };
    }
    if (eat('FN')) {
      const line = peek().line;
      const param = expect('IDENT', 'a parameter name').value;
      expect('ARROW', "'=>'");
      const body = parseExpr();
      return { kind: 'fn', param, body, line };
    }
    if (eat('IF')) {
      const line = peek().line;
      const cond = parseExpr();
      expect('THEN', "'then'");
      const thenE = parseExpr();
      expect('ELSE', "'else'");
      const elseE = parseExpr();
      return { kind: 'if', cond, thenE, elseE, line };
    }
    return parseCmp();
  }

  function parseCmp() {
    const left = parseAdd();
    const t = peek();
    if (['==', '!=', '<', '>'].includes(t.type)) {
      p++;
      const right = parseAdd();
      return { kind: 'bin', op: t.type, left, right, line: t.line };
    }
    return left;
  }

  function parseAdd() {
    let left = parseCons();
    while (peek().type === '+' || peek().type === '-') {
      const op = peek().type;
      const line = peek().line;
      p++;
      const right = parseCons();
      left = { kind: 'bin', op, left, right, line };
    }
    return left;
  }

  function parseCons() {
    const left = parseMul();
    if (eat('::')) {
      const right = parseCons(); // right-assoc
      return { kind: 'cons', head: left, tail: right, line: peek().line };
    }
    return left;
  }

  function parseMul() {
    let left = parseUnary();
    while (peek().type === '*' || peek().type === '/') {
      const op = peek().type;
      const line = peek().line;
      p++;
      const right = parseUnary();
      left = { kind: 'bin', op, left, right, line };
    }
    return left;
  }

  function parseUnary() {
    if (eat('-')) {
      const inner = parseUnary();
      return { kind: 'neg', expr: inner, line: peek().line };
    }
    return parseApp();
  }

  function parseApp() {
    let fn = parseAtom();
    while (true) {
      const t = peek();
      if (['INT', 'STR', 'IDENT', 'TRUE', 'FALSE', '(', '['].includes(t.type)) {
        const arg = parseAtom();
        fn = { kind: 'app', fn, arg, line: t.line };
      } else break;
    }
    return fn;
  }

  function parseAtom() {
    const t = peek();
    switch (t.type) {
      case 'INT': p++; return { kind: 'int', value: t.value, line: t.line };
      case 'STR': p++; return { kind: 'str', value: t.value, line: t.line };
      case 'TRUE': p++; return { kind: 'bool', value: true, line: t.line };
      case 'FALSE': p++; return { kind: 'bool', value: false, line: t.line };
      case 'IDENT': p++; return { kind: 'var', name: t.value, line: t.line };
      case '(': {
        p++;
        const inner = parseExpr();
        expect(')', "')'");
        return inner;
      }
      case '[': {
        p++;
        const items = [];
        if (!eat(']')) {
          do {
            items.push(parseExpr());
          } while (eat(','));
          expect(']', "']'");
        }
        return items.reduceRight(
          (tail, item) => ({ kind: 'cons', head: item, tail, line: t.line }),
          { kind: 'nil', line: t.line },
        );
      }
      default:
        throw new ParseError(`unexpected '${t.value ?? t.type}'`, t.line);
    }
  }

  const forms = [];
  while (peek().type !== 'EOF') forms.push(parseExpr());
  return forms;
}

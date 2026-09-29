// TypeForge — public API.

import { lex, LexError } from './lexer.js';
import { parse, ParseError } from './parser.js';
import {
  infer, unify, resetVars, TypeErrorW,
  TINT, TBOOL, TSTR, TUnit, TList, TFun, TPair, TVar,
  typeToString, builtinEnv, prune,
} from './infer.js';

export { lex, LexError };
export { parse, ParseError };
export { infer, unify, resetVars, TypeErrorW, TINT, TBOOL, TSTR, TUnit, TList, TFun, TPair, TVar, typeToString, builtinEnv, prune };

export const VERSION = '0.1.0';

/**
 * Infer the type of a Tyl program (one or more expressions).
 * Returns { type, typeString, steps }.
 */
export function inferSource(source) {
  resetVars();
  const forms = parse(source);
  const env = builtinEnv();
  let type = null;
  let steps = [];
  for (const form of forms) {
    const r = infer(form, env);
    type = r.type;
    steps = steps.concat(r.steps);
  }
  return { type, typeString: typeToString(type), steps };
}

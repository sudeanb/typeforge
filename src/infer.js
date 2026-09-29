// TypeForge — Algorithm W with union-find types, let-polymorphism,
// precise line errors, and a recorded derivation trail for visualization.

export class TypeErrorW extends Error {
  constructor(message, line) {
    super(line ? `${message} (line ${line})` : message);
    this.line = line;
  }
}

let tvCount = 0;
export function resetVars() { tvCount = 0; }

export class TVar {
  constructor() {
    this.id = ++tvCount;
    this.instance = null;
  }
}

export const TINT = { tag: 'int' };
export const TBOOL = { tag: 'bool' };
export const TSTR = { type: 'str', tag: 'str' };
export const TUnit = { tag: 'unit' };
export const TList = (t) => ({ tag: 'list', elem: t });
export const TFun = (param, ret) => ({ tag: 'fun', param, ret });
export const TPair = (a, b) => ({ tag: 'pair', a, b });

export function prune(t) {
  while (t instanceof TVar && t.instance) t = t.instance;
  return t;
}

function occurs(v, t) {
  t = prune(t);
  if (t === v) return true;
  if (t instanceof TVar) return false;
  if (t.tag === 'list') return occurs(v, t.elem);
  if (t.tag === 'fun') return occurs(v, t.param) || occurs(v, t.ret);
  if (t.tag === 'pair') return occurs(v, t.a) || occurs(v, t.b);
  return false;
}

export function unify(a, b, steps, line) {
  a = prune(a);
  b = prune(b);
  if (a === b) { steps?.push({ kind: 'unify', text: `${typeToString(a)} ~ ${typeToString(b)} ✓ (same)` }); return; }
  if (a instanceof TVar) {
    if (occurs(a, b)) throw new TypeErrorW('infinite type detected (occurs check)', line);
    a.instance = b;
    steps?.push({ kind: 'bind', text: `${varName(a)} := ${typeToString(b)}` });
    return;
  }
  if (b instanceof TVar) return unify(b, a, steps, line);
  if (a.tag !== b.tag) {
    throw new TypeErrorW(`type mismatch: ${typeToString(a)} ≠ ${typeToString(b)}`, line);
  }
  if (a.tag === 'list') return unify(a.elem, b.elem, steps, line);
  if (a.tag === 'pair') { unify(a.a, b.a, steps, line); return unify(a.b, b.b, steps, line); }
  if (a.tag === 'fun') {
    unify(a.param, b.param, steps, line);
    return unify(a.ret, b.ret, steps, line);
  }
  // same concrete type (int/bool/str/unit)
}

// ---- pretty printing with stable 'a/'b names ----

export function typeToString(t, names = new Map(), counter = { n: 0 }) {
  t = prune(t);
  if (t instanceof TVar) {
    if (!names.has(t.id)) names.set(t.id, `'${String.fromCharCode(96 + (counter.n++ % 26) + 1)}`);
    return names.get(t.id);
  }
  switch (t.tag) {
    case 'int': return 'int';
    case 'bool': return 'bool';
    case 'str': return 'string';
    case 'unit': return 'unit';
    case 'list': return `[${typeToString(t.elem, names, counter)}]`;
    case 'pair': return `(${typeToString(t.a, names, counter)}, ${typeToString(t.b, names, counter)})`;
    case 'fun': {
      const p = typeToString(t.param, names, counter);
      const r = typeToString(t.ret, names, counter);
      return `(${p} -> ${r})`;
    }
    default: return '?';
  }
}

function varName(v) {
  return typeToString(v);
}

// ---- builtins ----

export function builtinEnv() {
  const env = new Map();
  const def = (name, type) => env.set(name, { vars: [...freeTypeVars(type)], type });
  def('+', TFun(TINT, TFun(TINT, TINT)));
  def('-', TFun(TINT, TFun(TINT, TINT)));
  def('*', TFun(TINT, TFun(TINT, TINT)));
  def('==', TFun(new TVar(), TFun(new TVar(), TBOOL))); // homogeneous equality
  def('<', TFun(TINT, TFun(TINT, TBOOL)));
  def('print', TFun(new TVar(), TUnit));
  const e = new TVar();
  def('head', TFun(TList(e), e));
  const t2 = new TVar();
  def('tail', TFun(TList(t2), TList(t2)));
  return env;
}

// ---- Algorithm W ----

function freeTypeVars(t, acc = new Set()) {
  t = prune(t);
  if (t instanceof TVar) acc.add(t);
  else if (t.tag === 'list') freeTypeVars(t.elem, acc);
  else if (t.tag === 'fun') { freeTypeVars(t.param, acc); freeTypeVars(t.ret, acc); }
  else if (t.tag === 'pair') { freeTypeVars(t.a, acc); freeTypeVars(t.b, acc); }
  return acc;
}

function generalize(t, env) {
  const envFree = new Set();
  for (const scheme of env.values()) freeTypeVars(scheme.type, envFree);
  const vars = [...freeTypeVars(t)].filter((v) => !envFree.has(v));
  return { vars, type: t };
}

function instantiate(scheme) {
  const mapping = new Map(scheme.vars.map((v) => [v, new TVar()]));
  const fresh = (t) => {
    t = prune(t);
    if (t instanceof TVar) return mapping.get(t) ?? t;
    if (t.tag === 'list') return TList(fresh(t.elem));
    if (t.tag === 'fun') return TFun(fresh(t.param), fresh(t.ret));
    if (t.tag === 'pair') return TPair(fresh(t.a), fresh(t.b));
    return t;
  };
  return fresh(scheme.type);
}

/**
 * Algorithm W. Returns { type, steps } where steps is the derivation trail.
 */
export function infer(ast, env = builtinEnv()) {
  const steps = [];
  let stepN = 0;

  const step = (kind, text) => steps.push({ n: ++stepN, kind, text });

  function inferExpr(node, env) {
    switch (node.kind) {
      case 'int': {
        step('lit', `int literal : int`);
        return TINT;
      }
      case 'str': {
        step('lit', `string literal : string`);
        return TSTR;
      }
      case 'bool': {
        step('lit', `bool literal : bool`);
        return TBOOL;
      }
      case 'nil': {
        const elem = new TVar();
        step('lit', `[] : [${typeToString(elem)}]`);
        return TList(elem);
      }
      case 'var': {
        const scheme = env.get(node.name);
        if (!scheme) throw new TypeErrorW(`undefined variable '${node.name}'`, node.line);
        const t = instantiate(scheme);
        step('var', `${node.name} : ${typeToString(t)}`);
        return t;
      }
      case 'fn': {
        const param = new TVar();
        const fnEnv = new Map(env);
        fnEnv.set(node.param, { vars: [], type: param });
        step('fn', `λ${node.param} — fresh ${varName(param)} for the parameter`);
        const bodyT = inferExpr(node.body, fnEnv);
        const result = TFun(param, bodyT);
        step('fn', `lambda : ${typeToString(result)}`);
        return result;
      }
      case 'app': {
        const fnT = inferExpr(node.fn, env);
        const argT = inferExpr(node.arg, env);
        const ret = new TVar();
        step('app', `unify ${typeToString(fnT)} with (${typeToString(argT)} -> ${typeToString(ret)})`);
        unify(fnT, TFun(argT, ret), steps, node.line);
        step('app', `application : ${typeToString(ret)}`);
        return ret;
      }
      case 'let': {
        const valueT = inferExpr(node.value, env);
        const scheme = generalize(valueT, env);
        const genEnv = new Map(env);
        genEnv.set(node.name, scheme);
        const varCount = scheme.vars.length;
        step('generalize', `let ${node.name} : ${typeToString(scheme.type)}${varCount ? `  (generalized over ${varCount} variable${varCount > 1 ? 's' : ''})` : ''}`);
        const bodyT = inferExpr(node.body, genEnv);
        step('let', `let body : ${typeToString(bodyT)}`);
        return bodyT;
      }
      case 'if': {
        const condT = inferExpr(node.cond, env);
        step('if', `condition : ${typeToString(condT)}`);
        unify(TBOOL, condT, steps, node.cond.line);
        const thenT = inferExpr(node.thenE, env);
        const elseT = inferExpr(node.elseE, env);
        unify(thenT, elseT, steps, node.line);
        step('if', `branches agree : ${typeToString(thenT)}`);
        return thenT;
      }
      case 'bin': {
        const leftT = inferExpr(node.left, env);
        const rightT = inferExpr(node.right, env);
        switch (node.op) {
          case '+': case '-': case '*': case '/': {
            unify(TINT, leftT, steps, node.left.line);
            unify(TINT, rightT, steps, node.right.line);
            step('bin', `${node.op} : int -> int -> int`);
            return TINT;
          }
          case '==': case '!=': {
            unify(leftT, rightT, steps, node.line);
            step('bin', `${node.op} : equality on ${typeToString(leftT)}`);
            return TBOOL;
          }
          case '<': case '>': {
            unify(TINT, leftT, steps, node.left.line);
            unify(TINT, rightT, steps, node.right.line);
            step('bin', `${node.op} : ints -> bool`);
            return TBOOL;
          }
          default: throw new TypeErrorW(`unknown operator '${node.op}'`, node.line);
        }
      }
      case 'cons': {
        const headT = inferExpr(node.head, env);
        const tailT = inferExpr(node.tail, env);
        unify(TList(headT), tailT, steps, node.tail.line);
        const result = TList(headT);
        step('cons', `:: : ${typeToString(result)}`);
        return result;
      }
      case 'neg': {
        const t = inferExpr(node.expr, env);
        unify(TINT, t, steps, node.expr.line);
        step('neg', `unary - : int`);
        return TINT;
      }
      default:
        throw new TypeErrorW(`cannot infer node '${node.kind}'`, node.line);
    }
  }

  try {
    const type = inferExpr(ast, env);
    return { type, steps };
  } catch (err) {
    if (err instanceof TypeErrorW) err.steps = steps;
    throw err;
  }
}

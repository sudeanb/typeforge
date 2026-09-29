# TypeForge — Algorithm W Specification

TypeForge implements **Hindley-Milner type inference** (Algorithm W) for
Tyl, a small ML-flavoured functional language, and records the full
derivation so the playground can replay it.

## 1. The language (Tyl)

```ebnf
expr = 'let' IDENT '=' expr 'in' expr
     | 'fn' IDENT '=>' expr
     | 'if' expr 'then' expr 'else' expr
     | cmp
cmp  = add ( ('=='|'!='|'<'|'>') add )?
add  = cons ( ('+'|'-') cons )*
cons = mul ( '::' cons )?            -- right-assoc
mul  = unary ( ('*'|'/') unary )*
atom = INT | STRING | true | false | IDENT | '(' expr ')' | '[' expr, … ']'
```

Builtins: `+ - * /` (int), `<` `>` (int→bool), `==` (homogeneous),
`head : [a] -> a`, `tail : [a] -> [a]`, `print : a -> unit`.

## 2. Types

```
τ = int | bool | string | unit
  | [τ]                    (list)
  | (τ -> τ)               (function)
  | τᵥ                     (type variable, union-find node)
```

- `prune(t)` follows variable indirections to the representative.
- **Unify**: walk both sides; a variable binds to the other side after an
  **occurs check** (`X = f(X)` is rejected — the substitution would be
  infinite); identical structures unify component-wise; mismatched
  constructors fail with both types printed.

## 3. Algorithm W

For each expression, against an environment mapping names to
**type schemes** (`∀ vars. type`):

| expression | rule |
|---|---|
| literal | its concrete type |
| variable | **instantiate** its scheme: fresh variables for the quantified ones |
| `fn x => e` | fresh var for `x`, infer the body, result `(τx -> τbody)` |
| `f a` | infer `f`, infer `a`, unify `τf ~ (τa -> fresh)`, result `fresh` |
| `let x = e in b` | infer `e`, **generalize** (quantify the free vars not free in the env), infer `b` against the generalized scheme |

Generalization is the heart of let-polymorphism:

```lisp
let id = fn x => x in (id 1, id true)   -- both uses type-check
```

The first use instantiates `α→α` as `int→int`; the second as `bool→bool`.
A lambda parameter would NOT generalize — `(fn id => …)` stays monomorphic.
This distinction is exactly HM.

Every unification and binding is appended to a **derivation trail**
(`{n, kind, text}`) — the playground replays it, lighting one step at a
time. Errors carry the trail too, so the failing step is visible.

## 4. Error model

| error | when |
|---|---|
| `type mismatch: int ≠ string` | constructor clash, with the source line |
| `infinite type detected (occurs check)` | `fn x => x x` |
| `undefined variable` | unbound identifier |
| parse/lex errors | with line numbers |

## 5. Honest scope notes

- **Type classes are NOT implemented.** `+` is hardcoded `int -> int ->
  int`; `==` unifies its operands without a Num/Eq constraint solver. A
  full class system needs qualified types (`Num a => a -> a -> a`) and
  constraint solving — documented as the main roadmap item.
- Builtin schemes are fully generalized; there is no value restriction
  (the language is pure, so the standard caveat does not bite).

## 6. Testing

14 tests: literal/lambda/let types, let-polymorphism (four instantiations
of one binding), composition's classic type, head/tail polymorphism,
homogeneous cons, occurs check, line-precise branch errors, undefined
variables, and derivation-trail recording. `node --test`.

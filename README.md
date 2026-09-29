# ⒯ TypeForge

**Hindley-Milner type inference (Algorithm W) for a tiny ML-flavoured
language — union-find types, let-polymorphism, occurs check, and a
replayable derivation trail. Zero dependencies.**

[![CI](https://github.com/sudeanb/typeforge/actions/workflows/ci.yml/badge.svg)](https://github.com/sudeanb/typeforge/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%E2%89%A518-green)](package.json)

▶ **[Watch Algorithm W think →](https://sudeanb.github.io/typeforge/)**
(write an expression, replay the inference step by step)

```lisp
let compose = fn f => fn g => fn x => f (g x) in compose
-- (('a -> 'b) -> (('c -> 'a) -> ('c -> 'b)))

let id = fn x => x in if id true then id 1 else 0
-- int    (let-polymorphism: two fresh instantiations)
```

## What's inside

- **Algorithm W** — union-find type variables, occurs check,
  generalize-at-let / instantiate-at-use
- **Derivation trail** — every rule application (lit/var/fn/app/let/
  generalize/unify) is recorded with a human-readable line; the
  playground replays it at adjustable speed
- **Line-precise errors** — `type mismatch: int ≠ string (line 2)`
- **Tyl language** — `let/in`, `fn =>`, `if/then/else`, lists with `::`,
  string/int/bool literals
- **Self-hosting-ish stdlib** — `head`/`tail` are generalized schemes;
  `cases/` ships inference scenarios and error cases
- **14 tests** — let-polymorphism, occurs check, homogeneous cons,
  derivation recording

## Quick start

```bash
git clone https://github.com/sudeanb/typeforge.git
cd typeforge
node --test                          # 14 tests
node bin/typeforge.js cases/compose.tyl
```

REPL equivalent in the playground: write `let id = fn x => x in id`,
press Infer, then Replay.

## Design decisions worth reading about

[docs/ALGORITHM.md](docs/ALGORITHM.md):

- the union-find `prune` loop and why unification mutates only variables
- generalize-vs-instantiate: the exact line that turns monomorphic
  let-bound names polymorphic
- why the occurs check must run BEFORE binding, not after
- the honest scope note: `+` is hardcoded `int->int->int`; a real
  typeclass system needs qualified types — documented, not pretended

## Limitations (honest list)

- no type classes / qualified types (`+` is int-only; `==` is homogeneous)
- no pattern matching or recursion (`let` is non-recursive)
- value restriction: not needed (pure language), noted for completeness

## License

[MIT](LICENSE)

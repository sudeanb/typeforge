import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { inferSource, typeToString } from '../src/index.js';

const typeOf = (src) => inferSource(src).typeString;

test('literals have concrete types', () => {
  assert.equal(typeOf('42'), 'int');
  assert.equal(typeOf('true'), 'bool');
  assert.equal(typeOf('"hi"'), 'string');
  assert.equal(typeOf('[1, 2, 3]'), '[int]');
});

test('arithmetic infers int', () => {
  assert.equal(typeOf('1 + 2 * 3'), 'int');
  assert.equal(typeOf('(1 - 2) * 3'), 'int');
});

test('lambda infers a function type', () => {
  assert.equal(typeOf('fn x => x + 1'), '(int -> int)');
  assert.equal(typeOf('fn x => fn y => x + y'), '(int -> (int -> int))');
});

test('the identity function is polymorphic', () => {
  assert.equal(typeOf('fn x => x'), "('a -> 'a)");
  assert.equal(typeOf('let id = fn x => x in id'), "('a -> 'a)");
});

test('let-polymorphism: one definition, many types', () => {
  assert.equal(typeOf('let id = fn x => x in id 5'), 'int');
  assert.equal(typeOf('let id = fn x => x in id true'), 'bool');
  assert.equal(typeOf('let id = fn x => x in id [1, 2]'), '[int]');
  // two instantiations in the same expression
  assert.equal(typeOf('let id = fn x => x in if id true then id 1 else 0'), 'int');
});

test('composition has the classic type', () => {
  assert.equal(
    typeOf('let compose = fn f => fn g => fn x => f (g x) in compose'),
    "(('a -> 'b) -> (('c -> 'a) -> ('c -> 'b)))",
  );
});

test('head/tail are polymorphic over the element type', () => {
  assert.equal(typeOf('let h = head in h'), "(['a] -> 'a)");
  assert.equal(typeOf('head [1, 2]'), 'int');
  assert.equal(typeOf('head [[1], [2]]'), '[int]');
  assert.equal(typeOf('tail [true]'), '[bool]');
});

test('application drives inference through unification', () => {
  assert.equal(typeOf('(fn x => x + 1) 5'), 'int');
  assert.equal(typeOf('(fn f => f 3) (fn x => x * 2)'), 'int');
});

test('if requires bool condition and matching branches', () => {
  assert.equal(typeOf('if 1 < 2 then 1 else 2'), 'int');
  assert.throws(() => inferSource('if 1 then 1 else 2'), /bool/);
  assert.throws(() => inferSource('if true then 1 else "x"'), /≠|mismatch/);
});

test('cons requires homogeneous lists', () => {
  assert.equal(typeOf('1 :: [2, 3]'), '[int]');
  assert.throws(() => inferSource('1 :: [true]'), /≠|mismatch/);
});

test('undefined variables throw', () => {
  assert.throws(() => inferSource('nope + 1'), /undefined variable/);
});

test('occurs check rejects infinite types', () => {
  // fn x => x x — the parameter would have to equal a function containing it
  assert.throws(() => inferSource('fn x => x x'), /infinite type|occurs/);
});

test('errors report line numbers', () => {
  try {
    inferSource('1 + 2\ntrue + 1');
    assert.fail('should throw');
  } catch (err) {
    assert.equal(err.line, 2);
  }
});

test('derivation steps are recorded', () => {
  const r = inferSource('fn x => x + 1');
  assert.ok(r.steps.length >= 3);
  assert.ok(r.steps.some((s) => s.kind === 'fn'));
  assert.ok(r.steps.some((s) => s.kind === 'bin'));
  const last = r.steps[r.steps.length - 1];
  assert.match(last.text, /int/);
});

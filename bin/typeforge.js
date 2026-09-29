#!/usr/bin/env node
// typeforge CLI — infer types for files, one expression per line is not
// required; each top-level form gets its own inference run.
import { readFileSync } from 'node:fs';
import { parse } from '../src/parser.js';
import { infer, typeToString, builtinEnv } from '../src/infer.js';

const file = process.argv[2];
if (!file) { console.error('usage: typeforge <file.tyl>'); process.exit(1); }

let forms;
try {
  forms = parse(readFileSync(file, 'utf8'));
} catch (err) { console.error(`parse error: ${err.message}`); process.exit(1); }

const env = builtinEnv();
for (const form of forms) {
  try {
    const { type, steps } = infer(form, env);
    console.log(`${typeToString(type)}   [${steps.length} derivation steps]`);
  } catch (err) {
    console.error(`type error: ${err.message}`);
    process.exit(1);
  }
}

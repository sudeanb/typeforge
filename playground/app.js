// TypeForge playground — inference + animated derivation replay.

import { inferSource } from '../src/index.js';

const EXAMPLES = {
  'identity': 'fn x => x',
  'let-polymorphism': `let id = fn x => x in if id true then id 1 else 0`,
  'composition': `let compose = fn f => fn g => fn x => f (g x) in compose`,
  'lists': 'let first = head in first [1, 2, 3]',
  'if/else': 'if 1 < 2 then 42 else 0',
  'error: branches': 'if true then 1 else "not one"',
  'error: occurs': 'fn x => x x',
};

const srcEl = document.getElementById('src');
const resultEl = document.getElementById('result');
const stepsEl = document.getElementById('steps');
const speedEl = document.getElementById('speed');

const EXAMPLE_DIVS = [];

for (const [name, src] of Object.entries(EXAMPLES)) {
  const d = document.createElement('div');
  d.style.cssText = 'padding:4px 6px;cursor:pointer;border-radius:4px;font:12.5px ui-monospace,monospace';
  d.textContent = name;
  d.addEventListener('click', () => {
    EXAMPLE_DIVS.forEach((x) => (x.style.background = ''));
    d.style.background = '#222c3c';
    srcEl.value = src;
    inferNow();
  });
  document.getElementById('examples').appendChild(d);
  EXAMPLE_DIVS.push(d);
}

let replayTimer = null;

function inferNow() {
  stopReplay();
  stepsEl.innerHTML = '';
  try {
    const r = inferSource(srcEl.value);
    resultEl.innerHTML = `: ${esc(r.typeString)}`;
    // render all steps dimmed; replay lights them up one by one
    const divs = r.steps.map((s) => {
      const d = document.createElement('div');
      d.textContent = `${s.n}. [${s.kind}] ${s.text}`;
      stepsEl.appendChild(d);
      return d;
    });
    let i = 0;
    replayTimer = setInterval(() => {
      if (i >= divs.length) { clearInterval(replayTimer); return; }
      divs[i].classList.add('current');
      if (i > 0) { divs[i - 1].classList.remove('current'); divs[i - 1].classList.add('done'); }
      divs[i].scrollIntoView({ block: 'nearest' });
      i++;
    }, Number(speedEl.value));
  } catch (err) {
    resultEl.innerHTML = `<span class="err">${esc(err.message)}</span>`;
    if (err.steps) {
      for (const s of err.steps.slice(0, 12)) {
        const d = document.createElement('div');
        d.textContent = `${s.n}. [${s.kind}] ${s.text}`;
        stepsEl.appendChild(d);
      }
      const last = document.createElement('div');
      last.className = 'err';
      last.textContent = '✗ ' + err.message;
      stepsEl.appendChild(last);
    }
  }
}

function stopReplay() {
  if (replayTimer) { clearInterval(replayTimer); replayTimer = null; }
}

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
}

document.getElementById('infer').addEventListener('click', inferNow);
document.getElementById('play').addEventListener('click', () => inferNow());
srcEl.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') inferNow();
});

srcEl.value = EXAMPLES['let-polymorphism'];
inferNow();

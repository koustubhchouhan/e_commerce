import assert from 'node:assert/strict';
import test from 'node:test';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// Architectural guard: no error may interpolate an upstream dependency's
// message into its public text. Those details belong in `{ cause }` (logged
// server-side) — see middleware/error.js. If this fails, wrap the raw error in
// `{ cause }` instead of `${someError.message}`.
const ROOT = new URL('../src', import.meta.url).pathname;

function jsFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...jsFiles(path));
    else if (entry.name.endsWith('.js')) out.push(path);
  }
  return out;
}

// From `new AppError(` up to the closing `;`, forbid `${anything.message}`.
const LEAK = /new AppError\([^;]*?\$\{[A-Za-z_][A-Za-z0-9_]*\.message\}/;

test('no AppError embeds an upstream error message', () => {
  const offenders = [];
  for (const file of jsFiles(ROOT)) {
    const source = readFileSync(file, 'utf8');
    if (LEAK.test(source)) offenders.push(file.replace(ROOT, 'src'));
  }
  assert.deepEqual(offenders, [], `Interpolate a cause instead: ${offenders.join(', ')}`);
});

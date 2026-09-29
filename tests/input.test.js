import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createInput } from '../src/engine/input.js';

const flush = () => new Promise((resolve) => setImmediate(resolve));

function clock(start = 1000) {
  const state = { t: start };
  return { state, now: () => state.t };
}

test('nextTap resolves on a tap after the guard window', async () => {
  const { state, now } = clock();
  const input = createInput({ now });
  let resolved = false;
  input.nextTap({ guardMs: 100 }).then(() => {
    resolved = true;
  });
  state.t += 150;
  input.tap();
  await flush();
  assert.equal(resolved, true);
});

test('a tap inside the guard window is an idle tap and does not resolve the prompt', async () => {
  const { state, now } = clock();
  const input = createInput({ now });
  let resolved = false;
  let idleTaps = 0;
  input.onIdleTap(() => idleTaps++);
  input.nextTap({ guardMs: 100 }).then(() => {
    resolved = true;
  });
  state.t += 50;
  input.tap();
  await flush();
  assert.equal(resolved, false);
  assert.equal(idleTaps, 1);
  state.t += 60;
  input.tap();
  await flush();
  assert.equal(resolved, true);
});

test('a tap with no prompt waiting is an idle tap', () => {
  const input = createInput({ now: () => 0 });
  let idleTaps = 0;
  input.onIdleTap(() => idleTaps++);
  input.tap();
  assert.equal(idleTaps, 1);
});

test('one tap resolves a prompt once and never the next prompt', async () => {
  const { state, now } = clock();
  const input = createInput({ now });
  const results = [];
  input.nextTap({ guardMs: 0 }).then(() => results.push('first'));
  state.t += 10;
  input.tap();
  input.nextTap({ guardMs: 0 }).then(() => results.push('second'));
  await flush();
  assert.deepEqual(results, ['first']);
});

test('cancelAll drops waiting prompts', async () => {
  const { state, now } = clock();
  const input = createInput({ now });
  let resolved = false;
  input.nextTap({ guardMs: 0 }).then(() => {
    resolved = true;
  });
  input.cancelAll();
  state.t += 10;
  input.tap();
  await flush();
  assert.equal(resolved, false);
});

test('a disabled input ignores taps entirely', () => {
  const input = createInput({ now: () => 0 });
  let idleTaps = 0;
  input.onIdleTap(() => idleTaps++);
  input.setEnabled(false);
  input.tap();
  assert.equal(idleTaps, 0);
});

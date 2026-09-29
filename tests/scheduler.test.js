import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createScheduler, EASES } from '../src/engine/scheduler.js';

const flush = () => new Promise((resolve) => setImmediate(resolve));

function track(promise) {
  const state = { done: false };
  promise.then(() => {
    state.done = true;
  });
  return state;
}

test('wait resolves once enough game time has passed', async () => {
  const scheduler = createScheduler();
  const waiting = track(scheduler.wait(100));
  scheduler.update(50);
  await flush();
  assert.equal(waiting.done, false);
  scheduler.update(50);
  await flush();
  assert.equal(waiting.done, true);
});

test('tween interpolates linearly and resolves at the end', async () => {
  const scheduler = createScheduler();
  const target = { x: 0, y: 4 };
  const tweening = track(scheduler.tween(target, { x: 10 }, 100, 'linear'));
  scheduler.update(50);
  assert.equal(target.x, 5);
  assert.equal(target.y, 4);
  scheduler.update(50);
  await flush();
  assert.equal(target.x, 10);
  assert.equal(tweening.done, true);
});

test('tween applies the named easing', () => {
  const scheduler = createScheduler();
  const target = { x: 0 };
  scheduler.tween(target, { x: 100 }, 100, 'outQuad');
  scheduler.update(50);
  assert.equal(target.x, 75);
  assert.equal(EASES.outQuad(0.5), 0.75);
});

test('tween calls onUpdate with the target', () => {
  const scheduler = createScheduler();
  const target = { v: 0 };
  const seen = [];
  scheduler.tween(target, { v: 10 }, 20, 'linear', (value) => seen.push(value.v));
  scheduler.update(10);
  scheduler.update(10);
  assert.deepEqual(seen, [5, 10]);
});

test('zero duration tween applies immediately', async () => {
  const scheduler = createScheduler();
  const target = { x: 1 };
  const tweening = track(scheduler.tween(target, { x: 9 }, 0));
  await flush();
  assert.equal(target.x, 9);
  assert.equal(tweening.done, true);
});

test('speed multiplies game time', async () => {
  const scheduler = createScheduler();
  scheduler.setSpeed(3);
  const waiting = track(scheduler.wait(90));
  assert.equal(scheduler.update(30), 90);
  await flush();
  assert.equal(waiting.done, true);
});

test('freeze stops game time for real milliseconds then carries the rest over', async () => {
  const scheduler = createScheduler();
  scheduler.freeze(40);
  const waiting = track(scheduler.wait(10));
  assert.equal(scheduler.update(30), 0);
  await flush();
  assert.equal(waiting.done, false);
  assert.equal(scheduler.update(20), 10);
  await flush();
  assert.equal(waiting.done, true);
  assert.equal(scheduler.time, 10);
});

test('slowmo scales game time for real milliseconds', () => {
  const scheduler = createScheduler();
  scheduler.slowmo(0.5, 40);
  scheduler.update(40);
  assert.equal(scheduler.time, 20);
  scheduler.update(10);
  assert.equal(scheduler.time, 30);
});

test('update clamps long frames to fifty milliseconds', () => {
  const scheduler = createScheduler();
  assert.equal(scheduler.update(1000), 50);
  assert.equal(scheduler.time, 50);
});

test('cancelAll drops pending work without resolving it', async () => {
  const scheduler = createScheduler();
  const target = { x: 0 };
  const waiting = track(scheduler.wait(10));
  const tweening = track(scheduler.tween(target, { x: 10 }, 10));
  scheduler.cancelAll();
  assert.equal(scheduler.pending(), 0);
  scheduler.update(20);
  await flush();
  assert.equal(waiting.done, false);
  assert.equal(tweening.done, false);
  assert.equal(target.x, 0);
  const later = track(scheduler.wait(10));
  scheduler.update(10);
  await flush();
  assert.equal(later.done, true);
});

test('cancelAll resets speed, freeze and slowmo', () => {
  const scheduler = createScheduler();
  scheduler.setSpeed(3);
  scheduler.freeze(100);
  scheduler.slowmo(0.2, 100);
  scheduler.cancelAll();
  assert.equal(scheduler.update(10), 10);
});

test('killTweensOf with a property only stops tweens animating that property', () => {
  const scheduler = createScheduler();
  const target = { dx: 0, flash: 1 };
  scheduler.tween(target, { dx: 10 }, 100, 'linear');
  scheduler.tween(target, { flash: 0 }, 100, 'linear');
  scheduler.killTweensOf(target, 'dx');
  scheduler.update(50);
  assert.equal(target.dx, 0);
  assert.equal(target.flash, 0.5);
});

test('killed tweens resolve so awaiting code never hangs', async () => {
  const scheduler = createScheduler();
  const target = { dx: 0 };
  const tweening = track(scheduler.tween(target, { dx: 10 }, 100, 'linear'));
  scheduler.killTweensOf(target, 'dx');
  await flush();
  assert.equal(tweening.done, true);
});

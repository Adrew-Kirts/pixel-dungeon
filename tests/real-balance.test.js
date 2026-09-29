import { test } from 'node:test';
import assert from 'node:assert/strict';
import { REAL_PROFILES, realMetrics } from './real-sim.js';

const skilled = realMetrics(REAL_PROFILES.skilled);
const decent = realMetrics(REAL_PROFILES.decent);
const random = realMetrics(REAL_PROFILES.random);

test('skilled players almost never die in the real dungeon', () => {
  assert.ok(skilled.deathRate <= 0.05, `death ${skilled.deathRate}`);
});

test('decent players die in a fifth to a third of real runs', () => {
  assert.ok(decent.deathRate >= 0.2 && decent.deathRate <= 0.35, `death ${decent.deathRate}`);
});

test('random tapping almost always dies in the real dungeon', () => {
  assert.ok(random.deathRate >= 0.95, `death ${random.deathRate}`);
});

test('a decent winning run takes about two minutes', () => {
  assert.ok(decent.medianSeconds >= 100 && decent.medianSeconds <= 130, `seconds ${decent.medianSeconds}`);
});

test('decent players score nine to fourteen thousand', () => {
  assert.ok(decent.medianScore >= 9000 && decent.medianScore <= 14000, `score ${decent.medianScore}`);
});

test('skilled players score at least fifteen thousand', () => {
  assert.ok(skilled.medianScore >= 15000, `score ${skilled.medianScore}`);
});

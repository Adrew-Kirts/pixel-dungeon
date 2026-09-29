import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PROFILES, metrics } from './sim.js';

const skilled = metrics(PROFILES.skilled);
const decent = metrics(PROFILES.decent);
const random = metrics(PROFILES.random);

test('fight takes two strikes for a decent player', () => {
  assert.equal(decent.fightMedian, 2);
});

test('fight takes at most four strikes for random tapping at p95', () => {
  assert.ok(random.fightP95 <= 4, `p95 ${random.fightP95}`);
});

test('dragon takes four to six strikes for a decent player', () => {
  assert.ok(decent.bossMedian >= 4 && decent.bossMedian <= 6, `median ${decent.bossMedian}`);
});

test('dragon takes at most nine strikes for random tapping at p95', () => {
  assert.ok(random.bossP95 <= 9, `p95 ${random.bossP95}`);
});

test('skilled players never die', () => {
  assert.equal(skilled.deathRate, 0);
});

test('decent players rarely die', () => {
  assert.ok(decent.deathRate <= 0.03, `death ${decent.deathRate}`);
});

test('random tapping dies ten to twenty percent of the time', () => {
  assert.ok(random.deathRate >= 0.1 && random.deathRate <= 0.2, `death ${random.deathRate}`);
});

test('decent victories feel like a close call', () => {
  assert.ok(decent.hpMedian >= 0.2 && decent.hpMedian <= 0.55, `hp ${decent.hpMedian}`);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deepMetrics, DEEP_PROFILES } from './deep-sim.js';

const RUNS = 200;
const skilled = deepMetrics(DEEP_PROFILES.skilled, RUNS);
const good = deepMetrics(DEEP_PROFILES.good, RUNS);
const decent = deepMetrics(DEEP_PROFILES.decent, RUNS);
const random = deepMetrics(DEEP_PROFILES.random, RUNS);
const cautious = deepMetrics(DEEP_PROFILES.good, RUNS, { horde: false });

test('skilled players almost always clear the deep dungeon', () => {
  assert.ok(skilled.deathRate <= 0.05, `death ${skilled.deathRate}`);
});

test('good players often win but the final boss is a real threat; skipping the horde is risky', () => {
  assert.ok(good.deathRate >= 0.15 && good.deathRate <= 0.45, `death ${good.deathRate}`);
  assert.ok(cautious.deathRate >= 0.4 && cautious.deathRate <= 0.95, `death ${cautious.deathRate}`);
});

test('skilled players still lose a good share of their health', () => {
  assert.ok(skilled.hpLeft <= 0.75, `hp ${skilled.hpLeft}`);
});

test('decent players die more often than not', () => {
  assert.ok(decent.deathRate >= 0.5, `death ${decent.deathRate}`);
});

test('random tapping never clears it', () => {
  assert.equal(random.deathRate, 1);
});

test('a winning run lasts three to seven minutes of game time', () => {
  for (const metrics of [skilled, good]) assert.ok(metrics.medianSeconds >= 180 && metrics.medianSeconds <= 420, `seconds ${metrics.medianSeconds}`);
});

test('skill shows in the score', () => {
  assert.ok(skilled.winScore > good.winScore, `${skilled.winScore} vs ${good.winScore}`);
});

const hardSkilled = deepMetrics(DEEP_PROFILES.skilled, 120, { difficulty: 'hard' });
const hardGood = deepMetrics(DEEP_PROFILES.good, 120, { difficulty: 'hard' });
const tryhardSkilled = deepMetrics(DEEP_PROFILES.skilled, 120, { difficulty: 'tryhard' });
const tryhardExpert = deepMetrics(DEEP_PROFILES.expert, 120, { difficulty: 'tryhard' });

test('difficult kills skilled players now and then and breaks their weapon', () => {
  assert.ok(hardSkilled.deathRate >= 0.1 && hardSkilled.deathRate <= 0.45, `death ${hardSkilled.deathRate}`);
  assert.ok(hardSkilled.weaponBreakRate >= 0.6, `breaks ${hardSkilled.weaponBreakRate}`);
  assert.ok(hardGood.deathRate > good.deathRate, `death ${hardGood.deathRate}`);
});

test('try hard is a wall for skilled players and only clean timing gets through, always on a broken weapon', () => {
  assert.ok(tryhardSkilled.deathRate >= 0.85, `skilled death ${tryhardSkilled.deathRate}`);
  assert.ok(tryhardExpert.deathRate <= 0.45, `expert death ${tryhardExpert.deathRate}`);
  assert.ok(tryhardExpert.weaponBreakRate >= 0.95, `breaks ${tryhardExpert.weaponBreakRate}`);
});

test('a win on a higher difficulty is worth more', () => {
  assert.ok(hardSkilled.winScore > skilled.winScore && tryhardExpert.winScore > hardSkilled.winScore, `${skilled.winScore} ${hardSkilled.winScore} ${tryhardExpert.winScore}`);
});

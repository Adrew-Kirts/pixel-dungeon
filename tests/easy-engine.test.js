import { test } from 'node:test';
import assert from 'node:assert/strict';
import { positionAt, zoneForMs, msForPosition } from '../src/meter.js';
import { zoneAt, createRng, rollHero, rollMonster, rollDragon, meterFor } from '../src/rules.js';
import { createEasyRun, easyStrike, easyCounter, easyChest, replayEasy, ReplayError } from '../src/easy/engine.js';

test('positionAt is a triangle wave starting at zero', () => {
  assert.equal(positionAt(0, 1000), 0);
  assert.equal(positionAt(500, 1000), 0.5);
  assert.equal(positionAt(1000, 1000), 1);
  assert.equal(positionAt(1500, 1000), 0.5);
  assert.equal(positionAt(2000, 1000), 0);
});

test('zoneForMs with no offset matches zoneAt on the same position', () => {
  const meter = { sweepMs: 900, zones: { crit: 0.1, hit: 0.55 }, offset: 0 };
  for (let ms = 0; ms < 2000; ms += 37) {
    assert.equal(zoneForMs(ms, meter), zoneAt(positionAt(ms, 900), meter.zones));
  }
});

test('zoneForMs shifts the zones by the offset', () => {
  const meter = { sweepMs: 1000, zones: { crit: 0.1, hit: 0.55 }, offset: 0.1 };
  assert.equal(zoneForMs(600, meter), 'crit');
  assert.equal(zoneForMs(500, meter), 'hit');
});

test('msForPosition lands on the requested position on the rising sweep', () => {
  assert.ok(Math.abs(positionAt(msForPosition(0.37, 800), 800) - 0.37) < 1e-12);
});

test('createEasyRun rolls hero, monster and dragon in the original order', () => {
  const rng = createRng(1234);
  const hero = rollHero(rng);
  const monster = rollMonster(rng, hero);
  const dragon = rollDragon(rng, hero);
  const run = createEasyRun(1234);
  assert.deepEqual(run.hero, hero);
  assert.deepEqual(run.monster, monster);
  assert.equal(run.dragon.name, dragon.name);
  assert.equal(run.dragon.maxHp, dragon.maxHp);
});

test('easyStrike logs the rounded tap time and counts strikes and crits', () => {
  const run = createEasyRun(7);
  const meter = meterFor(run.monster);
  const { zone } = easyStrike(run, run.monster, msForPosition(0.5, meter.sweepMs) + 0.4);
  assert.equal(zone, 'crit');
  assert.equal(run.strikes.length, 1);
  assert.equal(Number.isInteger(run.strikes[0]), true);
  assert.equal(run.stats.strikes, 1);
  assert.equal(run.stats.crits, 1);
});

function playLikeTheScenes(seed, strikes) {
  const run = createEasyRun(seed);
  let index = 0;
  const battle = (foe) => {
    for (;;) {
      if (index >= strikes.length) return 'incomplete';
      const { result } = easyStrike(run, foe, strikes[index++]);
      if (result.killed === true) return 'won';
      if (easyCounter(run, foe).killed === true) return 'lost';
    }
  };
  const first = battle(run.monster);
  if (first !== 'won') return { outcome: first, run };
  easyChest(run);
  return { outcome: battle(run.dragon), run };
}

function strikesFor(seed, count) {
  const rng = createRng(seed * 31);
  const list = [];
  for (let index = 0; index < count; index++) list.push(Math.round(rng.range(0, 1800)));
  return list;
}

test('replayEasy reproduces a run played in scene order', () => {
  for (let seed = 1; seed <= 300; seed++) {
    const played = playLikeTheScenes(seed, strikesFor(seed, 40));
    const used = played.run.strikes;
    const replay = replayEasy(seed, used);
    assert.equal(replay.outcome, played.outcome);
    assert.deepEqual(replay.hero, played.run.hero);
  }
});

test('replayEasy reports an unfinished run when strikes run out', () => {
  const replay = replayEasy(5, [10]);
  assert.equal(replay.won, false);
});

test('replayEasy rejects strikes after the run is over', () => {
  const played = playLikeTheScenes(9, strikesFor(9, 40));
  assert.throws(() => replayEasy(9, [...played.run.strikes, 400]), ReplayError);
});

test('replayEasy rejects invalid tap times', () => {
  for (const bad of [Number.NaN, -1, 600001, '12', null]) {
    assert.throws(() => replayEasy(3, [bad]), ReplayError);
  }
});

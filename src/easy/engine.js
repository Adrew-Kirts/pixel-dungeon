import { createRng, rollHero, rollMonster, rollDragon, rollChest, applyLoot, mimicBite, heroStrike, foeCounter, meterFor } from '../rules.js';
import { zoneForMs, isValidTapMs } from '../meter.js';

export class ReplayError extends Error {}

export function createEasyRun(seed) {
  const rng = createRng(seed);
  const hero = rollHero(rng);
  const monster = rollMonster(rng, hero);
  const dragon = rollDragon(rng, hero);
  return {
    seed,
    rng,
    hero,
    monster,
    dragon,
    loot: null,
    mimicDamage: 0,
    dragonMoves: 0,
    stats: { strikes: 0, crits: 0, streak: 0, startedAt: 0, endedAt: 0 },
    strikes: [],
  };
}

export function easyMeter(foe) {
  return { ...meterFor(foe), offset: 0 };
}

export function easyStrike(run, foe, ms) {
  if (isValidTapMs(ms) === false) throw new ReplayError('invalid tap time');
  const rounded = Math.round(ms);
  const zone = zoneForMs(rounded, easyMeter(foe));
  run.strikes.push(rounded);
  run.stats.strikes += 1;
  if (zone === 'crit') run.stats.crits += 1;
  return { zone, ms: rounded, result: heroStrike(run.hero, foe, zone) };
}

export function easyCounter(run, foe) {
  return foeCounter(run.rng, foe, run.hero);
}

export function easyChest(run) {
  const loot = rollChest(run.rng, run.hero);
  run.loot = loot;
  run.mimicDamage = loot.mimic === true ? mimicBite(run.hero) : 0;
  applyLoot(run.hero, loot);
  return loot;
}

export function replayEasy(seed, strikesMs) {
  if (Array.isArray(strikesMs) === false) throw new ReplayError('strikes must be a list');
  const run = createEasyRun(seed);
  let index = 0;
  const battle = (foe) => {
    for (;;) {
      if (index >= strikesMs.length) return 'incomplete';
      const { result } = easyStrike(run, foe, strikesMs[index]);
      index += 1;
      if (result.killed === true) return 'won';
      if (easyCounter(run, foe).killed === true) return 'lost';
    }
  };
  let outcome = battle(run.monster);
  if (outcome === 'won') {
    easyChest(run);
    outcome = battle(run.dragon);
  }
  if (index < strikesMs.length) throw new ReplayError('strikes after the run ended');
  return { won: outcome === 'won', outcome, hero: run.hero, run };
}

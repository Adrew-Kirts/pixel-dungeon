import {
  createRng,
  rollHero,
  rollMonster,
  rollChest,
  applyLoot,
  mimicBite,
  rollDragon,
  heroStrike,
  foeCounter,
  zoneAt,
  meterFor,
} from '../src/rules.js';

export const PROFILES = {
  skilled: { crit: 0.4, hit: 0.6 },
  decent: { crit: 0.15, hit: 0.65 },
  random: null,
};

function pickZone(rng, profile, foe) {
  if (profile === null) return zoneAt(rng.next(), meterFor(foe).zones);
  const roll = rng.next();
  if (roll < profile.crit) return 'crit';
  if (roll < profile.crit + profile.hit) return 'hit';
  return 'glance';
}

function battle(rng, hero, foe, profile) {
  let strikes = 0;
  for (;;) {
    strikes++;
    if (heroStrike(hero, foe, pickZone(rng, profile, foe)).killed === true) return { won: true, strikes };
    if (foeCounter(rng, foe, hero).killed === true) return { won: false, strikes };
  }
}

export function simulateRun(seed, profile) {
  const rng = createRng(seed);
  const hero = rollHero(rng);
  const fight = battle(rng, hero, rollMonster(rng, hero), profile);
  if (fight.won === false) return { won: false, stage: 'fight', fightStrikes: fight.strikes, bossStrikes: 0, hpRatio: 0 };
  const loot = rollChest(rng, hero);
  if (loot.mimic === true) mimicBite(hero);
  applyLoot(hero, loot);
  const boss = battle(rng, hero, rollDragon(rng, hero), profile);
  return {
    won: boss.won,
    stage: boss.won === true ? 'victory' : 'boss',
    fightStrikes: fight.strikes,
    bossStrikes: boss.strikes,
    hpRatio: hero.hp / hero.maxHp,
  };
}

export function quantile(values, q) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
}

export function metrics(profile, runs = 10000) {
  const results = [];
  for (let seed = 1; seed <= runs; seed++) results.push(simulateRun(seed * 7919, profile));
  const wins = results.filter((result) => result.won === true);
  return {
    deathRate: 1 - wins.length / runs,
    fightMedian: quantile(results.map((result) => result.fightStrikes), 0.5),
    fightP95: quantile(results.map((result) => result.fightStrikes), 0.95),
    bossMedian: quantile(wins.map((result) => result.bossStrikes), 0.5),
    bossP95: quantile(results.filter((result) => result.stage !== 'fight').map((result) => result.bossStrikes), 0.95),
    hpMedian: quantile(wins.map((result) => result.hpRatio), 0.5),
  };
}

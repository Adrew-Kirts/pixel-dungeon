import { createDeepRun, expected, apply, finalScore } from '../src/deep/engine.js';
import { createRng } from '../src/rules.js';
import { msForPosition } from '../src/meter.js';
import { FULL_ROUTE, routeNav, isBetter } from './deep-helpers.js';

export const DEEP_PROFILES = {
  expert: { strike: 20, react: 26, horde: 28, lapse: 0.02 },
  skilled: { strike: 30, react: 38, horde: 40, lapse: 0.03 },
  good: { strike: 50, react: 60, horde: 60, lapse: 0.07 },
  decent: { strike: 85, react: 95, horde: 95, lapse: 0.12 },
  random: null,
};

function normal(rng, deviation) {
  const u = Math.max(1e-9, rng.next());
  const v = rng.next();
  return deviation * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function strikeMs(rng, profile, meter) {
  if (profile === null) return Math.round(rng.range(0, 2 * meter.sweepMs));
  const center = msForPosition(0.5 + meter.offset, meter.sweepMs);
  const second = rng.chance(0.3) === true ? 2 * meter.sweepMs - center : center;
  const lapse = rng.chance(profile.lapse) === true ? (rng.chance(0.5) === true ? 1 : -1) * rng.range(160, 320) : 0;
  return Math.max(0, Math.round(second + normal(rng, profile.strike) + lapse));
}

function reactTaps(rng, deviation, beats, lapse = 0) {
  if (deviation === null) {
    const taps = [];
    for (let at = rng.range(0, 400); at < beats[beats.length - 1] + 300; at += rng.range(150, 700)) taps.push(Math.round(at));
    return taps;
  }
  return beats.map((beat) => Math.max(0, Math.round(beat + normal(rng, deviation) + (rng.chance(lapse) === true ? (rng.chance(0.5) === true ? 1 : -1) * rng.range(170, 320) : 0)))).filter(() => rng.chance(0.02) === false);
}

export function simulateDeepRun(seed, profile, { cls = 'knight', weapon = 'sword', shield = 'kite', route = FULL_ROUTE, horde = true, difficulty = 'normal' } = {}) {
  const state = createDeepRun({ seed });
  const rng = createRng((seed * 2654435761) >>> 0);
  const baseNav = routeNav(horde === true ? route : route.filter((node, index) => node !== 'c1' && !(node === 'h3' && route[index - 1] === 'c1')));
  apply(state, { type: 'create', difficulty, cls, weapon, shield, first: 0, epithet: 0 });
  let weaponBreaks = 0;
  for (let step = 0; step < 4000; step++) {
    const need = expected(state);
    if (need.type === 'done') break;
    let input;
    if (need.type === 'strike') input = { type: 'strike', ms: strikeMs(rng, profile, need.meter) };
    else if (need.type === 'defend') input = { type: 'defend', taps: reactTaps(rng, profile === null ? null : profile.react, need.attack.beats, profile?.lapse) };
    else if (need.type === 'dodge') input = { type: 'dodge', taps: reactTaps(rng, profile === null ? null : profile.react, need.beats, profile?.lapse) };
    else if (need.type === 'horde') input = { type: 'horde', taps: reactTaps(rng, profile === null ? null : profile.horde, need.beats, profile?.lapse).slice(0, 64) };
    else if (need.type === 'potion') input = { type: 'potion', choice: need.options.includes('large') === true ? 'large' : need.options[0] };
    else if (need.type === 'loot') input = { type: 'loot', choice: need.canTake === true && isBetter(state, need.item) === true ? 'take' : 'leave' };
    else if (need.type === 'nav') {
      const drink = need.options.find((option) => option.action === 'drink');
      if (drink !== undefined && state.hero.hp <= state.hero.maxHp * 0.5) input = { type: 'nav', action: 'drink', potion: need.options.some((option) => option.potion === 'large') === true ? 'large' : drink.potion };
      else input = baseNav(need, state);
    }
    for (const event of apply(state, input)) if (event.type === 'break' && event.slot === 'weapon') weaponBreaks += 1;
  }
  const score = finalScore(state);
  return { won: state.outcome === 'victory', score: score.total, seconds: score.seconds, node: state.node, killer: state.killer, hp: state.hero.hp / state.hero.maxHp, weaponBreaks };
}

export function quantile(values, q) {
  if (values.length === 0) return Number.NaN;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
}

export function deepMetrics(profile, runs = 600, options = {}) {
  const results = [];
  for (let seed = 1; seed <= runs; seed++) results.push(simulateDeepRun(seed * 7919, profile, options));
  const wins = results.filter((result) => result.won === true);
  const deaths = {};
  for (const result of results) if (result.won === false) deaths[`${result.node}:${result.killer}`] = (deaths[`${result.node}:${result.killer}`] ?? 0) + 1;
  return {
    deathRate: 1 - wins.length / runs,
    medianSeconds: quantile(wins.map((result) => result.seconds), 0.5),
    medianScore: quantile(results.map((result) => result.score), 0.5),
    winScore: quantile(wins.map((result) => result.score), 0.5),
    hpLeft: quantile(wins.map((result) => result.hp), 0.5),
    weaponBreakRate: results.filter((result) => result.weaponBreaks > 0).length / runs,
    deaths,
  };
}

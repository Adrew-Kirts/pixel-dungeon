import { createRealRun, expected, apply, finalScore, ringAt } from '../src/real/engine.js';
import { createRng } from '../src/rules.js';
import { msForPosition } from '../src/meter.js';

export const REAL_PROFILES = {
  skilled: { zones: { crit: 0.4, hit: 0.6 }, dodge: [200, 60], aim: { bullseye: 0.5, close: 0.4 }, answers: 1, answerMs: 2500 },
  decent: { zones: { crit: 0.15, hit: 0.65 }, dodge: [320, 110], aim: { bullseye: 0.2, close: 0.5 }, answers: 0.7, answerMs: 3500 },
  random: { zones: null, dodge: null, aim: null, answers: 0.25, answerMs: 6000 },
};

function normal(rng, mean, deviation) {
  const u = Math.max(1e-9, rng.next());
  const v = rng.next();
  return mean + deviation * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function strikeInput(rng, profile, meter) {
  const sweep = meter.sweepMs;
  if (profile.zones === null) return Math.round(rng.range(0, 2 * sweep));
  const center = 0.5 + meter.offset;
  const critHalf = meter.zones.crit / 2;
  const greenHalf = (meter.zones.crit + meter.zones.hit) / 2;
  const roll = rng.next();
  let position;
  if (roll < profile.zones.crit) position = center + rng.range(-critHalf * 0.9, critHalf * 0.9);
  else if (roll < profile.zones.crit + profile.zones.hit) position = center + (rng.chance(0.5) === true ? 1 : -1) * rng.range(critHalf * 1.1, greenHalf * 0.95);
  else position = center + (rng.chance(0.5) === true ? 1 : -1) * rng.range(greenHalf * 1.05, 0.5);
  position = Math.max(0.001, Math.min(0.999, position));
  const secondPass = rng.chance(0.35);
  return Math.round(secondPass === true ? msForPosition(2 - position, sweep) : msForPosition(position, sweep));
}

function aimInput(rng, profile, aim) {
  if (profile.aim === null) return Math.round(rng.range(0, aim.timeoutMs));
  const roll = rng.next();
  const wanted = roll < profile.aim.bullseye ? ['bullseye', 'close', 'head'] : roll < profile.aim.bullseye + profile.aim.close ? ['close', 'head'] : ['head', 'miss'];
  for (const ring of wanted) {
    const matches = [];
    for (let ms = 0; ms <= aim.timeoutMs; ms += 5) if (ringAt(aim, ms) === ring) matches.push(ms);
    if (matches.length > 0) return matches[Math.floor(rng.next() * matches.length)];
  }
  return null;
}

function answerInput(rng, profile, question) {
  const ms = Math.round(Math.max(600, normal(rng, profile.answerMs, 900)));
  if (question.id === 'hire') return { type: 'answer', choice: profile.zones === null && rng.chance(0.5) === true ? 'no' : 'yes', ms };
  if (question.answer === '*' || rng.chance(profile.answers) === true) {
    return { type: 'answer', choice: question.answer === '*' ? question.choices[0].id : question.answer, ms };
  }
  const wrong = question.choices.filter((choice) => choice.id !== question.answer);
  return { type: 'answer', choice: wrong[Math.floor(rng.next() * wrong.length)].id, ms };
}

export function simulateRealRun(seed, profile) {
  const state = createRealRun({ seed, easyHero: null });
  const rng = createRng((seed * 2654435761) >>> 0);
  for (let step = 0; step < 800; step++) {
    const need = expected(state);
    if (need.type === 'done') break;
    let input;
    if (need.type === 'strike') input = { type: 'strike', ms: strikeInput(rng, profile, need.meter) };
    else if (need.type === 'dodge') input = { type: 'dodge', ms: profile.dodge === null ? Math.round(rng.range(-300, 900)) : Math.round(normal(rng, profile.dodge[0], profile.dodge[1])) };
    else if (need.type === 'aim') input = { type: 'aim', ms: aimInput(rng, profile, need) };
    else if (need.type === 'answer') input = answerInput(rng, profile, need.question);
    else if (need.type === 'potion') input = { type: 'potion', choice: need.options.includes('double') === true ? 'double' : 'drink' };
    else input = { type: need.type };
    if (input.type === 'dodge' && input.ms !== null && input.ms < -need.arrow.waitMs) input.ms = -need.arrow.waitMs;
    apply(state, input);
  }
  const score = finalScore(state);
  return { won: state.outcome === 'victory', score: score.total, seconds: score.seconds, stage: state.room.kind };
}

export function quantile(values, q) {
  if (values.length === 0) return Number.NaN;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
}

export function realMetrics(profile, runs = 3000) {
  const results = [];
  for (let seed = 1; seed <= runs; seed++) results.push(simulateRealRun(seed * 104729, profile));
  const wins = results.filter((result) => result.won === true);
  return {
    deathRate: 1 - wins.length / runs,
    medianSeconds: quantile(wins.map((result) => result.seconds), 0.5),
    medianScore: quantile(results.map((result) => result.score), 0.5),
    p90Score: quantile(results.map((result) => result.score), 0.9),
    deathStages: results.filter((result) => result.won === false).reduce((map, result) => ({ ...map, [result.stage]: (map[result.stage] ?? 0) + 1 }), {}),
  };
}

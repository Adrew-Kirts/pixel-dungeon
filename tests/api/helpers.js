import { createRealRun, expected, apply, finalScore, ringAt } from '../../src/real/engine.js';
import { createEasyRun, easyStrike, easyCounter, easyChest } from '../../src/easy/engine.js';
import { msForPosition } from '../../src/meter.js';
import { meterFor } from '../../src/rules.js';
import { createRng } from '../../src/rules.js';

export function jitteredPolicy(seed, { perfectRatio = 0.6, jitterMs = 25 } = {}) {
  const rng = createRng(seed);
  const gauss = () => {
    const u = Math.max(1e-9, rng.next());
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng.next());
  };
  return {
    strike: (need) => {
      const { meter } = need;
      const center = msForPosition(0.5 + meter.offset, meter.sweepMs);
      const aimFor = rng.next() < perfectRatio ? center : center + meter.sweepMs * 0.18;
      return { type: 'strike', ms: Math.max(0, Math.round(aimFor + gauss() * jitterMs)) };
    },
    potion: (need) => ({ type: 'potion', choice: need.options.includes('double') ? 'double' : 'drink' }),
    answer: (need) => ({ type: 'answer', choice: need.question.answer === '*' ? need.question.choices[0].id : need.question.answer, ms: 1500 + Math.round(rng.next() * 1500) }),
    dodge: () => ({ type: 'dodge', ms: Math.round(180 + rng.next() * 120) }),
    aim: (need) => {
      for (let ms = 0; ms <= need.timeoutMs; ms++) if (ringAt(need, ms) === 'bullseye') return { type: 'aim', ms };
      return { type: 'aim', ms: null };
    },
    chest: () => ({ type: 'chest' }),
    hero: () => ({ type: 'hero', choice: 'continue' }),
  };
}

export function perfectBotPolicy() {
  return {
    strike: (need) => ({ type: 'strike', ms: Math.round(msForPosition(0.5 + need.meter.offset, need.meter.sweepMs)) }),
    potion: (need) => ({ type: 'potion', choice: need.options.includes('double') ? 'double' : 'drink' }),
    answer: (need) => ({ type: 'answer', choice: need.question.answer === '*' ? need.question.choices[0].id : need.question.answer, ms: 400 }),
    dodge: () => ({ type: 'dodge', ms: 150 }),
    aim: (need) => {
      for (let ms = 0; ms <= need.timeoutMs; ms++) if (ringAt(need, ms) === 'bullseye') return { type: 'aim', ms };
      return { type: 'aim', ms: null };
    },
    chest: () => ({ type: 'chest' }),
    hero: () => ({ type: 'hero', choice: 'continue' }),
  };
}

export function playReal(seed, policy, easyHero = null) {
  const state = createRealRun({ seed, easyHero });
  const inputs = [];
  for (let step = 0; step < 800; step++) {
    const need = expected(state);
    if (need.type === 'done') break;
    const input = policy[need.type](need, state);
    inputs.push(input);
    apply(state, input);
  }
  return { state, inputs, score: finalScore(state) };
}

export function playEasy(seed) {
  const run = createEasyRun(seed);
  const tapFor = (foe) => Math.round(msForPosition(0.5, meterFor(foe).sweepMs));
  const battle = (foe) => {
    for (;;) {
      const { result } = easyStrike(run, foe, tapFor(foe));
      if (result.killed === true) return 'won';
      if (easyCounter(run, foe).killed === true) return 'lost';
    }
  };
  let outcome = battle(run.monster);
  if (outcome === 'won') {
    easyChest(run);
    outcome = battle(run.dragon);
  }
  return { run, outcome, strikes: run.strikes };
}

export function nearPerfectHumanPolicy(seed, { strikeSpreadMs = 12, dodgeSpreadMs = 30 } = {}) {
  const rng = createRng(seed);
  const gauss = () => {
    const u = Math.max(1e-9, rng.next());
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng.next());
  };
  const base = jitteredPolicy(seed);
  return {
    ...base,
    strike: (need) => ({ type: 'strike', ms: Math.max(0, Math.round(msForPosition(0.5 + need.meter.offset, need.meter.sweepMs) + gauss() * strikeSpreadMs)) }),
    dodge: () => ({ type: 'dodge', ms: Math.min(440, Math.max(0, Math.round(200 + gauss() * dodgeSpreadMs))) }),
  };
}

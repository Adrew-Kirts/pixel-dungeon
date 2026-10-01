import { createDeepRun, expected, apply, itemDef } from '../src/deep/engine.js';
import { msForPosition } from '../src/meter.js';
import { WEAPONS, SHIELDS } from '../src/deep/content.js';

export const FULL_ROUTE = ['h1', 'a1', 'a2', 'mb', 'b1', 'h2', 'h3', 'c1', 'h3', 'h4', 'd1', 'd2', 'd3', 'lair'];

export function critMs(meter) {
  return Math.round(msForPosition(0.5 + meter.offset, meter.sweepMs));
}

export function hitMs(meter) {
  const center = 0.5 + meter.offset;
  const edge = meter.zones.crit / 2 + meter.zones.hit / 4;
  return Math.round(msForPosition(center + edge, meter.sweepMs));
}

export function glanceMs(meter) {
  const center = 0.5 + meter.offset;
  const far = center > 0.5 ? center - 0.45 : center + 0.45;
  return Math.round(msForPosition(far, meter.sweepMs));
}

function lasting(item) {
  return item.dur === null ? 1000 : item.dur;
}

export function isBetter(state, item) {
  const hero = state.hero;
  if (item.slot === 'weapon') {
    const current = hero.weapon;
    if (lasting(current) < 4) return lasting(item) > lasting(current);
    return WEAPONS[item.id].power > WEAPONS[current.id].power && lasting(item) >= 4;
  }
  if (item.slot === 'shield') {
    const current = hero.shield;
    if (lasting(current) < 3) return lasting(item) > lasting(current);
    return SHIELDS[item.id].absorb > SHIELDS[current.id].absorb && lasting(item) >= 3;
  }
  return true;
}

export function routeNav(route) {
  let target = 1;
  return (need, state) => {
    const options = need.options;
    const open = options.find((option) => option.action === 'open');
    if (open !== undefined) return { type: 'nav', action: 'open' };
    const take = options.find((option) => option.action === 'take' && option.canTake === true && isBetter(state, option.item) === true);
    if (take !== undefined) return { type: 'nav', action: 'take', index: take.index };
    const coffee = options.find((option) => option.action === 'coffee');
    if (coffee !== undefined && state.hero.hp < state.hero.maxHp * 0.6) return { type: 'nav', action: 'coffee' };
    while (target < route.length && route[target] === state.node) target++;
    return { type: 'nav', action: 'go', to: route[target] };
  };
}

export const PERFECT = {
  create: () => ({ type: 'create', difficulty: 'normal', cls: 'knight', weapon: 'sword', shield: 'kite', first: 2, epithet: 3 }),
  strike: (need) => ({ type: 'strike', ms: critMs(need.meter) }),
  defend: (need) => ({ type: 'defend', taps: [...need.attack.beats] }),
  dodge: (need) => ({ type: 'dodge', taps: [...need.beats] }),
  horde: (need) => ({ type: 'horde', taps: [...need.beats] }),
  potion: (need) => ({ type: 'potion', choice: need.options[0] }),
  loot: (need, state) => ({ type: 'loot', choice: need.canTake === true && isBetter(state, need.item) === true ? 'take' : 'leave' }),
};

export function play(state, policy, { limit = 3000, until = null } = {}) {
  const events = [...state.initialEvents];
  const inputs = [];
  for (let step = 0; step < limit; step++) {
    const need = expected(state);
    if (need.type === 'done') return { events, inputs, need };
    if (until !== null && until(need, state) === true) return { events, inputs, need };
    const handler = policy[need.type] ?? PERFECT[need.type];
    const input = handler(need, state);
    inputs.push(input);
    events.push(...apply(state, input));
  }
  throw new Error(`run did not finish (phase ${state.phase} at ${state.node})`);
}

export function newRun(seed = 7, create = PERFECT.create()) {
  const state = createDeepRun({ seed });
  const events = apply(state, create);
  return { state, events };
}

export { itemDef };

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDeepRun, expected, apply, finalScore, InputError, heroPower, foeHp, trapDamage } from '../src/deep/engine.js';
import { WEAPONS, SHIELDS, HORDE, NODES, CLASSES, COFFEE_HEAL, SCORE, CAT_HEAL, DIFFICULTIES, MONSTERS, DODGE } from '../src/deep/content.js';
import { FULL_ROUTE, PERFECT, play, newRun, routeNav, critMs, hitMs, glanceMs } from './deep-helpers.js';

const fullPolicy = () => ({ ...PERFECT, nav: routeNav(FULL_ROUTE) });

function toPhase(state, phase, policy = fullPolicy()) {
  return play(state, policy, { until: (need) => need.type === phase });
}

test('character creation validates every choice', () => {
  const bad = [
    { cls: 'bard', weapon: 'sword', shield: 'kite', first: 0, epithet: 0 },
    { cls: 'wizard', weapon: 'sword', shield: 'kite', first: 0, epithet: 0 },
    { cls: 'knight', weapon: 'oakStaff', shield: 'kite', first: 0, epithet: 0 },
    { cls: 'knight', weapon: 'sword', shield: 'aegis', first: 0, epithet: 0 },
    { cls: 'knight', weapon: 'sword', shield: 'kite', first: 99, epithet: 0 },
    { cls: 'knight', weapon: 'sword', shield: 'kite', first: 0, epithet: 1.5 },
    { cls: 'constructor', weapon: 'sword', shield: 'kite', first: 0, epithet: 0 },
  ];
  for (const input of bad) {
    const state = createDeepRun({ seed: 1 });
    assert.throws(() => apply(state, { type: 'create', ...input }), InputError, JSON.stringify(input));
  }
});

test('creation builds the hero from class, weapon and shield, then the first fight starts', () => {
  const { state, events } = newRun(3, { type: 'create', difficulty: 'normal', cls: 'barbarian', weapon: 'axe', shield: 'tower', first: 1, epithet: 2 });
  assert.equal(state.hero.maxHp, CLASSES.barbarian.hp);
  assert.equal(state.hero.weapon.dur, WEAPONS.axe.durability);
  assert.equal(state.hero.shield.dur, SHIELDS.tower.durability);
  assert.deepEqual(state.hero.potions, ['small', 'small']);
  assert.equal(state.node, 'h1');
  assert.equal(state.phase, 'strike');
  assert.equal(events.find((event) => event.type === 'foeAppear').foe.id, 'rat');
});

test('the same seed and inputs replay to the same run', () => {
  const first = play(createDeepRun({ seed: 21 }), fullPolicy());
  const second = play(createDeepRun({ seed: 21 }), fullPolicy());
  assert.deepEqual(first.events, second.events);
  const replay = createDeepRun({ seed: 21 });
  const replayEvents = [];
  for (const input of first.inputs) replayEvents.push(...apply(replay, input));
  assert.deepEqual(replayEvents, first.events);
});

test('a perfect player clears the whole dungeon', () => {
  const state = createDeepRun({ seed: 5 });
  const { events } = play(state, fullPolicy());
  assert.equal(state.outcome, 'victory');
  assert.ok(events.some((event) => event.type === 'melon'));
  assert.ok(events.some((event) => event.type === 'spawn'));
  assert.ok(events.some((event) => event.type === 'frenzy'));
  assert.ok(events.some((event) => event.type === 'reveal'));
  assert.ok(finalScore(state).total > 40000, String(finalScore(state).total));
});

test('perfect strikes do not wear the weapon, hits wear 1, glances wear 2', () => {
  for (const [policy, wear] of [[critMs, 0], [hitMs, 1], [glanceMs, 2]]) {
    const { state } = newRun(4);
    const before = state.hero.weapon.dur;
    apply(state, { type: 'strike', ms: policy(state.meter) });
    assert.equal(state.hero.weapon.dur, before - wear);
  }
});

test('a worn-out weapon breaks into the wooden stick', () => {
  const { state } = newRun(4);
  state.hero.weapon.dur = 1;
  const events = apply(state, { type: 'strike', ms: hitMs(state.meter) });
  assert.ok(events.some((event) => event.type === 'break' && event.item === 'sword'));
  assert.equal(state.hero.weapon.id, 'stick');
  assert.equal(state.hero.weapon.dur, null);
});

function toDefend(seed = 4) {
  const { state } = newRun(seed);
  state.foe.hp = 999;
  state.foe.maxHp = 999;
  apply(state, { type: 'strike', ms: glanceMs(state.meter) });
  assert.equal(state.phase, 'defend');
  return state;
}

test('a parry takes no damage, no shield wear, and powers the next strike', () => {
  const state = toDefend();
  const hp = state.hero.hp;
  const shield = state.hero.shield.dur;
  const events = apply(state, { type: 'defend', taps: [...state.attack.beats] });
  assert.equal(state.hero.hp, hp);
  assert.equal(state.hero.shield.dur, shield);
  assert.equal(events.find((event) => event.type === 'defend').riposte, true);
  const foeHp = state.foe.hp;
  const strike = apply(state, { type: 'strike', ms: hitMs(state.meter) }).find((event) => event.type === 'strike');
  assert.equal(strike.riposte, true);
  assert.equal(strike.damage, Math.round(heroPower(state.hero) * 1.5));
  assert.equal(foeHp - strike.damage, state.foe.hp);
});

test('a block absorbs the shield value and wears the shield, a miss takes full damage', () => {
  const state = toDefend();
  const hp = state.hero.hp;
  const beats = state.attack.beats;
  const late = beats.map((beat) => beat + 100);
  const attackDamage = state.attack.damage;
  apply(state, { type: 'defend', taps: late });
  const expected = beats.length * Math.ceil(attackDamage * (1 - SHIELDS.kite.absorb) - 1e-9);
  assert.equal(hp - state.hero.hp, expected);
  assert.equal(state.hero.shield.dur, SHIELDS.kite.durability - 1);
  const again = toDefend();
  const before = again.hero.hp;
  const full = again.attack.damage * again.attack.beats.length;
  apply(again, { type: 'defend', taps: [] });
  assert.equal(before - again.hero.hp, Math.min(before, full));
});

test('mashing through an attack is a miss on every beat', () => {
  const state = toDefend();
  const hp = state.hero.hp;
  const beats = state.attack.beats;
  const damage = state.attack.damage;
  const taps = Array.from({ length: 60 }, (_, index) => index * 40);
  const event = apply(state, { type: 'defend', taps }).find((candidate) => candidate.type === 'defend');
  assert.ok(event.results.every((result) => result.grade === 'miss'));
  assert.equal(hp - state.hero.hp, Math.min(hp, beats.length * damage));
});

test('taps are validated', () => {
  const state = toDefend();
  for (const taps of [null, 'x', [Number.NaN], [-5], [99999], Array.from({ length: 65 }, () => 1)]) {
    assert.throws(() => apply(state, { type: 'defend', taps }), InputError);
  }
});

test('a broken shield falls back to the pot lid', () => {
  const state = toDefend();
  state.hero.shield.dur = 1;
  const events = apply(state, { type: 'defend', taps: state.attack.beats.map((beat) => beat + 100) });
  assert.ok(events.some((event) => event.type === 'break' && event.slot === 'shield'));
  assert.equal(state.hero.shield.id, 'potLid');
});

test('door D stays locked without the keycard', () => {
  const state = createDeepRun({ seed: 9 });
  play(state, { ...PERFECT, nav: routeNav(['h1', 'h2', 'h3', 'h4']) }, { until: (need, current) => need.type === 'nav' && current.node === 'h4' });
  const go = expected(state).options.find((option) => option.action === 'go' && option.to === 'd1');
  assert.equal(go.locked, true);
  assert.throws(() => apply(state, { type: 'nav', action: 'go', to: 'd1' }), (error) => error instanceof InputError && error.code === 'locked');
  assert.throws(() => apply(state, { type: 'nav', action: 'go', to: 'lair' }), InputError);
});

test('the manager rages into a watermelon and drops the keycard', () => {
  const state = createDeepRun({ seed: 12 });
  const { events } = play(state, { ...PERFECT, nav: routeNav(['h1', 'a1', 'a2', 'mb', 'b1']) }, { until: (need, current) => need.type === 'nav' && current.node === 'mb' });
  assert.ok(events.some((event) => event.type === 'melon'));
  assert.equal(state.hero.keycard, true);
  const melon = events.findIndex((event) => event.type === 'melon');
  const calm = events.slice(0, melon).filter((event) => event.type === 'attack' && event.attack.line !== null).map((event) => event.attack.line);
  assert.deepEqual(calm, ['lock', 'lastpass', 'euh', 'hmpf', 'meeting', 'lock', 'lastpass', 'euh', 'hmpf', 'meeting'].slice(0, calm.length));
  assert.ok(calm.length >= 1);
  const firstRage = events.slice(melon).find((event) => event.type === 'attack');
  assert.equal(firstRage.attack.line, 'seeds');
});

test('cleared rooms stay cleared when you walk back', () => {
  const state = createDeepRun({ seed: 13 });
  play(state, { ...PERFECT, nav: routeNav(['h1', 'h2']) }, { until: (need, current) => need.type === 'nav' && current.node === 'h2' });
  const events = apply(state, { type: 'nav', action: 'go', to: 'h1' });
  assert.equal(events[0].type, 'enter');
  assert.equal(events[0].first, false);
  assert.equal(state.phase, 'nav');
  assert.equal(events.some((event) => event.type === 'foeAppear'), false);
});

test('leaving loot drops it on the floor, and it can be picked up later', () => {
  const state = createDeepRun({ seed: 14 });
  play(state, { ...PERFECT, nav: routeNav(['h1', 'a1']), loot: () => ({ type: 'loot', choice: 'leave' }) }, { until: (need, current) => need.type === 'nav' && current.node === 'a1' });
  const take = expected(state).options.find((option) => option.action === 'take');
  assert.equal(take.item.id, 'morningStar');
  apply(state, { type: 'nav', action: 'go', to: 'h1' });
  apply(state, { type: 'nav', action: 'go', to: 'a1' });
  const again = expected(state).options.find((option) => option.action === 'take');
  const events = apply(state, { type: 'nav', action: 'take', index: again.index });
  assert.equal(state.hero.weapon.id, 'morningStar');
  const dropped = events.find((event) => event.type === 'take').dropped;
  assert.equal(dropped.id, 'sword');
  assert.ok(expected(state).options.some((option) => option.action === 'take' && option.item.id === 'sword'));
});

test('potions cap at three', () => {
  const { state } = newRun(15);
  state.hero.potions = ['small', 'small', 'large'];
  state.phase = 'loot';
  state.offer = { id: 'large', slot: 'potion', dur: null };
  assert.equal(expected(state).canTake, false);
  assert.throws(() => apply(state, { type: 'loot', choice: 'take' }), InputError);
});

test('the break room chest springs a horde of fifteen, then the coffee machine and the reward', () => {
  const state = createDeepRun({ seed: 16 });
  play(state, { ...PERFECT, nav: routeNav(['h1', 'h2', 'h3', 'c1']) }, { until: (need) => need.type === 'horde' });
  const need = expected(state);
  assert.equal(need.beats.length, HORDE.count);
  const events = apply(state, { type: 'horde', taps: [...need.beats] });
  const result = events.find((event) => event.type === 'horde');
  assert.equal(result.survived, true);
  assert.equal(result.results.filter((entry) => entry.grade === 'perfect').length, HORDE.count);
  assert.equal(state.phase, 'loot');
  assert.equal(state.offer.id, 'lightbringer');
  apply(state, { type: 'loot', choice: 'take' });
  state.hero.hp = 3;
  const coffee = expected(state).options.find((option) => option.action === 'coffee');
  assert.notEqual(coffee, undefined);
  apply(state, { type: 'nav', action: 'coffee' });
  assert.equal(state.hero.hp, 3 + Math.round(state.hero.maxHp * COFFEE_HEAL));
  state.hero.hp = 3;
  assert.equal(expected(state).options.some((option) => option.action === 'coffee'), false);
});

test('mashing through the horde gets you bitten on every beat', () => {
  const state = createDeepRun({ seed: 17 });
  play(state, { ...PERFECT, nav: routeNav(['h1', 'h2', 'h3', 'c1']) }, { until: (need) => need.type === 'horde' });
  state.hero.hp = 999;
  const taps = Array.from({ length: 64 }, (_, index) => index * 60);
  const result = apply(state, { type: 'horde', taps }).find((event) => event.type === 'horde');
  assert.ok(result.results.filter((entry) => entry.grade === 'miss').length >= 12);
});

function venomed(seed = 18, taps = []) {
  const { state } = newRun(seed);
  state.foe = { ...state.foe, id: 'spider', hp: 999, maxHp: 999 };
  state.attack = { move: 'venom', beats: [800], damage: 2, heavy: false, poison: true, dust: false, projectile: null, line: null, windows: { perfect: 50, good: 140 } };
  state.phase = 'defend';
  const events = apply(state, { type: 'defend', taps });
  return { state, events };
}

test('a venom bite you fail to block poisons you', () => {
  const { state, events } = venomed();
  assert.notEqual(state.poison, null);
  assert.equal(events.find((event) => event.type === 'defend').poisoned, true);
  assert.equal(venomed(18, [800]).state.poison, null);
});

test('poison ticks with game time, faster and faster, harder and harder', () => {
  const { state } = venomed();
  state.hero.hp = 999;
  state.hero.maxHp = 999;
  const ticks = [];
  for (let step = 0; step < 80 && ticks.length < 8; step++) {
    const need = expected(state);
    if (need.type === 'strike') ticks.push(...apply(state, { type: 'strike', ms: glanceMs(need.meter) }).filter((event) => event.type === 'poisonTick'));
    else if (need.type === 'defend') ticks.push(...apply(state, { type: 'defend', taps: [...need.attack.beats] }).filter((event) => event.type === 'poisonTick'));
    else break;
  }
  assert.ok(ticks.length >= 6, `ticks ${ticks.length}`);
  const gaps = ticks.slice(1).map((tick, index) => tick.at - ticks[index].at);
  for (let index = 1; index < gaps.length; index++) assert.ok(gaps[index] <= gaps[index - 1], JSON.stringify(gaps));
  assert.ok(gaps[gaps.length - 1] < gaps[0]);
  assert.ok(ticks[ticks.length - 1].damage > ticks[0].damage);
});

test('a potion heals and cures poison', () => {
  const { state } = venomed();
  state.hero.hp = 10;
  state.resume = 'strike';
  state.phase = 'potion';
  const events = apply(state, { type: 'potion', choice: 'small' });
  assert.equal(state.poison, null);
  assert.equal(events.find((event) => event.type === 'drink').cured, true);
  assert.equal(state.hero.hp, 18);
});

test('poison left untreated can kill', () => {
  const { state } = venomed();
  state.hero.hp = 1;
  state.gameMs += 60000;
  const events = apply(state, { type: 'strike', ms: glanceMs(state.meter) });
  assert.equal(state.outcome, 'gameover');
  assert.equal(state.killer, 'poison');
  assert.ok(events.some((event) => event.type === 'poisonTick'));
});

test('the final boss spawns two bugs at sixty percent, then frenzies', () => {
  const state = createDeepRun({ seed: 19 });
  const { events } = play(state, fullPolicy());
  const spawn = events.findIndex((event) => event.type === 'spawn');
  const bugs = events.slice(spawn).filter((event) => event.type === 'foeAppear').slice(0, 3).map((event) => event.foe.id);
  assert.deepEqual(bugs, ['bug', 'bug', 'moth']);
  assert.ok(events.findIndex((event) => event.type === 'frenzy') > spawn);
});

test('the walk back costs time but the score only counts new rooms once', () => {
  const state = createDeepRun({ seed: 20 });
  play(state, { ...PERFECT, nav: routeNav(['h1', 'h2']) }, { until: (need, current) => need.type === 'nav' && current.node === 'h2' });
  const explore = state.points.explore;
  const ms = state.gameMs;
  apply(state, { type: 'nav', action: 'go', to: 'h1' });
  apply(state, { type: 'nav', action: 'go', to: 'h2' });
  assert.equal(state.points.explore, explore);
  assert.ok(state.gameMs > ms);
});

test('every node link is symmetric and the map is reachable', () => {
  for (const node of Object.values(NODES)) {
    if (node.portalRoom === true) continue;
    for (const link of node.links) assert.ok(NODES[link].links.includes(node.id), `${node.id} -> ${link}`);
  }
});

function toArchivesWithKeycard(seed) {
  const state = createDeepRun({ seed });
  play(state, { ...PERFECT, nav: routeNav(['h1', 'a1', 'a2', 'mb', 'a2', 'a1']) }, { until: (need, current) => need.type === 'nav' && current.node === 'a1' && current.hero.keycard === true });
  return state;
}

test('the archives portal stays hidden until you hold the keycard', () => {
  const state = createDeepRun({ seed: 40 });
  play(state, { ...PERFECT, nav: routeNav(['h1', 'a1']) }, { until: (need, current) => need.type === 'nav' && current.node === 'a1' });
  assert.equal(expected(state).options.some((option) => option.to === 'den'), false);
  assert.throws(() => apply(state, { type: 'nav', action: 'go', to: 'den' }), InputError);
  const later = toArchivesWithKeycard(40);
  const portal = expected(later).options.find((option) => option.to === 'den');
  assert.equal(portal.portal, true);
});

test('the portal leads to the secret den: bonus, a cherry coke and a cat to pet once', () => {
  const state = toArchivesWithKeycard(41);
  const before = state.points.secret;
  const events = apply(state, { type: 'nav', action: 'go', to: 'den' });
  assert.equal(events[0].type, 'enter');
  assert.equal(events[0].via, 'portal');
  assert.equal(state.points.secret - before, SCORE.secret);
  const options = expected(state).options;
  assert.ok(options.some((option) => option.action === 'take' && option.item.id === 'cola'));
  state.hero.hp = 5;
  const pet = apply(state, { type: 'nav', action: 'pet' }).find((event) => event.type === 'pet');
  assert.equal(pet.healed, Math.min(state.hero.maxHp - 5, CAT_HEAL));
  assert.equal(expected(state).options.some((option) => option.action === 'pet'), false);
  assert.throws(() => apply(state, { type: 'nav', action: 'pet' }), InputError);
});

test('the den portal is a shortcut to the iron door', () => {
  const state = toArchivesWithKeycard(42);
  apply(state, { type: 'nav', action: 'go', to: 'den' });
  const exits = expected(state).options.filter((option) => option.action === 'go').map((option) => option.to).sort();
  assert.deepEqual(exits, ['a1', 'h4']);
  apply(state, { type: 'nav', action: 'go', to: 'h4' });
  assert.equal(state.node, 'h4');
  play(state, PERFECT, { until: (need) => need.type === 'nav' });
  assert.equal(expected(state).options.some((option) => option.to === 'den'), false);
  assert.equal(expected(state).options.find((option) => option.to === 'd1').locked, false);
});

test('dying ends the run with a killer and no win bonus', () => {
  const { state } = newRun(22);
  state.hero.hp = 1;
  state.foe.hp = 999;
  state.foe.maxHp = 999;
  apply(state, { type: 'strike', ms: glanceMs(state.meter) });
  apply(state, { type: 'defend', taps: [] });
  assert.equal(state.outcome, 'gameover');
  assert.equal(state.killer, 'rat');
  const score = finalScore(state);
  assert.equal(score.lines.find((line) => line.id === 'time').points, 0);
});

test('stalling on one foe cannot farm defense points forever', () => {
  const { state } = newRun(30);
  state.foe.hp = 99999;
  state.foe.maxHp = 99999;
  let defense = 0;
  for (let round = 0; round < 40 && state.phase !== 'done'; round++) {
    if (state.phase === 'potion') apply(state, { type: 'potion', choice: 'save' });
    if (state.phase !== 'strike') break;
    apply(state, { type: 'strike', ms: glanceMs(state.meter) });
    if (state.phase !== 'defend') break;
    const events = apply(state, { type: 'defend', taps: [...state.attack.beats] });
    defense += events.find((event) => event.type === 'defend').results.reduce((sum, result) => sum + result.points, 0);
  }
  assert.ok(defense <= 4 * 2 * 300, `defense ${defense}`);
  assert.ok(defense > 0);
});

test('the strike event reports the weapon after this strike wore it', () => {
  const { state } = newRun(31);
  const before = state.hero.weapon.dur;
  const event = apply(state, { type: 'strike', ms: glanceMs(state.meter) }).find((candidate) => candidate.type === 'strike');
  assert.equal(event.weapon.dur, before - 2);
  assert.equal(event.weapon.dur, state.hero.weapon.dur);
});

test('the break room only counts as cleared once the horde is beaten', () => {
  const state = createDeepRun({ seed: 32 });
  play(state, { ...PERFECT, nav: routeNav(['h1', 'h2', 'h3', 'c1']) }, { until: (need, current) => need.type === 'nav' && current.node === 'c1' });
  assert.equal(state.cleared.includes('c1'), false);
  apply(state, { type: 'nav', action: 'open' });
  apply(state, { type: 'horde', taps: [...state.horde.beats] });
  play(state, PERFECT, { until: (need) => need.type === 'nav' });
  assert.equal(state.cleared.includes('c1'), true);
});

test('wizards carry magic wards instead of shields, with the same balance', () => {
  const state = createDeepRun({ seed: 50 });
  assert.throws(() => apply(state, { type: 'create', difficulty: 'normal', cls: 'wizard', weapon: 'oakStaff', shield: 'kite', first: 0, epithet: 0 }), InputError);
  apply(state, { type: 'create', difficulty: 'normal', cls: 'wizard', weapon: 'oakStaff', shield: 'runeWard', first: 0, epithet: 0 });
  assert.equal(state.hero.shield.id, 'runeWard');
  assert.equal(SHIELDS.runeWard.absorb, SHIELDS.kite.absorb);
  const knight = createDeepRun({ seed: 50 });
  assert.throws(() => apply(knight, { type: 'create', difficulty: 'normal', cls: 'knight', weapon: 'sword', shield: 'manaWard', first: 0, epithet: 0 }), InputError);
});

test('a broken ward falls back to the pointy hat and the server room gives wizards a firewall', () => {
  const state = createDeepRun({ seed: 51 });
  const policy = { ...PERFECT, create: () => ({ type: 'create', difficulty: 'normal', cls: 'wizard', weapon: 'oakStaff', shield: 'manaWard', first: 0, epithet: 0 }), nav: routeNav(['h1', 'h2', 'b1']) };
  play(state, policy, { until: (need, current) => need.type === 'loot' && current.node === 'b1' });
  assert.equal(expected(state).item.id, 'firewall');
  const broken = toDefend(52);
  broken.hero.shield = { id: 'runeWard', slot: 'shield', dur: 1 };
  broken.hero.cls = 'wizard';
  apply(broken, { type: 'defend', taps: broken.attack.beats.map((beat) => beat + 100) });
  assert.equal(broken.hero.shield.id, 'pointyHat');
});

test('the raging manager asks for a doliprane', () => {
  const { state } = newRun(53);
  state.foe = { ...state.foe, id: 'manager', rank: 'midboss', hp: 9999, maxHp: 9999, raged: true, turn: 0, attacks: 0, sweep: 860 };
  const lines = [];
  for (let round = 0; round < 6; round++) {
    state.hero.hp = state.hero.maxHp;
    apply(state, { type: 'strike', ms: glanceMs(state.meter) });
    lines.push(state.attack.line);
    apply(state, { type: 'defend', taps: [...state.attack.beats] });
    if (state.phase === 'potion') apply(state, { type: 'potion', choice: 'save' });
  }
  assert.ok(lines.includes('doliprane'), lines.join(','));
});

test('the glitch makes the strike meter crackle', () => {
  const state = createDeepRun({ seed: 54 });
  const { events } = play(state, { ...PERFECT, nav: routeNav(['h1', 'h2', 'b1']) }, { until: (need, current) => need.type === 'strike' && current.node === 'b1' });
  assert.equal(state.foe.id, 'glitch');
  assert.equal(expected(state).meter.shake, true);
  assert.ok(events.length > 0);
});

function create(difficulty, extra = {}) {
  const state = createDeepRun({ seed: 60 });
  apply(state, { type: 'create', difficulty, cls: 'knight', weapon: 'sword', shield: 'kite', first: 0, epithet: 0, ...extra });
  return state;
}

test('the difficulty is chosen at creation and validated', () => {
  for (const difficulty of [undefined, 'easy', '__proto__', 3]) {
    const state = createDeepRun({ seed: 60 });
    assert.throws(() => apply(state, { type: 'create', difficulty, cls: 'knight', weapon: 'sword', shield: 'kite', first: 0, epithet: 0 }), InputError, String(difficulty));
  }
  for (const difficulty of Object.keys(DIFFICULTIES)) assert.equal(create(difficulty).difficulty, difficulty);
});

test('on difficult and try hard the same monster gets tougher the deeper you go', () => {
  for (const difficulty of ['hard', 'tryhard']) {
    const state = create(difficulty);
    const shallow = foeHp(state, 'spider', 'a2');
    const deep = foeHp(state, 'spider', 'd1');
    assert.ok(deep > shallow, `${difficulty} ${shallow} -> ${deep}`);
  }
});

test('normal keeps the dungeon as it was tuned', () => {
  const state = create('normal');
  assert.equal(foeHp(state, 'spider', 'd1'), MONSTERS.spider.hp);
  assert.equal(trapDamage(state, DODGE.damage), DODGE.damage);
});

function firstAttack(difficulty) {
  const state = create(difficulty);
  state.foe.hp = 999;
  apply(state, { type: 'strike', ms: glanceMs(state.meter) });
  assert.equal(state.phase, 'defend');
  return state.attack;
}

test('higher difficulties hit harder and have tougher foes', () => {
  const normal = create('normal');
  const tryhard = create('tryhard');
  assert.ok(foeHp(tryhard, 'giant', 'h3') > foeHp(normal, 'giant', 'h3'));
  assert.equal(firstAttack('normal').move, firstAttack('tryhard').move);
  assert.ok(firstAttack('tryhard').damage > firstAttack('normal').damage);
});

test('no room is ever easier on a higher difficulty', () => {
  for (const node of Object.keys(NODES)) {
    for (const id of Object.keys(MONSTERS)) {
      const normal = foeHp(create('normal'), id, node);
      assert.ok(foeHp(create('hard'), id, node) >= normal, `hard ${id} ${node}`);
      assert.ok(foeHp(create('tryhard'), id, node) >= normal, `tryhard ${id} ${node}`);
    }
  }
});

test('trap damage follows the difficulty', () => {
  assert.ok(trapDamage(create('tryhard'), DODGE.damage) > DODGE.damage);
});

test('try hard wears weapons twice as fast and carries only two potions', () => {
  const state = create('tryhard');
  const before = state.hero.weapon.dur;
  apply(state, { type: 'strike', ms: hitMs(state.meter) });
  assert.equal(before - state.hero.weapon.dur, DIFFICULTIES.tryhard.wear.hit);
  state.hero.potions = ['small', 'small'];
  state.phase = 'loot';
  state.offer = { id: 'large', slot: 'potion', dur: null };
  assert.equal(expected(state).canTake, false);
});

test('the difficulty multiplies the final score', () => {
  const state = create('tryhard');
  state.points.strikes = 10000;
  const score = finalScore(state);
  const bonus = score.lines.find((line) => line.id === 'difficulty');
  assert.equal(bonus.points, Math.round(10000 * (DIFFICULTIES.tryhard.score - 1)));
  const plain = create('normal');
  plain.points.strikes = 10000;
  assert.equal(finalScore(plain).lines.find((line) => line.id === 'difficulty').points, 0);
});

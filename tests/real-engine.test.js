import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRealRun, expected, apply, finalScore, ringAt, InputError } from '../src/real/engine.js';
import { METER, SCORE, ROOM_PLAN } from '../src/real/content.js';
import { msForPosition } from '../src/meter.js';
import { ITEMS, POTIONS } from '../src/content.js';

function strikeMs(meter, zone) {
  const center = 0.5 + meter.offset;
  const half = (meter.zones.crit + meter.zones.hit) / 2;
  if (zone === 'crit') return Math.round(msForPosition(center, meter.sweepMs));
  if (zone === 'hit') return Math.round(msForPosition(center + meter.zones.crit / 2 + (half - meter.zones.crit / 2) / 2, meter.sweepMs));
  return 0;
}

function bullseyeMs(aim, ring = 'bullseye') {
  for (let ms = 0; ms <= aim.timeoutMs; ms++) if (ringAt(aim, ms) === ring) return ms;
  return null;
}

const perfect = {
  hero: () => ({ type: 'hero', choice: 'continue' }),
  strike: (need) => ({ type: 'strike', ms: strikeMs(need.meter, 'crit') }),
  potion: (need) => ({ type: 'potion', choice: need.options.includes('double') ? 'double' : 'drink' }),
  answer: (need) => ({ type: 'answer', choice: need.question.answer === '*' ? need.question.choices[0].id : need.question.answer, ms: 1200 }),
  dodge: () => ({ type: 'dodge', ms: 200 }),
  aim: (need) => ({ type: 'aim', ms: bullseyeMs(need) }),
  chest: () => ({ type: 'chest' }),
};

function play(state, policy, limit = 500) {
  const events = [...state.initialEvents];
  const inputs = [];
  for (let step = 0; step < limit; step++) {
    const need = expected(state);
    if (need.type === 'done') return { events, inputs, need };
    const input = (policy[need.type] ?? perfect[need.type])(need, state);
    inputs.push(input);
    events.push(...apply(state, input));
  }
  throw new Error('run did not finish');
}

function easyHero(overrides = {}) {
  return {
    cls: 'warrior',
    name: 'Sir Davos the Damp',
    legendary: false,
    baseAtk: 6,
    atk: 6,
    maxHp: 36,
    hp: 4,
    item: ITEMS.lightbringer,
    potion: POTIONS.small,
    ...overrides,
  };
}

test('same seed and inputs give the same run', () => {
  const first = play(createRealRun({ seed: 11, easyHero: null }), perfect);
  const replayState = createRealRun({ seed: 11, easyHero: null });
  for (const input of first.inputs) apply(replayState, input);
  const original = createRealRun({ seed: 11, easyHero: null });
  for (const input of first.inputs) apply(original, input);
  assert.deepEqual(finalScore(replayState), finalScore(original));
  assert.equal(replayState.gameMs, original.gameMs);
});

test('rooms follow the approved plan', () => {
  const { events } = play(createRealRun({ seed: 3, easyHero: null }), perfect);
  const kinds = events.filter((event) => event.type === 'roomStart').map((event) => event.kind);
  assert.deepEqual(kinds, ROOM_PLAN);
});

test('the third genie question is always the hire question', () => {
  const { events } = play(createRealRun({ seed: 5, easyHero: null }), perfect);
  const questions = events.filter((event) => event.type === 'genieAsk').map((event) => event.question.id);
  assert.equal(questions.length, 3);
  assert.equal(questions[2], 'hire');
  assert.notEqual(questions[0], questions[1]);
});

test('continuing keeps the easy hero gear and refills hp', () => {
  const state = createRealRun({ seed: 8, easyHero: easyHero() });
  assert.deepEqual(expected(state), { type: 'hero', options: ['continue', 'new'], hero: { name: 'Sir Davos the Damp', cls: 'warrior', item: 'lightbringer', potions: 1 } });
  apply(state, { type: 'hero', choice: 'continue' });
  assert.equal(state.hero.name, 'Sir Davos the Damp');
  assert.equal(state.hero.item, ITEMS.lightbringer);
  assert.equal(state.hero.potions.length, 1);
  assert.equal(state.hero.hp, state.hero.maxHp);
});

test('a new hero starts with the wooden stick and no potion', () => {
  const state = createRealRun({ seed: 8, easyHero: easyHero() });
  apply(state, { type: 'hero', choice: 'new' });
  assert.equal(state.hero.item, ITEMS.woodenStick);
  assert.equal(state.hero.potions.length, 0);
});

test('without an easy hero the run starts at the first strike', () => {
  const state = createRealRun({ seed: 8, easyHero: null });
  assert.equal(expected(state).type, 'strike');
});

test('meter varies within the allowed sweep and offset', () => {
  for (let seed = 1; seed <= 40; seed++) {
    const state = createRealRun({ seed, easyHero: null });
    const { meter } = expected(state);
    assert.ok(meter.sweepMs >= METER.base.sweepMs * METER.sweepFactor[0] - 1e-9);
    assert.ok(meter.sweepMs <= METER.base.sweepMs * METER.sweepFactor[1] + 1e-9);
    assert.ok(Math.abs(meter.offset) <= METER.offset + 1e-9);
  }
});

test('perfect streaks multiply the perfect points', () => {
  const state = createRealRun({ seed: 21, easyHero: null });
  state.foe.hp = 100000;
  state.foe.maxHp = 100000;
  const points = [];
  for (let index = 0; index < 5; index++) {
    const need = expected(state);
    const events = apply(state, { type: 'strike', ms: strikeMs(need.meter, 'crit') });
    points.push(events.find((event) => event.type === 'strike').points);
    if (expected(state).type === 'potion') apply(state, { type: 'potion', choice: 'save' });
  }
  assert.deepEqual(points, [600, 1200, 1800, 2400, 3000]);
});

test('hit and weak strikes score and reset the streak', () => {
  const state = createRealRun({ seed: 21, easyHero: null });
  state.foe.hp = 100000;
  state.foe.maxHp = 100000;
  const hit = apply(state, { type: 'strike', ms: strikeMs(expected(state).meter, 'hit') }).find((event) => event.type === 'strike');
  assert.equal(hit.zone, 'hit');
  assert.equal(hit.points, SCORE.hit);
  const weak = apply(state, { type: 'strike', ms: 0 }).find((event) => event.type === 'strike');
  assert.equal(weak.zone, 'glance');
  assert.equal(weak.points, SCORE.glance);
});

test('kills score by foe type and a flawless room adds a bonus', () => {
  const { events } = play(createRealRun({ seed: 2, easyHero: null }), perfect);
  const kills = events.filter((event) => event.type === 'kill').map((event) => event.points);
  assert.ok(kills.includes(SCORE.kill.monster));
  assert.ok(kills.includes(SCORE.kill.midboss));
  assert.equal(kills[kills.length - 1], SCORE.kill.boss);
  assert.ok(events.some((event) => event.type === 'roomClear' && event.flawless === true && event.points === SCORE.flawless));
});

test('a perfect run wins and earns hp and time bonuses', () => {
  const state = createRealRun({ seed: 2, easyHero: null });
  const { need } = play(state, perfect);
  assert.equal(need.outcome, 'victory');
  const score = finalScore(state);
  const time = score.lines.find((line) => line.id === 'time');
  assert.equal(time.points, Math.max(0, Math.round((SCORE.timeBaseSeconds - state.gameMs / 1000) * SCORE.timePoint)));
  assert.equal(score.lines.find((line) => line.id === 'hp').points, state.hero.hp * SCORE.hpPoint);
  assert.equal(score.total, score.lines.reduce((sum, line) => sum + line.points, 0));
});

test('game over keeps the points but no hp or time bonus', () => {
  const state = createRealRun({ seed: 2, easyHero: null });
  const weakPolicy = { strike: () => ({ type: 'strike', ms: 0 }), potion: () => ({ type: 'potion', choice: 'save' }), dodge: () => ({ type: 'dodge', ms: null }), answer: (need) => ({ type: 'answer', choice: need.question.choices[need.question.choices.length - 1].id, ms: 9000 }) };
  const { need } = play(state, weakPolicy);
  assert.equal(need.outcome, 'gameover');
  const score = finalScore(state);
  assert.equal(score.lines.find((line) => line.id === 'hp').points, 0);
  assert.equal(score.lines.find((line) => line.id === 'time').points, 0);
  assert.ok(score.total > 0);
});

test('inputs of the wrong type or with invalid values are rejected', () => {
  const state = createRealRun({ seed: 4, easyHero: null });
  assert.throws(() => apply(state, { type: 'answer', choice: 'nl', ms: 100 }), InputError);
  assert.throws(() => apply(state, { type: 'strike', ms: -5 }), InputError);
  assert.throws(() => apply(state, { type: 'strike', ms: Number.NaN }), InputError);
  assert.throws(() => apply(state, { type: 'strike', ms: '100' }), InputError);
  assert.throws(() => apply(state, null), InputError);
});

test('the engine records dodge and answer reaction times', () => {
  const state = createRealRun({ seed: 2, easyHero: null });
  play(state, perfect);
  assert.equal(state.reactions.dodges.length, 3);
  assert.equal(state.reactions.answers.length, 3);
});

test('nothing is accepted after the run is over', () => {
  const state = createRealRun({ seed: 2, easyHero: null });
  play(state, perfect);
  assert.throws(() => apply(state, { type: 'strike', ms: 100 }), InputError);
});

function advanceTo(state, type, policy = perfect) {
  for (let step = 0; step < 400; step++) {
    const need = expected(state);
    if (need.type === type) return need;
    if (need.type === 'done') return need;
    apply(state, (policy[need.type] ?? perfect[need.type])(need, state));
  }
  throw new Error(`never reached ${type}`);
}

test('a right genie answer scores with a fast bonus and grants a reward', () => {
  const state = createRealRun({ seed: 9, easyHero: null });
  const need = advanceTo(state, 'answer');
  const choice = need.question.answer === '*' ? need.question.choices[0].id : need.question.answer;
  const events = apply(state, { type: 'answer', choice, ms: 1500 });
  const result = events.find((event) => event.type === 'genieAnswer');
  assert.equal(result.correct, true);
  assert.equal(result.points, SCORE.genie + SCORE.genieFast);
  assert.ok(['potion', 'heal', 'atk', 'points'].includes(result.reward));
});

test('a slow right answer gets no fast bonus', () => {
  const state = createRealRun({ seed: 9, easyHero: null });
  const need = advanceTo(state, 'answer');
  const choice = need.question.answer === '*' ? need.question.choices[0].id : need.question.answer;
  const result = apply(state, { type: 'answer', choice, ms: 6000 }).find((event) => event.type === 'genieAnswer');
  assert.equal(result.points, SCORE.genie);
});

test('a wrong genie answer costs three hp but never kills', () => {
  for (let seed = 1; seed <= 60; seed++) {
    const state = createRealRun({ seed, easyHero: null });
    const need = advanceTo(state, 'answer');
    if (need.question.answer === '*') continue;
    const wrong = need.question.choices.find((choice) => choice.id !== need.question.answer).id;
    state.hero.hp = 2;
    const result = apply(state, { type: 'answer', choice: wrong, ms: 800 }).find((event) => event.type === 'genieAnswer');
    assert.equal(result.correct, false);
    assert.equal(state.hero.hp, 1);
    return;
  }
  assert.fail('no seed with a normal question found');
});

test('every skill card is a right answer', () => {
  for (let seed = 1; seed <= 200; seed++) {
    const state = createRealRun({ seed, easyHero: null });
    const need = advanceTo(state, 'answer');
    if (need.question.id !== 'skills') continue;
    assert.equal(need.question.choices.length, 4);
    const result = apply(state, { type: 'answer', choice: need.question.choices[3].id, ms: 900 }).find((event) => event.type === 'genieAnswer');
    assert.equal(result.correct, true);
    assert.equal(result.special, 'allCorrect');
    return;
  }
  assert.fail('no seed with the skills question found');
});

test('the right nationality answer triggers GOED', () => {
  for (let seed = 1; seed <= 200; seed++) {
    const state = createRealRun({ seed, easyHero: null });
    const need = advanceTo(state, 'answer');
    if (need.question.id !== 'nationality') continue;
    const result = apply(state, { type: 'answer', choice: 'nl', ms: 900 }).find((event) => event.type === 'genieAnswer');
    assert.equal(result.special, 'goed');
    return;
  }
  assert.fail('no seed with the nationality question found');
});

function toHire(seed) {
  const state = createRealRun({ seed, easyHero: null });
  for (let step = 0; step < 400; step++) {
    const need = expected(state);
    if (need.type === 'answer' && need.question.id === 'hire') return { state, need };
    apply(state, perfect[need.type](need, state));
  }
  throw new Error('no hire question');
}

test('hiring Ezra gives a potion', () => {
  const { state } = toHire(12);
  state.hero.potions = [];
  const result = apply(state, { type: 'answer', choice: 'yes', ms: 700 }).find((event) => event.type === 'genieAnswer');
  assert.equal(result.correct, true);
  assert.equal(result.reward, 'potion');
  assert.equal(state.hero.potions.length, 1);
});

test('refusing to hire Ezra poisons the hero for four strikes', () => {
  const { state } = toHire(12);
  const events = apply(state, { type: 'answer', choice: 'no', ms: 700 });
  assert.equal(events.find((event) => event.type === 'genieAnswer').special, 'poison');
  state.hero.potions = [];
  state.hero.hp = 30;
  let ticks = 0;
  for (let index = 0; index < 6; index++) {
    const need = expected(state);
    if (need.type !== 'strike') break;
    const strikeEvents = apply(state, { type: 'strike', ms: 0 });
    ticks += strikeEvents.filter((event) => event.type === 'poisonTick').length;
  }
  assert.equal(ticks, 4);
});

function toDodge(seed) {
  const state = createRealRun({ seed, easyHero: null });
  const need = advanceTo(state, 'dodge');
  return { state, need };
}

test('dodging inside the window scores and avoids damage', () => {
  const { state } = toDodge(14);
  const hp = state.hero.hp;
  const result = apply(state, { type: 'dodge', ms: 450 }).find((event) => event.type === 'dodge');
  assert.equal(result.success, true);
  assert.equal(result.points, SCORE.dodge);
  assert.equal(state.hero.hp, hp);
});

test('a late, early or missing dodge takes three damage', () => {
  for (const ms of [451, -1, null]) {
    const { state } = toDodge(14);
    const hp = state.hero.hp;
    const result = apply(state, { type: 'dodge', ms }).find((event) => event.type === 'dodge');
    assert.equal(result.success, false);
    assert.equal(state.hero.hp, hp - 3);
  }
});

function findAim() {
  for (let seed = 1; seed <= 80; seed++) {
    const state = createRealRun({ seed, easyHero: null });
    const need = advanceTo(state, 'aim');
    if (need.type === 'aim') return { state, need };
  }
  throw new Error('no seed reaches the weak spot');
}

test('two perfect hits on the final boss open the weak spot', () => {
  const { state, need } = findAim();
  assert.equal(need.type, 'aim');
  assert.equal(state.foe.id, 'monolith');
});

test('a bullseye deals six times the damage and scores a thousand', () => {
  const { state, need } = findAim();
  const hpBefore = state.foe.hp;
  const result = apply(state, { type: 'aim', ms: bullseyeMs(need) }).find((event) => event.type === 'aim');
  assert.equal(result.ring, 'bullseye');
  assert.equal(result.points, SCORE.weakSpot.bullseye);
  assert.equal(hpBefore - state.foe.hp, Math.min(hpBefore, (state.hero.atk + state.hero.item.bonus) * 6));
});

test('no aim shot counts as a miss', () => {
  const { state } = findAim();
  const hpBefore = state.foe.hp;
  const result = apply(state, { type: 'aim', ms: null }).find((event) => event.type === 'aim');
  assert.equal(result.ring, 'miss');
  assert.equal(result.points, 0);
  assert.equal(state.foe.hp, hpBefore);
});

test('the potion prompt appears only at low hp with a potion', () => {
  const state = createRealRun({ seed: 21, easyHero: easyHero() });
  apply(state, { type: 'hero', choice: 'continue' });
  state.foe.hp = 100000;
  state.foe.maxHp = 100000;
  state.hero.hp = Math.floor(state.hero.maxHp * 0.35) + 4;
  let prompted = false;
  for (let index = 0; index < 8 && prompted === false; index++) {
    apply(state, { type: 'strike', ms: 0 });
    const need = expected(state);
    if (need.type === 'potion') {
      prompted = true;
      assert.ok(state.hero.hp <= state.hero.maxHp * 0.35);
      assert.deepEqual(need.options, ['drink', 'save']);
    }
  }
  assert.equal(prompted, true);
});

test('double shot heals both potions and doubles the next strike', () => {
  const state = createRealRun({ seed: 21, easyHero: easyHero({ potion: POTIONS.large }) });
  apply(state, { type: 'hero', choice: 'continue' });
  state.hero.potions.push(POTIONS.small);
  state.foe.hp = 100000;
  state.foe.maxHp = 100000;
  state.hero.hp = Math.floor(state.hero.maxHp * 0.35) + 3;
  for (let index = 0; index < 8; index++) {
    apply(state, { type: 'strike', ms: 0 });
    if (expected(state).type === 'potion') break;
  }
  assert.deepEqual(expected(state).options, ['drink', 'save', 'double']);
  const hp = state.hero.hp;
  const events = apply(state, { type: 'potion', choice: 'double' });
  assert.equal(events.find((event) => event.type === 'potion').choice, 'double');
  assert.equal(state.hero.hp, Math.min(state.hero.maxHp, hp + POTIONS.large.heal + POTIONS.small.heal));
  assert.equal(state.hero.potions.length, 0);
  const need = expected(state);
  const strike = apply(state, { type: 'strike', ms: strikeMs(need.meter, 'hit') }).find((event) => event.type === 'strike');
  assert.equal(strike.damage, (state.hero.atk + state.hero.item.bonus) * 2);
});

test('scope creep grows and hits harder every second surviving turn', () => {
  const state = createRealRun({ seed: 7, easyHero: null });
  for (let step = 0; step < 400; step++) {
    if (state.foe !== null && state.foe.id === 'scopeCreep') break;
    const need = expected(state);
    apply(state, perfect[need.type](need, state));
  }
  assert.equal(state.foe.id, 'scopeCreep');
  state.foe.hp = 100000;
  state.foe.maxHp = 100000;
  state.hero.hp = 1000;
  state.hero.maxHp = 1000;
  const grows = [];
  for (let index = 0; index < 4; index++) {
    const events = apply(state, { type: 'strike', ms: 0 });
    grows.push(events.some((event) => event.type === 'grow'));
  }
  assert.deepEqual(grows, [false, true, false, true]);
  assert.equal(state.foe.growth, 2);
});

test('the chest keeps the better weapon and caps potions at two', () => {
  const state = createRealRun({ seed: 7, easyHero: easyHero({ item: ITEMS.lightbringer }) });
  apply(state, { type: 'hero', choice: 'continue' });
  state.hero.potions = [POTIONS.small, POTIONS.small];
  const need = advanceTo(state, 'chest');
  assert.equal(need.type, 'chest');
  apply(state, { type: 'chest' });
  assert.ok(state.hero.item.bonus >= ITEMS.lightbringer.bonus);
  assert.ok(state.hero.potions.length <= 2);
});

test('the final boss never dies before its weak spot has opened once', () => {
  for (let seed = 1; seed <= 40; seed++) {
    const strong = easyHero({ atk: 8, baseAtk: 8, hp: 40, maxHp: 40, item: ITEMS.fireball });
    const { events } = play(createRealRun({ seed, easyHero: strong }), perfect);
    const bossStart = events.findIndex((event) => event.type === 'foeAppear' && event.foe.kind === 'boss');
    const bossKill = events.findIndex((event) => event.type === 'kill' && event.kind === 'boss');
    assert.ok(bossStart >= 0 && bossKill > bossStart, `seed ${seed} reaches the boss and wins`);
    const weakSpot = events.findIndex((event, index) => index > bossStart && event.type === 'weakSpot');
    assert.ok(weakSpot > bossStart && weakSpot < bossKill, `seed ${seed} opens the weak spot before the kill`);
  }
});

test('a killing strike before any weak spot leaves the boss at 1 hp and opens it', () => {
  const strong = easyHero({ atk: 8, baseAtk: 8, hp: 40, maxHp: 40, item: ITEMS.fireball });
  const { events } = play(createRealRun({ seed: 3, easyHero: strong }), { ...perfect, aim: () => ({ type: 'aim', ms: null }) });
  const bossStart = events.findIndex((event) => event.type === 'foeAppear' && event.foe.kind === 'boss');
  const firstAim = events.findIndex((event, index) => index > bossStart && event.type === 'weakSpot');
  const strikeBefore = events.slice(bossStart, firstAim).filter((event) => event.type === 'strike').at(-1);
  assert.ok(strikeBefore.foeHp >= 1);
  const miss = events.find((event, index) => index > firstAim && event.type === 'aim');
  assert.equal(miss.ring, 'miss');
});

import { rollHero, rollChest, strikeDamage } from '../rules.js';
import { POTIONS } from '../content.js';
import { zoneForMs, positionAt, isValidTapMs } from '../meter.js';
import { deriveStreams, shuffle } from './streams.js';
import {
  HARD_MONSTERS,
  MONSTER_STATS,
  MIDBOSS,
  FINAL_BOSS,
  WEAK_SPOT,
  METER,
  DODGE,
  GENIE,
  POISON,
  POTION_THRESHOLD,
  MAX_POTIONS,
  SCORE,
  DURATIONS,
  SKILLS,
  QUESTIONS,
  RANDOM_QUESTION_IDS,
  ROOM_PLAN,
} from './content.js';

export class InputError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}

const WAYPOINT_STEP_MS = 500;
const MAX_REACTION_MS = 10000;

function planRooms(streams) {
  const questionIds = shuffle(streams.rooms, RANDOM_QUESTION_IDS).slice(0, 2);
  const monster = () => streams.rooms.pick(HARD_MONSTERS);
  const lastFightSize = streams.rooms.chance(0.5) === true ? 2 : 1;
  let fights = 0;
  let genies = 0;
  return ROOM_PLAN.map((kind) => {
    if (kind === 'fight') {
      fights += 1;
      const size = fights === 4 ? lastFightSize : 1;
      return { kind, monsters: Array.from({ length: size }, monster) };
    }
    if (kind === 'genie') {
      genies += 1;
      return { kind, questionId: genies === 3 ? 'hire' : questionIds[genies - 1] };
    }
    return { kind };
  });
}

function newHero(streams) {
  const { potion, ...hero } = rollHero(streams.rooms);
  return { ...hero, potions: potion === null ? [] : [potion] };
}

function continuedHero(easyHero) {
  const { potion, ...hero } = easyHero;
  return { ...hero, hp: easyHero.maxHp, potions: potion === null || potion === undefined ? [] : [potion] };
}

export function createRealRun({ seed, easyHero = null }) {
  const streams = deriveStreams(seed);
  const state = {
    seed,
    streams,
    easyHero,
    plan: planRooms(streams),
    hero: null,
    roomIndex: -1,
    room: null,
    phase: 'hero',
    foe: null,
    foeQueue: [],
    turn: 0,
    streak: 0,
    perfectsOnBoss: 0,
    weakSpotsOpened: 0,
    pendingDouble: false,
    poison: 0,
    roomDamaged: false,
    arrows: [],
    arrowIndex: 0,
    question: null,
    meter: null,
    aim: null,
    resume: null,
    points: { strikes: 0, combos: 0, weakSpot: 0, dodges: 0, genie: 0, kills: 0, flawless: 0 },
    counts: { strikes: 0, perfects: 0, bullseyes: 0, dodges: 0, genieRight: 0 },
    timing: [],
    reactions: { dodges: [], answers: [] },
    gameMs: DURATIONS.title,
    outcome: null,
    killer: null,
    lastFoe: null,
    initialEvents: [],
  };
  if (easyHero === null) {
    state.hero = newHero(streams);
    enterRoom(state, state.initialEvents);
  }
  return state;
}

function heroSummary(hero) {
  return { name: hero.name, cls: hero.cls, item: hero.item.id, potions: hero.potion === null || hero.potion === undefined ? 0 : 1 };
}

export function expected(state) {
  switch (state.phase) {
    case 'hero':
      return { type: 'hero', options: ['continue', 'new'], hero: heroSummary(state.easyHero) };
    case 'strike':
      return { type: 'strike', meter: { ...state.meter }, foe: foeSummary(state.foe) };
    case 'potion':
      return { type: 'potion', options: potionOptions(state), hp: state.hero.hp, maxHp: state.hero.maxHp };
    case 'answer':
      return { type: 'answer', question: state.question };
    case 'dodge':
      return { type: 'dodge', arrow: { index: state.arrowIndex, waitMs: state.arrows[state.arrowIndex], windowMs: DODGE.windowMs } };
    case 'aim':
      return { type: 'aim', ...state.aim };
    case 'chest':
      return { type: 'chest' };
    default:
      return { type: 'done', outcome: state.outcome };
  }
}

function foeSummary(foe) {
  return { id: foe.id, name: foe.name, kind: foe.kind, hp: foe.hp, maxHp: foe.maxHp };
}

function potionOptions(state) {
  return state.hero.potions.length >= 2 ? ['drink', 'save', 'double'] : ['drink', 'save'];
}

export function apply(state, input) {
  if (input === null || typeof input !== 'object') throw new InputError('input');
  if (state.phase === 'done') throw new InputError('finished');
  if (input.type !== state.phase) throw new InputError('unexpected');
  const events = [];
  switch (state.phase) {
    case 'hero':
      chooseHero(state, input, events);
      break;
    case 'strike':
      strike(state, input, events);
      break;
    case 'potion':
      potion(state, input, events);
      break;
    case 'answer':
      answer(state, input, events);
      break;
    case 'dodge':
      dodge(state, input, events);
      break;
    case 'aim':
      aim(state, input, events);
      break;
    case 'chest':
      chest(state, events);
      break;
    default:
      throw new InputError('unexpected');
  }
  return events;
}

function chooseHero(state, input, events) {
  if (input.choice !== 'continue' && input.choice !== 'new') throw new InputError('choice');
  state.hero = input.choice === 'continue' ? continuedHero(state.easyHero) : newHero(state.streams);
  events.push({ type: 'hero', choice: input.choice, hero: state.hero });
  enterRoom(state, events);
}

function enterRoom(state, events) {
  state.roomIndex += 1;
  const room = state.plan[state.roomIndex];
  state.room = room;
  state.roomDamaged = false;
  state.gameMs += DURATIONS.walk;
  events.push({ type: 'roomStart', index: state.roomIndex, kind: room.kind });
  if (room.kind === 'fight') {
    state.foeQueue = room.monsters.map((def) => makeMonster(state, def));
    nextFoe(state, events);
  } else if (room.kind === 'midboss') {
    state.gameMs += DURATIONS.midbossIntro;
    state.foeQueue = [makeBoss(state, MIDBOSS)];
    nextFoe(state, events);
  } else if (room.kind === 'boss') {
    state.gameMs += DURATIONS.bossIntro;
    state.foeQueue = [makeBoss(state, FINAL_BOSS)];
    nextFoe(state, events);
  } else if (room.kind === 'genie') {
    state.question = buildQuestion(state, room.questionId);
    state.gameMs += DURATIONS.genieIntro;
    events.push({ type: 'genieAsk', question: state.question });
    state.phase = 'answer';
  } else if (room.kind === 'trap') {
    state.arrows = Array.from({ length: DODGE.arrows }, () => Math.round(state.streams.dodge.range(DODGE.waitMs[0], DODGE.waitMs[1])));
    state.arrowIndex = 0;
    state.gameMs += DURATIONS.trapIntro;
    events.push({ type: 'trapStart', arrows: state.arrows.length });
    state.phase = 'dodge';
  } else {
    events.push({ type: 'chestReady' });
    state.phase = 'chest';
  }
}

function makeMonster(state, def) {
  const factor = state.streams.combat.range(MONSTER_STATS.hpFactor[0], MONSTER_STATS.hpFactor[1]);
  const maxHp = Math.max(1, Math.round(state.hero.baseAtk * factor));
  return { ...def, kind: 'monster', maxHp, hp: maxHp, atk: MONSTER_STATS.atk, atkBonus: 0, growth: 0, enraged: false };
}

function makeBoss(state, def) {
  const maxHp = state.hero.baseAtk * def.hpFactor;
  return { id: def.id, kind: def.kind, name: def.name, title: def.title, maxHp, hp: maxHp, atk: def.atk, atkBonus: 0, growth: 0, enraged: false };
}

function nextFoe(state, events) {
  state.foe = state.foeQueue.shift();
  state.lastFoe = state.foe.name;
  state.turn = 0;
  state.gameMs += DURATIONS.foeIntro;
  events.push({ type: 'foeAppear', foe: foeSummary(state.foe), title: state.foe.title ?? null });
  beginStrike(state);
}

function beginStrike(state) {
  const rng = state.streams.meter;
  state.meter = {
    sweepMs: METER.base.sweepMs * rng.range(METER.sweepFactor[0], METER.sweepFactor[1]),
    zones: METER.base.zones,
    offset: rng.range(-METER.offset, METER.offset),
  };
  state.phase = 'strike';
}

function strike(state, input, events) {
  if (isValidTapMs(input.ms) === false) throw new InputError('ms');
  const ms = Math.round(input.ms);
  const { meter, foe, hero } = state;
  const zone = zoneForMs(ms, meter);
  state.gameMs += ms + DURATIONS.strikeResolve;
  state.timing.push((positionAt(ms, meter.sweepMs) - (0.5 + meter.offset)) * meter.sweepMs);
  state.counts.strikes += 1;
  const base = SCORE[zone];
  let combo = 0;
  if (zone === 'crit') {
    state.streak += 1;
    state.counts.perfects += 1;
    combo = Math.round(base * SCORE.combo[Math.min(state.streak, SCORE.combo.length) - 1]) - base;
  } else {
    state.streak = 0;
  }
  state.points.strikes += base;
  state.points.combos += combo;
  let damage = strikeDamage(hero, zone);
  if (state.pendingDouble === true) {
    damage *= 2;
    state.pendingDouble = false;
  }
  foe.hp = Math.max(0, foe.hp - damage);
  const finisher = foe.kind === 'boss' && foe.hp === 0 && state.weakSpotsOpened === 0;
  if (finisher === true) foe.hp = 1;
  events.push({ type: 'strike', zone, ms, damage, points: base + combo, streak: state.streak, foeHp: foe.hp });
  if (state.poison > 0) {
    state.poison -= 1;
    const lost = Math.max(0, Math.min(POISON.damage, hero.hp - 1));
    hero.hp -= lost;
    if (lost > 0) state.roomDamaged = true;
    events.push({ type: 'poisonTick', damage: lost, left: state.poison, heroHp: hero.hp });
  }
  if (foe.hp === 0) {
    killFoe(state, events);
    return;
  }
  if (foe.kind === 'boss') {
    checkEnrage(state, events);
    if (finisher === true) {
      state.perfectsOnBoss = 0;
      startAim(state, events);
      return;
    }
    if (zone === 'crit') {
      state.perfectsOnBoss += 1;
      if (state.perfectsOnBoss >= FINAL_BOSS.perfectsForWeakSpot) {
        state.perfectsOnBoss = 0;
        startAim(state, events);
        return;
      }
    }
  }
  foeTurn(state, events);
}

function checkEnrage(state, events) {
  const foe = state.foe;
  if (foe.enraged === false && foe.hp <= foe.maxHp / 2) {
    foe.enraged = true;
    state.gameMs += DURATIONS.enrage;
    events.push({ type: 'enrage' });
  }
}

function foeTurn(state, events) {
  const { foe, hero } = state;
  state.turn += 1;
  if (foe.kind === 'midboss' && state.turn % MIDBOSS.growEvery === 0) {
    foe.growth += 1;
    foe.atkBonus += 1;
    events.push({ type: 'grow', growth: foe.growth });
  }
  const enrage = foe.kind === 'boss' && foe.enraged === true ? FINAL_BOSS.enrageBonus : 0;
  const damage = state.streams.combat.int(foe.atk[0], foe.atk[1]) + foe.atkBonus + enrage;
  hero.hp = Math.max(0, hero.hp - damage);
  state.roomDamaged = true;
  state.gameMs += DURATIONS.counter;
  events.push({ type: 'counter', damage, heroHp: hero.hp });
  if (hero.hp === 0) {
    gameOver(state, events, foe.name);
    return;
  }
  continueAfterDamage(state, events, 'strike');
}

function continueAfterDamage(state, events, resume) {
  const hero = state.hero;
  if (hero.hp > 0 && hero.hp <= hero.maxHp * POTION_THRESHOLD && hero.potions.length > 0) {
    state.resume = resume;
    state.phase = 'potion';
    events.push({ type: 'potionPrompt', options: potionOptions(state) });
    return;
  }
  resumeTo(state, events, resume);
}

function resumeTo(state, events, resume) {
  if (resume === 'strike') beginStrike(state);
  else if (resume === 'dodge') state.phase = 'dodge';
  else if (resume === 'trapClear') clearRoom(state, events);
  else enterRoom(state, events);
}

function potion(state, input, events) {
  const options = potionOptions(state);
  if (options.includes(input.choice) === false) throw new InputError('choice');
  const hero = state.hero;
  const before = hero.hp;
  if (input.choice === 'drink') {
    const drunk = hero.potions.shift();
    hero.hp = Math.min(hero.maxHp, hero.hp + drunk.heal);
    state.gameMs += DURATIONS.potionDrink;
  } else if (input.choice === 'double') {
    const heal = hero.potions[0].heal + hero.potions[1].heal;
    hero.potions = [];
    hero.hp = Math.min(hero.maxHp, hero.hp + heal);
    state.pendingDouble = true;
    state.gameMs += DURATIONS.doubleShot;
  }
  events.push({ type: 'potion', choice: input.choice, healed: hero.hp - before, heroHp: hero.hp, potions: hero.potions.length });
  const resume = state.resume;
  state.resume = null;
  resumeTo(state, events, resume);
}

function killFoe(state, events) {
  const foe = state.foe;
  const points = SCORE.kill[foe.kind];
  state.points.kills += points;
  state.gameMs += DURATIONS.kill;
  events.push({ type: 'kill', foe: foeSummary(foe), kind: foe.kind, points });
  if (foe.kind === 'boss') {
    victory(state, events);
    return;
  }
  if (state.foeQueue.length > 0) {
    nextFoe(state, events);
    return;
  }
  clearRoom(state, events);
}

function clearRoom(state, events) {
  const flawless = state.roomDamaged === false;
  const points = flawless === true ? SCORE.flawless : 0;
  state.points.flawless += points;
  state.gameMs += DURATIONS.roomClear;
  events.push({ type: 'roomClear', kind: state.room.kind, flawless, points });
  state.foe = null;
  enterRoom(state, events);
}

function addPotion(hero, potionDef) {
  if (hero.potions.length < MAX_POTIONS) {
    hero.potions.push(potionDef);
    return 'potion';
  }
  hero.hp = Math.min(hero.maxHp, hero.hp + potionDef.heal);
  return 'heal';
}

function chest(state, events) {
  const hero = state.hero;
  const loot = rollChest(state.streams.combat, hero);
  const bite = loot.mimic === true ? Math.max(0, Math.min(2, hero.hp - 1)) : 0;
  hero.hp -= bite;
  let keptItem = false;
  if (loot.item !== null && loot.item.bonus > hero.item.bonus) {
    hero.item = loot.item;
    keptItem = true;
  }
  const potionResult = loot.potion !== null ? addPotion(hero, loot.potion) : null;
  state.gameMs += DURATIONS.chest;
  events.push({ type: 'chest', loot, bite, keptItem, potionResult, heroHp: hero.hp, potions: hero.potions.length });
  if (bite > 0) continueAfterDamage(state, events, 'nextRoom');
  else enterRoom(state, events);
}

function buildQuestion(state, id) {
  const def = QUESTIONS[id];
  let choices = def.choices;
  if (id === 'skills') {
    choices = shuffle(state.streams.genie, SKILLS)
      .slice(0, 4)
      .map((label, index) => ({ id: `skill${index}`, label, icon: 'skill' }));
  } else if (def.shuffle !== false) {
    choices = shuffle(state.streams.genie, def.choices);
  }
  return { id, text: def.text, answer: def.answer, choices };
}

function answer(state, input, events) {
  const question = state.question;
  if (question.choices.some((choice) => choice.id === input.choice) === false) throw new InputError('choice');
  if (isValidTapMs(input.ms) === false) throw new InputError('ms');
  const ms = Math.round(input.ms);
  const hero = state.hero;
  state.gameMs += ms + DURATIONS.genieResolve;
  state.reactions.answers.push(ms);
  const fast = ms < GENIE.fastMs ? SCORE.genieFast : 0;
  let result;
  if (question.id === 'hire') {
    if (input.choice === 'yes') {
      result = { correct: true, points: SCORE.genie + fast, reward: addPotion(hero, POTIONS.large), special: 'hired', damage: 0 };
    } else {
      state.poison = POISON.ticks;
      result = { correct: false, points: 0, reward: null, special: 'poison', damage: 0 };
    }
  } else if (question.answer === '*' || input.choice === question.answer) {
    const reward = state.streams.genie.pick(GENIE.rewards);
    let bonus = 0;
    let rewardResult = reward;
    if (reward === 'potion') rewardResult = addPotion(hero, POTIONS.large);
    else if (reward === 'heal') hero.hp = Math.min(hero.maxHp, hero.hp + GENIE.heal);
    else if (reward === 'atk') hero.atk += GENIE.atk;
    else bonus = GENIE.points;
    const special = question.id === 'nationality' ? 'goed' : question.id === 'skills' ? 'allCorrect' : null;
    result = { correct: true, points: SCORE.genie + fast + bonus, reward: rewardResult, special, damage: 0 };
  } else {
    const damage = Math.max(0, Math.min(GENIE.wrongDamage, hero.hp - 1));
    hero.hp -= damage;
    result = { correct: false, points: 0, reward: null, special: null, damage };
  }
  if (result.correct === true) state.counts.genieRight += 1;
  state.points.genie += result.points;
  events.push({ type: 'genieAnswer', questionId: question.id, choice: input.choice, ms, heroHp: hero.hp, ...result });
  state.question = null;
  if (result.damage > 0) continueAfterDamage(state, events, 'nextRoom');
  else enterRoom(state, events);
}

function dodge(state, input, events) {
  const waitMs = state.arrows[state.arrowIndex];
  const ms = input.ms;
  if (ms !== null && (typeof ms !== 'number' || Number.isFinite(ms) === false || ms < -waitMs || ms > MAX_REACTION_MS)) throw new InputError('ms');
  const rounded = ms === null ? null : Math.round(ms);
  const success = rounded !== null && rounded >= 0 && rounded <= DODGE.windowMs;
  const hero = state.hero;
  state.gameMs += waitMs + (success === true ? rounded : DODGE.windowMs) + DURATIONS.dodgeResolve;
  let damage = 0;
  let points = 0;
  if (rounded !== null) state.reactions.dodges.push(rounded);
  if (success === true) {
    points = SCORE.dodge;
    state.points.dodges += points;
    state.counts.dodges += 1;
  } else {
    damage = DODGE.damage;
    hero.hp = Math.max(0, hero.hp - damage);
    state.roomDamaged = true;
  }
  events.push({ type: 'dodge', index: state.arrowIndex, ms: rounded, success, points, damage, heroHp: hero.hp });
  if (hero.hp === 0) {
    gameOver(state, events, 'A wall arrow');
    return;
  }
  state.arrowIndex += 1;
  const resume = state.arrowIndex < state.arrows.length ? 'dodge' : 'trapClear';
  if (damage > 0) continueAfterDamage(state, events, resume);
  else resumeTo(state, events, resume);
}

function startAim(state, events) {
  const rng = state.streams.aim;
  const eye = WEAK_SPOT.eye;
  const count = Math.floor(WEAK_SPOT.timeoutMs / WAYPOINT_STEP_MS) + 3;
  const eyeFirst = 1 + rng.int(0, 1);
  const eyeSecond = 4 + rng.int(0, 1);
  const eyeThird = 7 + rng.int(0, 1);
  const waypoints = [];
  for (let index = 0; index < count; index++) {
    if (index === eyeFirst || index === eyeSecond || index === eyeThird) {
      waypoints.push({ x: eye.x, y: eye.y });
      continue;
    }
    const angle = rng.range(0, Math.PI * 2);
    const radius = rng.range(0.45, WEAK_SPOT.amplitude[1]);
    waypoints.push({ x: Math.cos(angle) * radius, y: Math.sin(angle) * radius * 0.8 });
  }
  state.weakSpotsOpened += 1;
  state.aim = { waypoints, stepMs: WAYPOINT_STEP_MS, eye, rings: WEAK_SPOT.rings, timeoutMs: WEAK_SPOT.timeoutMs };
  state.gameMs += DURATIONS.weakSpotIntro;
  events.push({ type: 'weakSpot', aim: state.aim });
  state.phase = 'aim';
}

function catmullRom(p0, p1, p2, p3, t) {
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}

export function crosshairAt(aim, ms) {
  const clamped = Math.max(0, Math.min(aim.timeoutMs, ms));
  const segment = Math.min(aim.waypoints.length - 3, Math.floor(clamped / aim.stepMs));
  const t = clamped / aim.stepMs - segment;
  const points = aim.waypoints;
  const p0 = points[Math.max(0, segment - 1)];
  const p1 = points[segment];
  const p2 = points[segment + 1];
  const p3 = points[Math.min(points.length - 1, segment + 2)];
  return { x: catmullRom(p0.x, p1.x, p2.x, p3.x, t), y: catmullRom(p0.y, p1.y, p2.y, p3.y, t) };
}

export function ringAt(aim, ms) {
  if (ms === null || ms > aim.timeoutMs) return 'miss';
  const point = crosshairAt(aim, ms);
  const distance = Math.hypot(point.x - aim.eye.x, point.y - aim.eye.y);
  if (distance <= aim.rings.bullseye) return 'bullseye';
  if (distance <= aim.rings.close) return 'close';
  if (Math.hypot(point.x, point.y / 0.8) <= 1) return 'head';
  return 'miss';
}

function aim(state, input, events) {
  const ms = input.ms;
  if (ms !== null && isValidTapMs(ms) === false) throw new InputError('ms');
  const rounded = ms === null ? null : Math.round(ms);
  const ring = ringAt(state.aim, rounded);
  const { hero, foe } = state;
  let damage = (hero.atk + hero.item.bonus) * WEAK_SPOT.multipliers[ring];
  if (state.pendingDouble === true && damage > 0) {
    damage *= 2;
    state.pendingDouble = false;
  }
  const points = SCORE.weakSpot[ring];
  state.points.weakSpot += points;
  if (ring === 'bullseye') state.counts.bullseyes += 1;
  foe.hp = Math.max(0, foe.hp - damage);
  state.gameMs += Math.min(rounded ?? state.aim.timeoutMs, state.aim.timeoutMs) + DURATIONS.aimResolve;
  events.push({ type: 'aim', ring, ms: rounded, damage, points, foeHp: foe.hp });
  state.aim = null;
  if (foe.hp === 0) {
    killFoe(state, events);
    return;
  }
  checkEnrage(state, events);
  foeTurn(state, events);
}

function victory(state, events) {
  state.outcome = 'victory';
  state.phase = 'done';
  events.push({ type: 'victory' });
}

function gameOver(state, events, killer) {
  state.outcome = 'gameover';
  state.killer = killer;
  state.phase = 'done';
  events.push({ type: 'gameOver', killer });
}

export function finalScore(state) {
  const won = state.outcome === 'victory';
  const seconds = state.gameMs / 1000;
  const lines = [
    { id: 'strikes', label: 'Strikes', points: state.points.strikes },
    { id: 'combos', label: 'Perfect combos', points: state.points.combos },
    { id: 'weakSpot', label: 'Weak spot', points: state.points.weakSpot },
    { id: 'dodges', label: 'Dodges', points: state.points.dodges },
    { id: 'genie', label: 'Genie', points: state.points.genie },
    { id: 'kills', label: 'Kills', points: state.points.kills },
    { id: 'flawless', label: 'Flawless rooms', points: state.points.flawless },
    { id: 'hp', label: 'HP left', points: won === true ? state.hero.hp * SCORE.hpPoint : 0 },
    { id: 'time', label: 'Time bonus', points: won === true ? Math.max(0, Math.round((SCORE.timeBaseSeconds - seconds) * SCORE.timePoint)) : 0 },
  ];
  return { total: lines.reduce((sum, line) => sum + line.points, 0), lines, seconds, outcome: state.outcome };
}

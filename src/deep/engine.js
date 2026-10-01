import { createRng } from '../rules.js';
import { FIRST_NAMES, EPITHETS } from '../content.js';
import { zoneForMs, positionAt, isValidTapMs } from '../meter.js';
import { judgeBeats } from './judge.js';
import {
  CLASSES,
  WEAPONS,
  SHIELDS,
  POTIONS,
  KEYCARD,
  STARTING_WEAPONS,
  STARTING_SHIELDS,
  BASIC_SHIELD,
  DIFFICULTIES,
  DEPTH,
  DEPTH_PIVOT,
  POTION_THRESHOLD,
  METER,
  DEFENSE,
  DODGE,
  HORDE,
  POISON,
  COFFEE_HEAL,
  CAT_HEAL,
  RIPOSTE,
  TAP_EXTRA,
  SCORED_ATTACKS,
  MULTIPLIERS,
  RAGE_THRESHOLD,
  MONSTERS,
  MANAGER,
  MOTH,
  VOLLEYS,
  NODES,
  HORDE_REWARD,
  START_NODE,
  SCORE,
  DURATIONS,
} from './content.js';

export class InputError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}

const STREAM_KEYS = { combat: 0x2c1b3c6d, meter: 0x297a2d39, attack: 0x7feb352d, arrows: 0x846ca68b, horde: 0x1b873593 };
const MAX_TAPS = 64;
const MAX_TAP_MS = 20000;
const COMBAT_STEPS = ['fight', 'arrows', 'midboss', 'mimic', 'boss'];
const POTION_IDS = ['small', 'large', 'cola'];

function deriveStreams(seed) {
  const streams = {};
  for (const [name, key] of Object.entries(STREAM_KEYS)) streams[name] = createRng((seed ^ key) >>> 0);
  return streams;
}

export function itemDef(item) {
  if (item.slot === 'weapon') return WEAPONS[item.id];
  if (item.slot === 'shield') return SHIELDS[item.id];
  if (item.slot === 'potion') return POTIONS[item.id];
  return KEYCARD;
}

function freshItem(def) {
  return { id: def.id, slot: def.slot, dur: def.durability ?? null };
}

export function createDeepRun({ seed }) {
  return {
    seed,
    streams: deriveStreams(seed),
    phase: 'create',
    difficulty: 'normal',
    hero: null,
    node: null,
    from: null,
    visited: [],
    cleared: [],
    progress: {},
    floor: {},
    trapChest: 'closed',
    coffee: 'locked',
    cat: 'asleep',
    offers: [],
    offer: null,
    queue: [],
    foe: null,
    meter: null,
    attack: null,
    volley: null,
    horde: null,
    resume: null,
    streak: 0,
    riposte: false,
    poison: null,
    dusted: false,
    roomDamaged: false,
    points: { strikes: 0, combos: 0, defense: 0, dodges: 0, horde: 0, kills: 0, flawless: 0, explore: 0, secret: 0 },
    counts: { strikes: 0, perfects: 0, parries: 0, blocks: 0, hits: 0, dodges: 0, arrowHits: 0, hordePerfect: 0, hordeGood: 0, hordeMiss: 0, kills: 0, broken: 0, potions: 0 },
    timing: [],
    parryErrors: [],
    gameMs: DURATIONS.intro,
    outcome: null,
    killer: null,
    lastFoe: null,
    initialEvents: [],
  };
}

export function heroName(hero) {
  return `${FIRST_NAMES[hero.first]} ${EPITHETS[hero.epithet]}`;
}

export function heroPower(hero) {
  const cls = CLASSES[hero.cls];
  const rage = cls.rage > 0 && hero.hp <= hero.maxHp * RAGE_THRESHOLD ? cls.rage : 0;
  return hero.baseAtk + WEAPONS[hero.weapon.id].power + rage;
}

export function floorItems(state, node) {
  return floorOf(state, node).map((item) => ({ ...item }));
}

function floorOf(state, node) {
  if (state.floor[node] === undefined) state.floor[node] = (NODES[node].floor ?? []).map((spec) => freshItem(resolveLoot(state, spec)));
  return state.floor[node];
}

function resolveLoot(state, spec) {
  if (spec.weapon !== undefined) return WEAPONS[spec.weapon[CLASSES[state.hero.cls].family]];
  if (spec.shield !== undefined) return SHIELDS[typeof spec.shield === 'string' ? spec.shield : spec.shield[CLASSES[state.hero.cls].family]];
  if (spec.potion !== undefined) return POTIONS[spec.potion];
  return KEYCARD;
}

function rules(state) {
  return DIFFICULTIES[state.difficulty];
}

function depthFactor(state, node, weight = 1) {
  return Math.max(1, 1 + rules(state).depth * weight * (DEPTH[node] - DEPTH_PIVOT));
}

export function trapDamage(state, base) {
  return Math.max(1, Math.round(base * rules(state).damage));
}

export function foeHp(state, id, node) {
  const def = MONSTERS[id];
  return Math.max(1, Math.round(def.hp * rules(state).hp * depthFactor(state, node)));
}

export function healAmount(state, amount) {
  return Math.max(1, Math.round(amount * rules(state).heal));
}

function canTake(state, item) {
  if (item.slot === 'potion') return state.hero.potions.length < rules(state).potions;
  return true;
}

function foeSummary(foe) {
  return { id: foe.id, key: foe.key, variant: foe.variant ?? 'base', rank: foe.rank, hp: foe.hp, maxHp: foe.maxHp, armor: foe.armor, enraged: foe.enraged, raged: foe.raged };
}

function navOptions(state) {
  const node = NODES[state.node];
  const hero = state.hero;
  const options = [];
  if (node.trapChest === true && state.trapChest === 'closed') options.push({ action: 'open' });
  if (node.id === 'c1' && state.coffee === 'ready' && hero.hp < hero.maxHp) options.push({ action: 'coffee' });
  if (node.portalRoom === true && state.cat === 'asleep') options.push({ action: 'pet' });
  floorOf(state, node.id).forEach((item, index) => options.push({ action: 'take', index, item: { ...item }, canTake: canTake(state, item) }));
  if (hero.hp < hero.maxHp) {
    for (const id of POTION_IDS) if (hero.potions.includes(id) === true) options.push({ action: 'drink', potion: id });
  }
  for (const to of node.links) {
    const locked = node.locked === to && hero.keycard === false;
    options.push({ action: 'go', to, locked, back: to === state.from, portal: node.portalRoom === true });
  }
  if (node.portal !== undefined && hero.keycard === true) options.push({ action: 'go', to: node.portal.to, locked: false, back: false, portal: true });
  return options;
}

export function expected(state) {
  switch (state.phase) {
    case 'create':
      return { type: 'create', difficulties: Object.keys(DIFFICULTIES), classes: Object.keys(CLASSES), weapons: STARTING_WEAPONS, shields: STARTING_SHIELDS, names: { first: FIRST_NAMES.length, epithet: EPITHETS.length } };
    case 'nav':
      return { type: 'nav', node: state.node, from: state.from, options: navOptions(state) };
    case 'strike':
      return { type: 'strike', meter: { ...state.meter }, foe: foeSummary(state.foe) };
    case 'defend':
      return { type: 'defend', attack: { ...state.attack, beats: [...state.attack.beats] }, windows: { ...state.attack.windows }, foe: foeSummary(state.foe) };
    case 'potion':
      return { type: 'potion', options: potionOptions(state), hp: state.hero.hp, maxHp: state.hero.maxHp };
    case 'loot':
      return { type: 'loot', item: { ...state.offer }, canTake: canTake(state, state.offer) };
    case 'dodge':
      return { type: 'dodge', beats: [...state.volley.beats], windows: { perfect: DODGE.perfectMs, good: DODGE.goodMs } };
    case 'horde':
      return { type: 'horde', beats: [...state.horde.beats], sides: [...state.horde.sides], windows: { perfect: HORDE.perfectMs, good: HORDE.goodMs } };
    default:
      return { type: 'done', outcome: state.outcome };
  }
}

function potionOptions(state) {
  const options = POTION_IDS.filter((id) => state.hero.potions.includes(id) === true);
  return [...options, 'save'];
}

export function apply(state, input) {
  if (input === null || typeof input !== 'object') throw new InputError('input');
  if (state.phase === 'done') throw new InputError('finished');
  if (input.type !== state.phase) throw new InputError('unexpected');
  const events = [];
  switch (state.phase) {
    case 'create':
      create(state, input, events);
      break;
    case 'nav':
      nav(state, input, events);
      break;
    case 'strike':
      strike(state, input, events);
      break;
    case 'defend':
      defend(state, input, events);
      break;
    case 'potion':
      potion(state, input, events);
      break;
    case 'loot':
      loot(state, input, events);
      break;
    case 'dodge':
      dodge(state, input, events);
      break;
    case 'horde':
      horde(state, input, events);
      break;
    default:
      throw new InputError('unexpected');
  }
  tickPoison(state, events);
  return events;
}

function tickPoison(state, events) {
  const hero = state.hero;
  while (state.poison !== null && state.phase !== 'done' && state.poison.next <= state.gameMs) {
    const poison = state.poison;
    poison.ticks += 1;
    const damage = Math.min(hero.hp, POISON.damage[Math.min(POISON.damage.length - 1, poison.ticks - 1)]);
    hero.hp -= damage;
    state.roomDamaged = true;
    const at = poison.next;
    poison.interval = Math.max(POISON.minMs, poison.interval - POISON.stepMs);
    poison.next += poison.interval;
    events.push({ type: 'poisonTick', at, damage, heroHp: hero.hp, ticks: poison.ticks });
    if (hero.hp === 0) gameOver(state, events, 'poison');
  }
}

function isIndex(value, length) {
  return Number.isInteger(value) === true && value >= 0 && value < length;
}

function create(state, input, events) {
  if (typeof input.difficulty !== 'string' || Object.hasOwn(DIFFICULTIES, input.difficulty) === false) throw new InputError('difficulty');
  if (typeof input.cls !== 'string' || Object.hasOwn(CLASSES, input.cls) === false) throw new InputError('cls');
  const cls = CLASSES[input.cls];
  if (STARTING_WEAPONS[cls.family].includes(input.weapon) === false) throw new InputError('weapon');
  if (STARTING_SHIELDS[cls.family].includes(input.shield) === false) throw new InputError('shield');
  if (isIndex(input.first, FIRST_NAMES.length) === false || isIndex(input.epithet, EPITHETS.length) === false) throw new InputError('name');
  state.difficulty = input.difficulty;
  state.hero = {
    cls: cls.id,
    first: input.first,
    epithet: input.epithet,
    maxHp: cls.hp,
    hp: cls.hp,
    baseAtk: cls.atk,
    weapon: freshItem(WEAPONS[input.weapon]),
    shield: freshItem(SHIELDS[input.shield]),
    potions: ['small', 'small'],
    keycard: false,
  };
  state.gameMs += DURATIONS.create;
  events.push({ type: 'create', hero: structuredClone(state.hero), difficulty: state.difficulty });
  enterNode(state, events, START_NODE, 'start');
}

function enterNode(state, events, to, via) {
  const first = state.visited.includes(to) === false;
  state.from = state.node;
  state.node = to;
  if (first === true) {
    state.visited.push(to);
    if (via !== 'start') state.points.explore += SCORE.explore;
  }
  state.roomDamaged = false;
  if (via === 'door') state.gameMs += DURATIONS.door;
  else if (via === 'walk') state.gameMs += DURATIONS.walk;
  else if (via === 'room') state.gameMs += DURATIONS.room;
  else if (via === 'portal') state.gameMs += DURATIONS.portal;
  const secret = first === true && NODES[to].portalRoom === true ? SCORE.secret : 0;
  state.points.secret += secret;
  events.push({ type: 'enter', node: to, from: state.from, first, via, points: first === true && via !== 'start' ? SCORE.explore : 0, secret });
  runSteps(state, events);
}

function runSteps(state, events) {
  const node = NODES[state.node];
  const index = state.progress[node.id] ?? 0;
  if (index >= node.steps.length) {
    const trapPending = node.trapChest === true && state.trapChest !== 'open';
    if (state.cleared.includes(node.id) === false && trapPending === false) {
      state.cleared.push(node.id);
      const fought = node.steps.some((step) => COMBAT_STEPS.includes(step.type) === true);
      const flawless = fought === true && state.roomDamaged === false;
      const points = flawless === true ? SCORE.flawless : 0;
      state.points.flawless += points;
      if (fought === true) state.gameMs += DURATIONS.roomClear;
      events.push({ type: 'roomClear', node: node.id, fought, flawless, points });
    }
    toNav(state, events);
    return;
  }
  const step = node.steps[index];
  state.progress[node.id] = index + 1;
  if (step.type === 'fight') {
    state.queue = step.foes.map((id) => makeFoe(state, MONSTERS[id]));
    nextFoe(state, events);
  } else if (step.type === 'midboss') {
    state.gameMs += DURATIONS.midbossIntro;
    events.push({ type: 'midbossIntro' });
    state.queue = [makeFoe(state, MANAGER)];
    nextFoe(state, events);
  } else if (step.type === 'boss') {
    state.gameMs += DURATIONS.bossIntro;
    events.push({ type: 'reveal' });
    state.queue = [makeFoe(state, MOTH)];
    nextFoe(state, events);
  } else if (step.type === 'mimic') {
    state.gameMs += DURATIONS.mimic;
    events.push({ type: 'mimic' });
    state.queue = [makeFoe(state, MONSTERS.mimic)];
    nextFoe(state, events);
  } else if (step.type === 'arrows') {
    const rng = state.streams.arrows;
    const beats = VOLLEYS[step.volley].map((ms) => Math.round(ms * rng.range(0.96, 1.04)));
    state.volley = { beats };
    state.gameMs += DURATIONS.arrowsIntro;
    events.push({ type: 'arrowsStart', beats: [...beats] });
    state.phase = 'dodge';
  } else if (step.type === 'chest' || step.type === 'drop') {
    state.gameMs += DURATIONS.chest;
    const items = step.items.map((spec) => freshItem(resolveLoot(state, spec)));
    events.push({ type: step.type === 'chest' ? 'chestOpen' : 'drop', items: items.map((item) => ({ ...item })) });
    state.offers = items;
    nextOffer(state, events);
  } else {
    throw new InputError('step');
  }
}

function toNav(state, events) {
  state.foe = null;
  state.phase = 'nav';
  events.push({ type: 'nav' });
}

function makeFoe(state, def) {
  const boss = def.rank === 'midboss' || def.rank === 'boss';
  const hp = boss === true ? Math.round(def.hp * rules(state).boss) : foeHp(state, def.id, state.node);
  return {
    id: def.id,
    key: def.key ?? null,
    variant: def.variant ?? 'base',
    rank: def.rank,
    maxHp: hp,
    hp,
    armor: def.armor ?? 0,
    sweep: def.sweep,
    fade: def.fade === true,
    shake: def.shake === true,
    ambush: def.ambush === true,
    turn: 0,
    attacks: 0,
    enraged: false,
    raged: false,
    spawned: false,
    frenzy: false,
  };
}

function nextFoe(state, events) {
  const foe = state.queue.shift();
  state.foe = foe;
  state.lastFoe = foe.id;
  state.gameMs += DURATIONS.foeIntro;
  events.push({ type: 'foeAppear', foe: foeSummary(foe), returning: foe.turn > 0 });
  if (foe.ambush === true && foe.turn === 0) startAttack(state, events);
  else beginStrike(state);
}

function beginStrike(state) {
  const rng = state.streams.meter;
  const cls = CLASSES[state.hero.cls];
  let sweepMs = state.foe.sweep * rng.range(METER.sweepFactor[0], METER.sweepFactor[1]) * cls.sweep * rules(state).sweep;
  const dusted = state.dusted;
  if (dusted === true) sweepMs *= METER.dustedSweep;
  state.dusted = false;
  state.meter = {
    sweepMs: Math.round(sweepMs),
    zones: { crit: METER.zones.crit * cls.critZone, hit: METER.zones.hit },
    offset: rng.range(-METER.offset, METER.offset),
    fade: state.foe.fade,
    shake: state.foe.shake,
    dusted,
  };
  state.phase = 'strike';
}

function wearItem(state, slot, amount, events) {
  const hero = state.hero;
  const item = hero[slot];
  if (item.dur === null || amount <= 0) return false;
  item.dur = Math.max(0, item.dur - amount);
  if (item.dur > 0) return false;
  const broken = item.id;
  hero[slot] = slot === 'weapon' ? freshItem(WEAPONS.stick) : freshItem(SHIELDS[BASIC_SHIELD[CLASSES[hero.cls].family]]);
  state.counts.broken += 1;
  events.push({ type: 'break', slot, item: broken });
  return true;
}

function strike(state, input, events) {
  if (isValidTapMs(input.ms) === false) throw new InputError('ms');
  const ms = Math.round(input.ms);
  const { meter, foe, hero } = state;
  const cls = CLASSES[hero.cls];
  const zone = zoneForMs(ms, meter);
  state.gameMs += Math.min(ms, 12000) + DURATIONS.strikeResolve;
  state.timing.push((positionAt(ms, meter.sweepMs) - (0.5 + meter.offset)) * meter.sweepMs);
  state.counts.strikes += 1;
  const weapon = WEAPONS[hero.weapon.id];
  const base = SCORE[zone];
  let combo = 0;
  if (zone === 'crit') {
    state.streak += 1 + (weapon.streak ?? 0);
    state.counts.perfects += 1;
    combo = Math.round(base * SCORE.combo[Math.min(state.streak, SCORE.combo.length) - 1]) - base;
  } else {
    state.streak = 0;
  }
  state.points.strikes += base;
  state.points.combos += combo;
  const multiplier = zone === 'crit' ? cls.critMult : MULTIPLIERS[zone];
  const riposte = state.riposte;
  state.riposte = false;
  const raw = heroPower(hero) * multiplier * (riposte === true ? RIPOSTE : 1);
  const damage = Math.max(1, Math.round(raw) - foe.armor);
  foe.hp = Math.max(0, foe.hp - damage);
  const worn = hero.weapon.dur === null ? null : Math.max(0, hero.weapon.dur - rules(state).wear[zone]);
  events.push({ type: 'strike', zone, ms, damage, points: base + combo, streak: state.streak, riposte, foeHp: foe.hp, weapon: { ...hero.weapon, dur: worn } });
  wearItem(state, 'weapon', rules(state).wear[zone], events);
  if (foe.hp === 0) {
    killFoe(state, events);
    return;
  }
  if (bossPhase(state, events) === true) return;
  startAttack(state, events);
}

function bossPhase(state, events) {
  const foe = state.foe;
  if (foe.rank === 'midboss' && foe.raged === false && foe.hp <= foe.maxHp * MANAGER.rageAt) {
    foe.raged = true;
    foe.turn = 0;
    state.gameMs += DURATIONS.rage;
    events.push({ type: 'melon' });
    return false;
  }
  if (foe.rank !== 'boss') return false;
  if (foe.spawned === false && foe.hp <= foe.maxHp * MOTH.spawnAt) {
    foe.spawned = true;
    foe.enraged = true;
    state.gameMs += DURATIONS.spawn;
    const adds = MOTH.adds.map((id) => makeFoe(state, MONSTERS[id]));
    events.push({ type: 'spawn', count: adds.length });
    state.queue = [...adds, foe];
    nextFoe(state, events);
    return true;
  }
  if (foe.spawned === true && foe.frenzy === false && foe.hp <= foe.maxHp * MOTH.frenzyAt) {
    foe.frenzy = true;
    foe.turn = 0;
    state.gameMs += DURATIONS.frenzy;
    events.push({ type: 'frenzy' });
  }
  return false;
}

function chooseMove(state, foe) {
  if (foe.rank === 'midboss') {
    const list = foe.raged === true ? MANAGER.rage : MANAGER.calm;
    return MANAGER.moves[list[(foe.turn - 1) % list.length]];
  }
  if (foe.rank === 'boss') {
    const list = foe.frenzy === true ? MOTH.frenzy : MOTH.calm;
    return MOTH.moves[list[(foe.turn - 1) % list.length]];
  }
  const moves = MONSTERS[foe.id].moves;
  return moves.length === 1 ? moves[0] : moves[state.streams.attack.int(0, moves.length - 1)];
}

function startAttack(state, events) {
  const { foe, hero } = state;
  foe.turn += 1;
  foe.attacks += 1;
  const move = chooseMove(state, foe);
  const level = rules(state);
  let speed = level.tempo;
  let bonus = 0;
  if (foe.raged === true) {
    speed = MANAGER.rageSpeed * level.tempo;
    bonus = MANAGER.rageDamage;
  } else if (foe.enraged === true) {
    speed = MOTH.enragedSpeed * level.tempo;
    bonus = MOTH.enragedDamage;
  }
  const jitter = state.streams.attack.range(DEFENSE.approachJitter[0], DEFENSE.approachJitter[1]);
  const approach = Math.round(move.approach * speed * jitter);
  const beats = move.beats.map((offset) => approach + Math.round(offset * speed));
  const cls = CLASSES[hero.cls];
  const shield = SHIELDS[hero.shield.id];
  const windows = { perfect: Math.round(DEFENSE.parryMs * cls.parry * shield.parry * level.parry), good: Math.round(DEFENSE.blockMs * level.block) };
  const boss = foe.rank === 'midboss' || foe.rank === 'boss';
  const scale = boss === true ? level.bossDamage : level.damage * depthFactor(state, state.node, 0.7);
  state.attack = {
    move: move.id,
    beats,
    damage: Math.max(1, Math.round((move.damage + bonus) * scale)),
    heavy: move.heavy === true,
    poison: move.poison === true,
    dust: move.dust === true,
    projectile: move.projectile ?? null,
    line: move.line ?? null,
    windows,
  };
  if (move.line !== undefined) state.gameMs += DURATIONS.line;
  events.push({ type: 'attack', attack: { ...state.attack, beats: [...beats], windows: { ...windows } } });
  state.phase = 'defend';
}

function validTaps(taps) {
  if (Array.isArray(taps) === false || taps.length > MAX_TAPS) return false;
  return taps.every((tap) => typeof tap === 'number' && Number.isFinite(tap) === true && tap >= 0 && tap <= MAX_TAP_MS);
}

export function absorbOf(hero, heavy = false) {
  const absorb = Math.max(0, SHIELDS[hero.shield.id].absorb - CLASSES[hero.cls].blockPenalty);
  return heavy === true ? absorb / 2 : absorb;
}

function blockedDamage(state, attack) {
  return Math.ceil(attack.damage * (1 - absorbOf(state.hero, attack.heavy)) - 1e-9);
}

function defend(state, input, events) {
  if (validTaps(input.taps) === false) throw new InputError('taps');
  const { attack, hero } = state;
  const results = judgeBeats(attack.beats, input.taps, attack.windows, TAP_EXTRA.defend);
  const scored = state.foe.attacks <= SCORED_ATTACKS[state.foe.rank];
  const flailed = input.taps.length > attack.beats.length + TAP_EXTRA.defend;
  const outcomes = [];
  let total = 0;
  let blocked = false;
  for (const result of results) {
    if (hero.hp === 0) break;
    let damage = 0;
    let points = 0;
    if (result.grade === 'perfect') {
      state.counts.parries += 1;
      state.parryErrors.push(result.error);
      points = scored === true ? SCORE.parry : 0;
      state.riposte = true;
    } else if (result.grade === 'good') {
      state.counts.blocks += 1;
      points = scored === true ? SCORE.block : 0;
      damage = blockedDamage(state, attack);
      blocked = true;
    } else {
      state.counts.hits += 1;
      damage = attack.damage;
      if (attack.poison === true && state.poison === null) state.poison = { next: state.gameMs + POISON.firstMs, interval: POISON.firstMs, ticks: 0 };
      if (attack.dust === true) state.dusted = true;
    }
    damage = Math.min(damage, hero.hp);
    hero.hp -= damage;
    total += damage;
    state.points.defense += points;
    outcomes.push({ grade: result.grade, error: result.error, damage, points });
  }
  if (total > 0) state.roomDamaged = true;
  if (blocked === true) wearItem(state, 'shield', rules(state).shieldWear, events);
  state.gameMs += attack.beats[attack.beats.length - 1] + attack.windows.good + DURATIONS.defendResolve;
  events.push({ type: 'defend', results: outcomes, flailed, heroHp: hero.hp, shield: { ...hero.shield }, poisoned: state.poison !== null, dusted: state.dusted, riposte: state.riposte });
  state.attack = null;
  if (hero.hp === 0) {
    gameOver(state, events, state.foe.id);
    return;
  }
  continueAfterDamage(state, events, total, 'strike');
}

function continueAfterDamage(state, events, damage, resume) {
  const hero = state.hero;
  if (damage > 0 && hero.hp <= hero.maxHp * POTION_THRESHOLD && hero.potions.length > 0) {
    state.resume = resume;
    state.phase = 'potion';
    events.push({ type: 'potionPrompt', options: potionOptions(state) });
    return;
  }
  resumeTo(state, events, resume);
}

function resumeTo(state, events, resume) {
  if (resume === 'strike') beginStrike(state);
  else if (resume === 'offers') nextOffer(state, events);
  else runSteps(state, events);
}

function drinkPotion(state, id, events) {
  const hero = state.hero;
  const index = hero.potions.indexOf(id);
  hero.potions.splice(index, 1);
  const before = hero.hp;
  hero.hp = Math.min(hero.maxHp, hero.hp + healAmount(state, POTIONS[id].heal));
  const cured = state.poison !== null;
  state.poison = null;
  state.counts.potions += 1;
  state.gameMs += DURATIONS.drink;
  events.push({ type: 'drink', potion: id, healed: hero.hp - before, heroHp: hero.hp, potions: [...hero.potions], cured });
}

function potion(state, input, events) {
  if (potionOptions(state).includes(input.choice) === false) throw new InputError('choice');
  if (input.choice !== 'save') drinkPotion(state, input.choice, events);
  else events.push({ type: 'save' });
  const resume = state.resume;
  state.resume = null;
  resumeTo(state, events, resume);
}

function killFoe(state, events) {
  const foe = state.foe;
  const points = SCORE.kill[foe.rank];
  state.points.kills += points;
  state.counts.kills += 1;
  state.gameMs += DURATIONS.kill;
  events.push({ type: 'kill', foe: foeSummary(foe), points });
  if (foe.rank === 'boss') {
    victory(state, events);
    return;
  }
  if (state.queue.length > 0) {
    nextFoe(state, events);
    return;
  }
  state.foe = null;
  runSteps(state, events);
}

function nextOffer(state, events) {
  while (state.offers.length > 0 && state.offers[0].slot === 'key') {
    state.offers.shift();
    state.hero.keycard = true;
    events.push({ type: 'take', item: { id: KEYCARD.id, slot: 'key', dur: null } });
  }
  if (state.offers.length === 0) {
    state.offer = null;
    runSteps(state, events);
    return;
  }
  state.offer = state.offers.shift();
  state.gameMs += DURATIONS.offer;
  events.push({ type: 'offer', item: { ...state.offer }, canTake: canTake(state, state.offer) });
  state.phase = 'loot';
}

function takeItem(state, item, events) {
  const hero = state.hero;
  const floor = floorOf(state, state.node);
  let dropped = null;
  if (item.slot === 'weapon') {
    if (hero.weapon.id !== 'stick') dropped = hero.weapon;
    hero.weapon = item;
  } else if (item.slot === 'shield') {
    if (SHIELDS[hero.shield.id].durability !== null) dropped = hero.shield;
    hero.shield = item;
  } else {
    hero.potions.push(item.id);
  }
  if (dropped !== null) floor.push(dropped);
  state.gameMs += DURATIONS.take;
  events.push({ type: 'take', item: { ...item }, dropped: dropped === null ? null : { ...dropped }, potions: [...hero.potions] });
}

function loot(state, input, events) {
  const item = state.offer;
  if (input.choice !== 'take' && input.choice !== 'leave') throw new InputError('choice');
  if (input.choice === 'take' && canTake(state, item) === false) throw new InputError('full');
  if (input.choice === 'take') takeItem(state, item, events);
  else {
    floorOf(state, state.node).push(item);
    events.push({ type: 'leave', item: { ...item } });
  }
  nextOffer(state, events);
}

function via(from, to) {
  if (NODES[from].portalRoom === true || NODES[to].portalRoom === true) return 'portal';
  const a = NODES[from].area;
  const b = NODES[to].area;
  if (a === 'street' && b === 'street') return 'walk';
  if (a === 'street' || b === 'street') return 'door';
  return 'room';
}

function nav(state, input, events) {
  const options = navOptions(state);
  const hero = state.hero;
  if (input.action === 'go') {
    const option = options.find((candidate) => candidate.action === 'go' && candidate.to === input.to);
    if (option === undefined) throw new InputError('to');
    if (option.locked === true) throw new InputError('locked');
    enterNode(state, events, input.to, via(state.node, input.to));
    return;
  }
  if (input.action === 'drink') {
    if (options.some((candidate) => candidate.action === 'drink' && candidate.potion === input.potion) === false) throw new InputError('potion');
    drinkPotion(state, input.potion, events);
    return;
  }
  if (input.action === 'take') {
    const floor = floorOf(state, state.node);
    if (isIndex(input.index, floor.length) === false) throw new InputError('index');
    const item = floor[input.index];
    if (canTake(state, item) === false) throw new InputError('full');
    floor.splice(input.index, 1);
    takeItem(state, item, events);
    return;
  }
  if (input.action === 'coffee') {
    if (options.some((candidate) => candidate.action === 'coffee') === false) throw new InputError('coffee');
    const before = hero.hp;
    hero.hp = Math.min(hero.maxHp, hero.hp + healAmount(state, hero.maxHp * COFFEE_HEAL));
    state.coffee = 'used';
    state.gameMs += DURATIONS.coffee;
    events.push({ type: 'coffee', healed: hero.hp - before, heroHp: hero.hp });
    return;
  }
  if (input.action === 'pet') {
    if (options.some((candidate) => candidate.action === 'pet') === false) throw new InputError('pet');
    const before = hero.hp;
    hero.hp = Math.min(hero.maxHp, hero.hp + healAmount(state, CAT_HEAL));
    state.cat = 'petted';
    state.gameMs += DURATIONS.pet;
    events.push({ type: 'pet', healed: hero.hp - before, heroHp: hero.hp });
    return;
  }
  if (input.action === 'open') {
    if (options.some((candidate) => candidate.action === 'open') === false) throw new InputError('open');
    startHorde(state, events);
    return;
  }
  throw new InputError('action');
}

function startHorde(state, events) {
  const rng = state.streams.horde;
  const beats = [];
  const sides = [];
  let at = HORDE.firstMs;
  for (let index = 0; index < HORDE.count; index++) {
    beats.push(Math.round(at));
    sides.push(rng.chance(0.5) === true ? 'left' : 'right');
    const ratio = index / (HORDE.count - 1);
    at += (HORDE.intervals[0] + (HORDE.intervals[1] - HORDE.intervals[0]) * ratio) * rng.range(0.92, 1.08);
  }
  state.trapChest = 'sprung';
  state.horde = { beats, sides };
  state.roomDamaged = false;
  state.gameMs += DURATIONS.hordeIntro;
  events.push({ type: 'hordeStart', beats: [...beats], sides: [...sides] });
  state.phase = 'horde';
}

function horde(state, input, events) {
  if (validTaps(input.taps) === false) throw new InputError('taps');
  const hero = state.hero;
  const beats = state.horde.beats;
  const results = judgeBeats(beats, input.taps, { perfect: HORDE.perfectMs, good: HORDE.goodMs }, TAP_EXTRA.horde);
  const flailed = input.taps.length > beats.length + TAP_EXTRA.horde;
  const outcomes = [];
  let total = 0;
  for (const result of results) {
    if (hero.hp === 0) break;
    const points = SCORE.horde[result.grade];
    let damage = 0;
    if (result.grade === 'perfect') state.counts.hordePerfect += 1;
    else if (result.grade === 'good') state.counts.hordeGood += 1;
    else {
      state.counts.hordeMiss += 1;
      damage = Math.min(trapDamage(state, HORDE.bite), hero.hp);
    }
    hero.hp -= damage;
    total += damage;
    state.points.horde += points;
    outcomes.push({ grade: result.grade, error: result.error, damage, points });
  }
  state.gameMs += beats[beats.length - 1] + HORDE.goodMs + DURATIONS.hordeResolve;
  if (total > 0) state.roomDamaged = true;
  const survived = hero.hp > 0;
  const bonus = survived === true ? SCORE.hordeClear : 0;
  state.points.horde += bonus;
  if (survived === true) state.counts.kills += HORDE.count;
  events.push({ type: 'horde', results: outcomes, flailed, heroHp: hero.hp, survived, bonus });
  state.horde = null;
  if (survived === false) {
    gameOver(state, events, 'horde');
    return;
  }
  state.trapChest = 'open';
  state.coffee = 'ready';
  state.offers = HORDE_REWARD.map((spec) => freshItem(resolveLoot(state, spec)));
  events.push({ type: 'chestOpen', items: state.offers.map((item) => ({ ...item })) });
  if (total > 0 && hero.hp <= hero.maxHp * POTION_THRESHOLD && hero.potions.length > 0) {
    state.resume = 'offers';
    state.phase = 'potion';
    events.push({ type: 'potionPrompt', options: potionOptions(state) });
    return;
  }
  nextOffer(state, events);
}

function dodge(state, input, events) {
  if (validTaps(input.taps) === false) throw new InputError('taps');
  const hero = state.hero;
  const beats = state.volley.beats;
  const results = judgeBeats(beats, input.taps, { perfect: DODGE.perfectMs, good: DODGE.goodMs }, TAP_EXTRA.dodge);
  const flailed = input.taps.length > beats.length + TAP_EXTRA.dodge;
  const outcomes = [];
  let total = 0;
  for (const result of results) {
    if (hero.hp === 0) break;
    let damage = 0;
    let points = 0;
    if (result.grade === 'miss') {
      state.counts.arrowHits += 1;
      damage = Math.min(trapDamage(state, DODGE.damage), hero.hp);
    } else {
      state.counts.dodges += 1;
      points = result.grade === 'perfect' ? SCORE.dodgePerfect : SCORE.dodge;
    }
    hero.hp -= damage;
    total += damage;
    state.points.dodges += points;
    outcomes.push({ grade: result.grade, error: result.error, damage, points });
  }
  if (total > 0) state.roomDamaged = true;
  state.gameMs += beats[beats.length - 1] + DODGE.goodMs + DURATIONS.dodgeResolve;
  events.push({ type: 'dodge', results: outcomes, flailed, heroHp: hero.hp });
  state.volley = null;
  if (hero.hp === 0) {
    gameOver(state, events, 'arrow');
    return;
  }
  continueAfterDamage(state, events, total, 'steps');
}

function victory(state, events) {
  state.outcome = 'victory';
  state.phase = 'done';
  state.foe = null;
  state.gameMs += DURATIONS.victory;
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
    { id: 'strikes', points: state.points.strikes },
    { id: 'combos', points: state.points.combos },
    { id: 'defense', points: state.points.defense },
    { id: 'dodges', points: state.points.dodges },
    { id: 'horde', points: state.points.horde },
    { id: 'kills', points: state.points.kills },
    { id: 'flawless', points: state.points.flawless },
    { id: 'explore', points: state.points.explore },
    { id: 'secret', points: state.points.secret },
    { id: 'hp', points: won === true ? state.hero.hp * SCORE.hpPoint : 0 },
    { id: 'time', points: won === true ? Math.max(0, Math.round((SCORE.timeBaseSeconds - seconds) * SCORE.timePoint)) : 0 },
  ];
  const subtotal = lines.reduce((sum, line) => sum + line.points, 0);
  lines.push({ id: 'difficulty', points: Math.round(subtotal * (DIFFICULTIES[state.difficulty].score - 1)) });
  return { total: lines.reduce((sum, line) => sum + line.points, 0), lines, seconds, outcome: state.outcome, difficulty: state.difficulty };
}

import {
  CLASSES,
  ITEMS,
  POTIONS,
  CLASS_ITEMS,
  LEGENDARY_ITEM,
  MONSTERS,
  FIRST_NAMES,
  EPITHETS,
  DRAGON_NAMES,
  DRAGON_TITLES,
  EPITAPHS,
} from './content.js';

export const TUNING = {
  legendaryChance: 0.05,
  legendaryAtk: 2,
  legendaryHp: 4,
  zones: {
    fight: { crit: 0.1, hit: 0.55 },
    boss: { crit: 0.1, hit: 0.55 },
    enraged: { crit: 0.08, hit: 0.55 },
  },
  sweepMs: { fight: 900, boss: 800, enraged: 620 },
  multipliers: { glance: 0.25, hit: 1, crit: 3 },
  monsterHpFactor: [1.7, 2],
  monsterAtk: [2, 3],
  dragonHpFactor: 6,
  dragonAtk: [3, 4],
  enrageBonus: 1,
  mimicChance: 0.05,
  mimicBite: 2,
  potionThreshold: 0.35,
  rank: { S: 0.5, A: 0.3, B: 0.1 },
};

const RANK_ORDER = ['C', 'B', 'A', 'S'];

export function createRng(seed) {
  let state = seed >>> 0;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    pick: (list) => list[Math.floor(next() * list.length)],
    chance: (probability) => next() < probability,
    range: (min, max) => min + next() * (max - min),
  };
}

export function rollHero(rng) {
  const cls = rng.chance(0.5) ? 'warrior' : 'wizard';
  const def = CLASSES[cls];
  const legendary = rng.chance(TUNING.legendaryChance);
  const baseAtk = rng.int(def.atk[0], def.atk[1]);
  const maxHp = rng.int(def.hp[0], def.hp[1]) + (legendary === true ? TUNING.legendaryHp : 0);
  const firstName = rng.pick(FIRST_NAMES);
  const epithet = rng.pick(EPITHETS);
  return {
    cls,
    name: `${firstName} ${epithet}`,
    firstName,
    epithetIndex: EPITHETS.indexOf(epithet),
    legendary,
    baseAtk,
    atk: baseAtk + (legendary === true ? TUNING.legendaryAtk : 0),
    maxHp,
    hp: maxHp,
    item: ITEMS.woodenStick,
    potion: null,
  };
}

export function rollMonster(rng, hero) {
  const def = rng.pick(MONSTERS);
  const factor = rng.range(TUNING.monsterHpFactor[0], TUNING.monsterHpFactor[1]);
  const maxHp = Math.max(1, Math.min(2 * hero.baseAtk, Math.round(hero.baseAtk * factor)));
  return { kind: 'monster', ...def, maxHp, hp: maxHp, atk: TUNING.monsterAtk };
}

export function rollDragon(rng, hero) {
  const maxHp = hero.baseAtk * TUNING.dragonHpFactor;
  return {
    kind: 'dragon',
    id: 'dragon',
    name: rng.pick(DRAGON_NAMES),
    title: rng.pick(DRAGON_TITLES),
    get titleIndex() {
      return DRAGON_TITLES.indexOf(this.title);
    },
    maxHp,
    hp: maxHp,
    segment: hero.baseAtk,
    atk: TUNING.dragonAtk,
  };
}

export function rollChest(rng, hero) {
  const mimic = rng.chance(TUNING.mimicChance);
  const face = rng.int(1, 6);
  const own = CLASS_ITEMS[hero.cls];
  if (face === 6) {
    return { mimic, face, rarity: 'legendary', item: ITEMS[LEGENDARY_ITEM[hero.cls]], potion: POTIONS.large };
  }
  if (face === 5) {
    return { mimic, face, rarity: 'epic', item: ITEMS[rng.pick(own)], potion: POTIONS.small };
  }
  if (face === 4) {
    return { mimic, face, rarity: 'rare', item: ITEMS[rng.pick(own)], potion: null };
  }
  if (face === 3) {
    return { mimic, face, rarity: 'uncommon', item: null, potion: rng.chance(0.5) ? POTIONS.small : POTIONS.large };
  }
  return { mimic, face, rarity: 'common', item: null, potion: null };
}

export function applyLoot(hero, loot) {
  if (loot.item !== null) hero.item = loot.item;
  if (loot.potion !== null) hero.potion = loot.potion;
}

export function mimicBite(hero) {
  const damage = Math.max(0, Math.min(TUNING.mimicBite, hero.hp - 1));
  hero.hp -= damage;
  return damage;
}

export function zoneAt(position, zones) {
  const distance = Math.abs(position - 0.5) - 1e-9;
  if (distance <= zones.crit / 2) return 'crit';
  if (distance <= (zones.crit + zones.hit) / 2) return 'hit';
  return 'glance';
}

export function strikeDamage(hero, zone) {
  return Math.max(1, Math.round((hero.atk + hero.item.bonus) * TUNING.multipliers[zone]));
}

export function heroStrike(hero, foe, zone) {
  const damage = strikeDamage(hero, zone);
  foe.hp = Math.max(0, foe.hp - damage);
  return { zone, damage, killed: foe.hp === 0 };
}

export function isEnraged(foe) {
  return foe.kind === 'dragon' && foe.hp <= foe.maxHp / 2;
}

export function foeCounter(rng, foe, hero) {
  const damage = rng.int(foe.atk[0], foe.atk[1]) + (isEnraged(foe) === true ? TUNING.enrageBonus : 0);
  hero.hp = Math.max(0, hero.hp - damage);
  const killed = hero.hp === 0;
  return { damage, killed, potion: killed === true ? null : drinkPotionIfLow(hero) };
}

function drinkPotionIfLow(hero) {
  if (hero.potion === null || hero.hp > hero.maxHp * TUNING.potionThreshold) return null;
  const potion = hero.potion;
  const before = hero.hp;
  hero.hp = Math.min(hero.maxHp, hero.hp + potion.heal);
  hero.potion = null;
  return { potion, healed: hero.hp - before };
}

export function meterFor(foe) {
  const key = foe.kind === 'monster' ? 'fight' : isEnraged(foe) === true ? 'enraged' : 'boss';
  return { zones: TUNING.zones[key], sweepMs: TUNING.sweepMs[key] };
}

export function rankFor(crits, strikes) {
  const ratio = strikes > 0 ? crits / strikes : 0;
  if (ratio >= TUNING.rank.S) return 'S';
  if (ratio >= TUNING.rank.A) return 'A';
  if (ratio >= TUNING.rank.B) return 'B';
  return 'C';
}

export function isBetterRecord(candidate, stored) {
  if (stored === null) return true;
  const candidateRank = RANK_ORDER.indexOf(candidate.rank);
  const storedRank = RANK_ORDER.indexOf(stored.rank);
  if (candidateRank !== storedRank) return candidateRank > storedRank;
  return candidate.timeMs < stored.timeMs;
}

export function epitaphFor(rng, hero) {
  return rng.pick(EPITAPHS).replaceAll('{name}', hero.name).replaceAll('{item}', hero.item.name);
}

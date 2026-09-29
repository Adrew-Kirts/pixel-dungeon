import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  TUNING,
  createRng,
  rollHero,
  rollMonster,
  rollDragon,
  rollChest,
  applyLoot,
  mimicBite,
  zoneAt,
  strikeDamage,
  heroStrike,
  foeCounter,
  isEnraged,
  meterFor,
  rankFor,
  isBetterRecord,
  epitaphFor,
} from '../src/rules.js';
import { CLASSES, ITEMS, POTIONS, FIRST_NAMES, EPITHETS, DRAGON_TITLES } from '../src/content.js';

function stubRng({ face = 1, chance = false, pick = 0, int = null } = {}) {
  return {
    next: () => 0.5,
    int: (min, max) => (min === 1 && max === 6 ? face : int ?? min),
    pick: (list) => list[pick % list.length],
    chance: () => chance,
    range: (min) => min,
  };
}

function heroOf(overrides = {}) {
  return {
    cls: 'warrior',
    name: 'Test Hero',
    legendary: false,
    baseAtk: 6,
    atk: 6,
    maxHp: 28,
    hp: 28,
    item: ITEMS.woodenStick,
    potion: null,
    ...overrides,
  };
}

test('same seed produces the same hero', () => {
  assert.deepEqual(rollHero(createRng(42)), rollHero(createRng(42)));
});

test('different seeds produce varied heroes', () => {
  const names = new Set();
  for (let seed = 1; seed <= 50; seed++) names.add(rollHero(createRng(seed)).name);
  assert.ok(names.size > 20);
});

test('rng int stays within inclusive bounds and hits both ends', () => {
  const rng = createRng(7);
  const seen = new Set();
  for (let i = 0; i < 2000; i++) {
    const value = rng.int(3, 5);
    assert.ok(value >= 3 && value <= 5);
    seen.add(value);
  }
  assert.deepEqual([...seen].sort(), [3, 4, 5]);
});

test('hero stats stay within class ranges', () => {
  for (let seed = 1; seed <= 2000; seed++) {
    const hero = rollHero(createRng(seed));
    const def = CLASSES[hero.cls];
    const hpBonus = hero.legendary === true ? TUNING.legendaryHp : 0;
    assert.ok(hero.baseAtk >= def.atk[0] && hero.baseAtk <= def.atk[1]);
    assert.ok(hero.maxHp - hpBonus >= def.hp[0] && hero.maxHp - hpBonus <= def.hp[1]);
    assert.equal(hero.hp, hero.maxHp);
    assert.equal(hero.item, ITEMS.woodenStick);
    assert.equal(hero.potion, null);
  }
});

test('both classes appear', () => {
  const classes = new Set();
  for (let seed = 1; seed <= 100; seed++) classes.add(rollHero(createRng(seed)).cls);
  assert.deepEqual([...classes].sort(), ['warrior', 'wizard']);
});

test('legendary adds attack and health without touching baseAtk', () => {
  let legendaryCount = 0;
  for (let seed = 1; seed <= 4000; seed++) {
    const hero = rollHero(createRng(seed));
    if (hero.legendary === true) {
      legendaryCount++;
      assert.equal(hero.atk, hero.baseAtk + TUNING.legendaryAtk);
    } else {
      assert.equal(hero.atk, hero.baseAtk);
    }
  }
  assert.ok(legendaryCount > 4000 * 0.03 && legendaryCount < 4000 * 0.07);
});

test('zoneAt resolves the centre as critical', () => {
  const zones = { crit: 0.1, hit: 0.5 };
  assert.equal(zoneAt(0.5, zones), 'crit');
  assert.equal(zoneAt(0.45, zones), 'crit');
  assert.equal(zoneAt(0.55, zones), 'crit');
});

test('zoneAt resolves the middle band as hit', () => {
  const zones = { crit: 0.1, hit: 0.5 };
  assert.equal(zoneAt(0.4499, zones), 'hit');
  assert.equal(zoneAt(0.5501, zones), 'hit');
  assert.equal(zoneAt(0.2, zones), 'hit');
  assert.equal(zoneAt(0.8, zones), 'hit');
});

test('zoneAt resolves the outer bands as glance', () => {
  const zones = { crit: 0.1, hit: 0.5 };
  assert.equal(zoneAt(0.1999, zones), 'glance');
  assert.equal(zoneAt(0.8001, zones), 'glance');
  assert.equal(zoneAt(0, zones), 'glance');
  assert.equal(zoneAt(1, zones), 'glance');
});

test('strike damage applies zone multipliers and item bonus', () => {
  const hero = heroOf({ atk: 6, item: ITEMS.lightbringer });
  assert.equal(strikeDamage(hero, 'hit'), 10);
  assert.equal(strikeDamage(hero, 'crit'), 30);
  assert.equal(strikeDamage(hero, 'glance'), Math.round(10 * TUNING.multipliers.glance));
});

test('strike damage is never below one', () => {
  const hero = heroOf({ atk: 0 });
  assert.equal(strikeDamage(hero, 'glance'), 1);
});

test('two hits or one critical always kill the fight monster', () => {
  for (let seed = 1; seed <= 2000; seed++) {
    const rng = createRng(seed);
    const hero = rollHero(rng);
    const monster = rollMonster(rng, hero);
    assert.equal(monster.kind, 'monster');
    assert.ok(monster.maxHp <= 2 * hero.baseAtk);
    assert.ok(strikeDamage(hero, 'crit') >= monster.maxHp);
    assert.ok(strikeDamage(hero, 'hit') * 2 >= monster.maxHp);
  }
});

test('heroStrike lowers foe hp, clamps at zero and reports the kill', () => {
  const hero = heroOf({ atk: 6 });
  const foe = { kind: 'monster', maxHp: 10, hp: 10, atk: [2, 3] };
  assert.deepEqual(heroStrike(hero, foe, 'hit'), { zone: 'hit', damage: 6, killed: false });
  assert.equal(foe.hp, 4);
  assert.deepEqual(heroStrike(hero, foe, 'crit'), { zone: 'crit', damage: 18, killed: true });
  assert.equal(foe.hp, 0);
});

test('dragon hp scales on baseAtk only', () => {
  const plain = heroOf({ baseAtk: 6, atk: 6 });
  const geared = heroOf({ baseAtk: 6, atk: 8, legendary: true, item: ITEMS.lightbringer });
  const dragon = rollDragon(stubRng(), plain);
  assert.equal(dragon.kind, 'dragon');
  assert.equal(dragon.maxHp, 6 * TUNING.dragonHpFactor);
  assert.equal(rollDragon(stubRng(), geared).maxHp, dragon.maxHp);
  assert.equal(dragon.segment, 6);
  assert.equal(typeof dragon.name, 'string');
  assert.equal(typeof dragon.title, 'string');
});

test('chest faces map to the original d6 table for warriors', () => {
  const hero = heroOf({ cls: 'warrior' });
  const six = rollChest(stubRng({ face: 6 }), hero);
  assert.equal(six.rarity, 'legendary');
  assert.equal(six.item, ITEMS.lightbringer);
  assert.equal(six.potion, POTIONS.large);
  const five = rollChest(stubRng({ face: 5, pick: 0 }), hero);
  assert.equal(five.rarity, 'epic');
  assert.equal(five.item, ITEMS.morningStar);
  assert.equal(five.potion, POTIONS.small);
  const four = rollChest(stubRng({ face: 4, pick: 1 }), hero);
  assert.equal(four.rarity, 'rare');
  assert.equal(four.item, ITEMS.lightbringer);
  assert.equal(four.potion, null);
  const three = rollChest(stubRng({ face: 3, chance: false }), hero);
  assert.equal(three.rarity, 'uncommon');
  assert.equal(three.item, null);
  assert.ok(three.potion === POTIONS.small || three.potion === POTIONS.large);
  for (const face of [1, 2]) {
    const low = rollChest(stubRng({ face }), hero);
    assert.equal(low.rarity, 'common');
    assert.equal(low.item, null);
    assert.equal(low.potion, null);
  }
});

test('chest gives spells to wizards', () => {
  const hero = heroOf({ cls: 'wizard' });
  assert.equal(rollChest(stubRng({ face: 6 }), hero).item, ITEMS.fireball);
  assert.equal(rollChest(stubRng({ face: 4, pick: 0 }), hero).item, ITEMS.lightningBolt);
});

test('chest reports the rolled face and mimic flag', () => {
  const loot = rollChest(stubRng({ face: 4, chance: true }), heroOf());
  assert.equal(loot.face, 4);
  assert.equal(loot.mimic, true);
});

test('applyLoot equips the item and potion it contains', () => {
  const hero = heroOf();
  applyLoot(hero, { item: ITEMS.morningStar, potion: POTIONS.small });
  assert.equal(hero.item, ITEMS.morningStar);
  assert.equal(hero.potion, POTIONS.small);
  applyLoot(hero, { item: null, potion: null });
  assert.equal(hero.item, ITEMS.morningStar);
  assert.equal(hero.potion, POTIONS.small);
});

test('mimic bite hurts but never kills', () => {
  const hero = heroOf({ hp: 10 });
  assert.equal(mimicBite(hero), TUNING.mimicBite);
  assert.equal(hero.hp, 10 - TUNING.mimicBite);
  const weak = heroOf({ hp: 1 });
  assert.equal(mimicBite(weak), 0);
  assert.equal(weak.hp, 1);
  const two = heroOf({ hp: 2 });
  mimicBite(two);
  assert.equal(two.hp, 1);
});

test('foe counter damages the hero within its attack range', () => {
  const hero = heroOf({ hp: 28 });
  const foe = { kind: 'monster', maxHp: 10, hp: 10, atk: [2, 3] };
  const result = foeCounter(stubRng(), foe, hero);
  assert.equal(result.damage, 2);
  assert.equal(hero.hp, 26);
  assert.equal(result.killed, false);
  assert.equal(result.potion, null);
});

test('enraged dragon hits one harder', () => {
  const hero = heroOf({ hp: 28 });
  const dragon = { kind: 'dragon', maxHp: 36, hp: 18, atk: [3, 4] };
  assert.equal(isEnraged(dragon), true);
  assert.equal(foeCounter(stubRng(), dragon, hero).damage, 3 + TUNING.enrageBonus);
  dragon.hp = 19;
  assert.equal(isEnraged(dragon), false);
});

test('monsters never enrage', () => {
  assert.equal(isEnraged({ kind: 'monster', maxHp: 10, hp: 1 }), false);
});

test('potion is drunk after damage at or under the threshold', () => {
  const hero = heroOf({ maxHp: 20, hp: 10, potion: POTIONS.large });
  const foe = { kind: 'monster', maxHp: 10, hp: 10, atk: [3, 3] };
  const result = foeCounter(stubRng(), foe, hero);
  assert.equal(result.damage, 3);
  assert.deepEqual(result.potion, { potion: POTIONS.large, healed: POTIONS.large.heal });
  assert.equal(hero.hp, 7 + POTIONS.large.heal);
  assert.equal(hero.potion, null);
});

test('potion is kept while hp is above the threshold', () => {
  const hero = heroOf({ maxHp: 20, hp: 15, potion: POTIONS.small });
  const foe = { kind: 'monster', maxHp: 10, hp: 10, atk: [3, 3] };
  assert.equal(foeCounter(stubRng(), foe, hero).potion, null);
  assert.equal(hero.potion, POTIONS.small);
});

test('potion cannot save a hero reduced to zero', () => {
  const hero = heroOf({ maxHp: 20, hp: 3, potion: POTIONS.large });
  const foe = { kind: 'monster', maxHp: 10, hp: 10, atk: [3, 3] };
  const result = foeCounter(stubRng(), foe, hero);
  assert.equal(result.killed, true);
  assert.equal(result.potion, null);
  assert.equal(hero.hp, 0);
});

test('potion healing is capped at max hp', () => {
  const hero = heroOf({ maxHp: 10, hp: 5, potion: POTIONS.large });
  const foe = { kind: 'monster', maxHp: 10, hp: 10, atk: [2, 2] };
  const result = foeCounter(stubRng(), foe, hero);
  assert.equal(hero.hp, 10);
  assert.equal(result.potion.healed, 7);
});

test('meter config follows foe type and enrage', () => {
  assert.deepEqual(meterFor({ kind: 'monster', maxHp: 10, hp: 10 }), {
    zones: TUNING.zones.fight,
    sweepMs: TUNING.sweepMs.fight,
  });
  const dragon = { kind: 'dragon', maxHp: 36, hp: 36 };
  assert.equal(meterFor(dragon).sweepMs, TUNING.sweepMs.boss);
  dragon.hp = 18;
  assert.equal(meterFor(dragon).sweepMs, TUNING.sweepMs.enraged);
  assert.equal(meterFor(dragon).zones.crit, TUNING.zones.enraged.crit);
});

test('rank follows the critical ratio thresholds', () => {
  assert.equal(rankFor(4, 8), 'S');
  assert.equal(rankFor(3, 10), 'A');
  assert.equal(rankFor(1, 10), 'B');
  assert.equal(rankFor(0, 10), 'C');
  assert.equal(rankFor(0, 0), 'C');
});

test('records compare by rank first, then time', () => {
  assert.equal(isBetterRecord({ rank: 'A', timeMs: 20000 }, null), true);
  assert.equal(isBetterRecord({ rank: 'A', timeMs: 20000 }, { rank: 'B', timeMs: 9000 }), true);
  assert.equal(isBetterRecord({ rank: 'B', timeMs: 9000 }, { rank: 'A', timeMs: 20000 }), false);
  assert.equal(isBetterRecord({ rank: 'A', timeMs: 15000 }, { rank: 'A', timeMs: 16000 }), true);
  assert.equal(isBetterRecord({ rank: 'A', timeMs: 17000 }, { rank: 'A', timeMs: 16000 }), false);
});

test('epitaph names the hero and their item', () => {
  const text = epitaphFor(stubRng(), heroOf({ name: 'Sir Davos the Damp' }));
  assert.ok(text.includes('Sir Davos the Damp'));
  assert.ok(!text.includes('{'));
});

test('heroes keep their first name and epithet index for translation', () => {
  for (let seed = 1; seed <= 50; seed++) {
    const hero = rollHero(createRng(seed));
    assert.equal(hero.name, `${hero.firstName} ${EPITHETS[hero.epithetIndex]}`);
    assert.equal(FIRST_NAMES.includes(hero.firstName), true);
  }
});

test('dragons keep their title index for translation', () => {
  const dragon = rollDragon(createRng(3), heroOf());
  assert.equal(DRAGON_TITLES[dragon.titleIndex], dragon.title);
});

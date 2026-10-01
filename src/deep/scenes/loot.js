import { t } from '../../i18n.js';
import { center, top } from '../../scenes/common.js';
import { el, append } from '../../ui/dom.js';
import { applyIcon } from '../../ui/icons.js';
import { itemDetail } from '../../ui/deep/nav.js';
import { updateWeapon, updateShield, updatePotions } from '../../ui/deep/gear.js';
import { WEAPONS, DIFFICULTIES } from '../content.js';
import { propScreenX } from '../rooms.js';
import { itemDef } from '../engine.js';
import { keyed, lumiSay } from './common.js';
import { keycardTaken } from './world.js';

const TIER_COLORS = { basic: '#8b9bb4', common: '#c0cbdc', rare: '#3aa8ff', epic: '#d176d0', legendary: '#feae34' };

export function itemKey(item) {
  return itemDef(item).key;
}

export async function chestOpen(scene, event) {
  const { game } = scene;
  const { world, scheduler, audio, effects, camera } = game;
  const chest = world.chest;
  if (scene.state.node !== 'c1') {
    Object.assign(chest, { key: 'tile:89', anchor: 0.6, height: 16, shadow: 7, dx: 0, dy: -40, rot: 0, alpha: 1, visible: true, idle: false, variant: 'base' });
    audio.sfx.whoosh();
    await scheduler.tween(chest, { dy: 0 }, 300, 'inQuad');
    audio.sfx.thud();
    camera.shake(1, 140);
    for (let shake = 0; shake < 2; shake++) {
      audio.sfx.chestShake();
      await scheduler.tween(chest, { rot: 0.12 }, 60, 'outQuad');
      await scheduler.tween(chest, { rot: -0.12 }, 60, 'outQuad');
    }
    chest.rot = 0;
  }
  chest.key = 'tile:91';
  chest.visible = true;
  audio.sfx.chestOpen();
  const tier = itemDef(event.items[0]).tier;
  const color = TIER_COLORS[tier] ?? '#fee761';
  camera.flash(color, 0.2, 240);
  const point = center(game, chest);
  effects.sparkle(point.x, point.y - 6, [color, '#ffffff', '#fee761'], 24);
  scene.rays = effects.rays(point.x, point.y - 4);
  await scheduler.wait(300);
}

export async function drop(scene, event) {
  const { game } = scene;
  const point = scene.lastFoePoint ?? { x: game.view.W * 0.72, y: game.view.groundY - 10 };
  game.effects.sparkle(point.x, point.y, ['#fee761', '#ffffff'], 16);
  game.audio.sfx.item();
  await game.scheduler.wait(300);
}

function compare(state, item) {
  const hero = state.hero;
  if (item.slot === 'weapon') return { current: hero.weapon, label: t('deep.loot.vsWeapon', { item: t(`deep.item.${hero.weapon.id}`), detail: itemDetail(hero.weapon) }) };
  if (item.slot === 'shield') return { current: hero.shield, label: t('deep.loot.vsShield', { item: t(`deep.item.${hero.shield.id}`), detail: itemDetail(hero.shield) }) };
  return { current: null, label: t('deep.loot.bag', { n: hero.potions.length, max: DIFFICULTIES[state.difficulty].potions }) };
}

function lootCard(state, need) {
  const item = need.item;
  const def = itemDef(item);
  const card = el('div', `panel-card loot-offer tier-${def.tier}`);
  const icon = el('span', 'px-icon offer-icon');
  applyIcon(icon, def.key, 4);
  const versus = compare(state, item);
  const swap = item.slot !== 'potion' && versus.current !== null && versus.current.dur !== null;
  const take = el('button', 'btn btn-primary');
  if (swap === true) append(take, append(el('span', 'btn-stack'), el('span', '', t('deep.loot.swap')), el('small', '', t('deep.loot.swapSub'))));
  else take.textContent = item.slot === 'potion' ? t('deep.loot.takePotion') : t('deep.loot.take');
  take.type = 'button';
  take.dataset.choice = 'take';
  take.dataset.key = '1';
  if (need.canTake === false) {
    take.dataset.locked = 'true';
    take.classList.remove('btn-primary');
  }
  const leave = el('button', need.canTake === false ? 'btn btn-primary' : 'btn', t('deep.loot.leave'));
  leave.type = 'button';
  leave.dataset.choice = 'leave';
  leave.dataset.key = '2';
  append(
    card,
    el('p', 'eyebrow', t(`deep.tier.${def.tier}`)),
    icon,
    el('h2', 'panel-title', t(`deep.item.${item.id}`)),
    el('p', 'offer-detail', itemDetail(item, state)),
    el('p', 'offer-perk', t(`deep.item.${item.id}.perk`)),
    el('p', 'offer-versus', versus.label),
    need.canTake === false ? el('p', 'offer-warn', t('deep.nav.bagFull', { max: DIFFICULTIES[state.difficulty].potions })) : null,
    append(el('div', 'offer-actions'), take, leave),
    el('p', 'offer-note', t('deep.loot.note')),
  );
  return card;
}

export async function offer(scene, event) {
  const { game } = scene;
  const { world, scheduler } = game;
  const loot = world.loot;
  const from = world.chest.visible === true ? world.chest : null;
  Object.assign(loot, { key: itemKey(event.item), anchor: from === null ? 0.6 : from.anchor, dx: 0, dy: -6, alpha: 1, visible: true, height: 16, rot: 0 });
  game.audio.sfx.item();
  await scheduler.tween(loot, { dy: -30 }, 380, 'outBack');
}

export async function promptLoot(scene, need) {
  const { game, state } = scene;
  if (scene.lootTip !== true) {
    scene.lootTip = true;
    lumiSay(scene, 'deep.fairy.loot', {}, 3200);
  }
  for (;;) {
    const card = lootCard(state, need);
    game.hud.panel(card);
    const { choice } = await keyed(scene, card, 500);
    const button = card.querySelector(`[data-choice="${choice}"]`);
    if (button !== null && button.dataset.locked === 'true') {
      game.audio.sfx.denied();
      await game.scheduler.wait(300);
      continue;
    }
    game.audio.sfx.select();
    await game.hud.closePanel();
    return { type: 'loot', choice };
  }
}

async function stopRays(scene) {
  if (scene.rays !== null && scene.rays !== undefined) {
    scene.rays.stop();
    scene.rays = null;
  }
}

export async function take(scene, event) {
  const { game, state } = scene;
  const { world, scheduler, effects, audio } = game;
  if (event.item.slot === 'key') {
    await keycardTaken(scene);
    return;
  }
  const loot = world.loot;
  if (loot.visible === false) {
    Object.assign(loot, { key: itemKey(event.item), anchor: scene.floorAnchor(event.item) ?? 0.5, dy: -4, alpha: 1, visible: true, height: 16 });
  }
  await scheduler.tween(loot, { anchor: world.hero.anchor, dy: -14, alpha: 0.3 }, 340, 'inQuad');
  loot.visible = false;
  const point = center(game, world.hero);
  effects.sparkle(point.x, point.y, ['#fee761', '#ffffff'], 14);
  audio.sfx.coin();
  if (event.item.slot === 'weapon') {
    world.hero.hold = WEAPONS[event.item.id].key;
    updateWeapon(state.hero.weapon);
  } else if (event.item.slot === 'shield') updateShield(state.hero.shield);
  else updatePotions(event.potions);
  if (event.dropped !== null) {
    const head = top(game, world.hero);
    game.hud.floatText(head.x, head.y - 4, t('deep.float.dropped', { item: t(`deep.item.${event.dropped.id}`) }), 'label');
    const spot = scene.floorAnchor(event.dropped) ?? 0.5;
    Object.assign(loot, { key: itemKey(event.dropped), anchor: world.hero.anchor + 0.02, dy: -12, alpha: 1, visible: true, height: 16, rot: 0 });
    audio.sfx.whoosh();
    await scheduler.tween(loot, { anchor: spot, dy: -22, rot: -0.6 }, 220, 'outQuad');
    await scheduler.tween(loot, { dy: 0, rot: -1.15 }, 200, 'inQuad');
    loot.visible = false;
    loot.rot = 0;
    audio.sfx.thud();
    effects.dust(spot * game.view.W, game.view.groundY, 8);
  }
  await scheduler.tween(world.hero, { dy: -5 }, 110, 'outQuad');
  await scheduler.tween(world.hero, { dy: 0 }, 140, 'inQuad');
  await stopRays(scene);
  hideChestAfterOffers(scene);
}

export async function leave(scene, event) {
  const { game } = scene;
  const loot = game.world.loot;
  await game.scheduler.tween(loot, { dy: 0, alpha: 0.2 }, 280, 'inQuad');
  loot.visible = false;
  game.audio.sfx.thud();
  const head = top(game, game.world.hero);
  game.hud.floatText(head.x, head.y - 4, t('deep.float.left', { item: t(`deep.item.${event.item.id}`) }), 'label');
  await stopRays(scene);
  hideChestAfterOffers(scene);
}

function hideChestAfterOffers(scene) {
  if (scene.state.phase === 'loot') return;
  const chest = scene.game.world.chest;
  if (scene.state.node === 'c1') return;
  scene.game.scheduler.tween(chest, { alpha: 0 }, 400, 'linear').then(() => {
    chest.visible = false;
    chest.alpha = 1;
  });
}

export async function coffee(scene, event) {
  const { game, state } = scene;
  const { world, scheduler, audio, effects, hud } = game;
  const hero = world.hero;
  const start = hero.anchor;
  hero.walking = true;
  await scheduler.tween(hero, { anchor: (propScreenX(game.view, 0.8) - 12) / game.view.W }, 600, 'inOutQuad');
  hero.walking = false;
  const order = top(game, hero);
  hud.floatText(order.x, order.y - 6, t('deep.float.coffeeOrder'), 'label');
  await scheduler.wait(900);
  audio.sfx.slurp();
  await scheduler.wait(700);
  scene.stage.state.coffee = 'used';
  const point = center(game, hero);
  effects.heal(point.x, point.y);
  const head = top(game, hero);
  hud.floatText(head.x, head.y, `+${event.healed}`, 'heal');
  hud.floatText(head.x, head.y - 10, t('deep.float.coffee'), 'label');
  hud.setHeroHp(event.heroHp, state.hero.maxHp);
  audio.sfx.potion();
  hero.flip = true;
  hero.walking = true;
  await scheduler.tween(hero, { anchor: start }, 600, 'inOutQuad');
  hero.walking = false;
  hero.flip = false;
}

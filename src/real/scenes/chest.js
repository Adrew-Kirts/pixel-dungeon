import { RARITIES } from '../../content.js';
import { t } from '../../i18n.js';
import { actorX } from '../../stage/world.js';
import { lootPanel } from '../../ui/panels.js';
import { wiggle, rollDice } from '../../scenes/chest.js';
import { center, top, flash, itemKey } from '../../scenes/common.js';

function lootIcon(loot) {
  if (loot.item !== null) return itemKey(loot.item);
  if (loot.potion !== null) return `icon:${loot.potion.icon}`;
  return 'icon:stick';
}

export async function chestReady(scene) {
  scene.game.hud.hint(t('hint.chest'));
}

export async function promptChest(scene) {
  const { game } = scene;
  const state = { waiting: true };
  wiggle(game, game.world.chest, state);
  await game.input.nextTap({ guardMs: 250 });
  state.waiting = false;
  game.hud.hint(null);
  return { type: 'chest' };
}

async function mimicBite(scene, event, chest) {
  const { game, state } = scene;
  const { world, scheduler, hud, camera, audio } = game;
  chest.key = 'tile:92';
  const head = top(game, chest);
  hud.floatText(head.x, head.y, t('float.mimic'), 'label-rage');
  audio.sfx.hurt();
  await scheduler.wait(260);
  const distance = actorX(game.view, chest) - actorX(game.view, world.hero) - 13;
  await scheduler.tween(chest, { dx: -distance, dy: -4 }, 150, 'inQuad');
  flash(game, world.hero, 220);
  camera.shake(2, 200);
  const heroHead = top(game, world.hero);
  if (event.bite > 0) hud.floatText(heroHead.x, heroHead.y, `-${event.bite}`, 'hurt');
  hud.setHeroHp(scene.heroHp - event.bite, state.hero.maxHp);
  audio.sfx.hurt();
  await scheduler.tween(chest, { dx: 0, dy: 0 }, 320, 'outQuad');
  const after = top(game, chest);
  hud.floatText(after.x, after.y, t('float.mimicLoot'), 'label');
  await scheduler.wait(600);
}

export async function chest(scene, event) {
  const { game, state } = scene;
  const { world, hud, scheduler, audio, effects, camera } = game;
  const chestActor = world.chest;
  const loot = event.loot;
  for (let shake = 0; shake < 3; shake++) {
    audio.sfx.chestShake();
    await scheduler.tween(chestActor, { rot: 0.14, dy: -2 }, 55, 'outQuad');
    await scheduler.tween(chestActor, { rot: -0.14, dy: 0 }, 55, 'outQuad');
  }
  chestActor.rot = 0;
  if (loot.mimic === true) await mimicBite(scene, event, chestActor);
  await rollDice(game, chestActor, loot.face);
  const rarity = RARITIES[loot.rarity];
  const dicePoint = center(game, world.dice);
  effects.sparkle(dicePoint.x, dicePoint.y, [rarity.color, '#ffffff'], 10);
  await scheduler.wait(380);
  chestActor.key = loot.mimic === true ? 'tile:92' : 'tile:91';
  audio.sfx.chestOpen();
  camera.flash(rarity.color, 0.22, 260);
  const chestPoint = center(game, chestActor);
  const rays = effects.rays(chestPoint.x, chestPoint.y - 4);
  effects.sparkle(chestPoint.x, chestPoint.y - 6, [rarity.color, '#ffffff', '#fee761'], 26);
  const lootActor = world.loot;
  Object.assign(lootActor, { key: lootIcon(loot), anchor: chestActor.anchor, dx: 0, dy: -6, alpha: 1, visible: true, height: 16, rot: 0 });
  world.dice.visible = false;
  await scheduler.tween(lootActor, { dy: -30 }, 420, 'outBack');
  rays.move(actorX(game.view, lootActor), game.view.groundY - 38);
  if (loot.rarity === 'common') audio.sfx.smug();
  else audio.sfx.item();
  hud.announce(t('announce.roll', { face: loot.face, rarity: t(`rarity.${loot.rarity}`) }));
  const panel = lootPanel(loot, game);
  hud.panel(panel.el);
  await panel.done;
  audio.sfx.select();
  hud.closePanel();
  rays.stop();
  await scheduler.tween(lootActor, { anchor: world.hero.anchor, dy: -14, alpha: 0.3 }, 360, 'inQuad');
  lootActor.visible = false;
  world.hero.hold = itemKey(state.hero.item);
  hud.setItem(state.hero.item);
  hud.setPotions(state.hero.potions);
  hud.setHeroHp(event.heroHp, state.hero.maxHp);
  if (event.potionResult === 'heal') {
    const head = top(game, world.hero);
    hud.floatText(head.x, head.y, `+${event.heroHp - (scene.heroHp - event.bite)}`, 'heal');
  }
  const heroPoint = center(game, world.hero);
  effects.sparkle(heroPoint.x, heroPoint.y, ['#fee761', '#ffffff'], 14);
  await scheduler.tween(world.hero, { dy: -6 }, 120, 'outQuad');
  await scheduler.tween(world.hero, { dy: 0 }, 150, 'inQuad');
}

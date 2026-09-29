import { RARITIES } from '../content.js';
import { t } from '../i18n.js';
import { easyChest } from '../easy/engine.js';
import { actorX } from '../stage/world.js';
import { lootPanel } from '../ui/panels.js';
import { center, top, flash, itemKey } from './common.js';

function lootIcon(loot) {
  if (loot.item !== null) return itemKey(loot.item);
  if (loot.potion !== null) return `icon:${loot.potion.icon}`;
  return 'icon:stick';
}

export async function wiggle(game, chest, state) {
  const { scheduler } = game;
  while (state.waiting === true) {
    await scheduler.wait(850);
    if (state.waiting === false) return;
    await scheduler.tween(chest, { rot: 0.1, dy: -1 }, 70, 'outQuad');
    await scheduler.tween(chest, { rot: -0.1, dy: 0 }, 70, 'outQuad');
    await scheduler.tween(chest, { rot: 0 }, 70, 'outQuad');
  }
}

async function mimicAttack(game, run, chest) {
  const { world, scheduler, hud, camera, audio } = game;
  const head = top(game, chest);
  chest.key = 'tile:92';
  hud.floatText(head.x, head.y, t('float.mimic'), 'label-rage');
  audio.sfx.hurt();
  await scheduler.wait(260);
  const distance = actorX(game.view, chest) - actorX(game.view, world.hero) - 13;
  await scheduler.tween(chest, { dx: -distance, dy: -4 }, 150, 'inQuad');
  const damage = run.mimicDamage;
  const heroHead = top(game, world.hero);
  flash(game, world.hero, 220);
  camera.shake(2, 200);
  if (damage > 0) hud.floatText(heroHead.x, heroHead.y, `-${damage}`, 'hurt');
  hud.setHeroHp(run.hero.hp, run.hero.maxHp);
  audio.sfx.hurt();
  await scheduler.tween(chest, { dx: 0, dy: 0 }, 320, 'outQuad');
  const after = top(game, chest);
  hud.floatText(after.x, after.y, t('float.mimicLoot'), 'label');
  await scheduler.wait(650);
}

export async function rollDice(game, chest, face) {
  const { world, scheduler, audio } = game;
  const dice = world.dice;
  Object.assign(dice, { key: 'icon:dice1', anchor: chest.anchor, dx: 0, dy: -14, rot: 0, visible: true, height: 12, alpha: 1 });
  const toss = scheduler
    .tween(dice, { dy: -38 }, 260, 'outQuad')
    .then(() => scheduler.tween(dice, { dy: -24 }, 360, 'outBounce'));
  const tumble = (async () => {
    let shown = 1;
    for (let step = 0; step < 10; step++) {
      shown = 1 + ((shown + 1 + Math.floor(Math.random() * 4)) % 6);
      dice.key = `icon:dice${shown}`;
      dice.rot = step % 2 === 0 ? 0.35 : -0.35;
      audio.sfx.roll();
      await scheduler.wait(58);
    }
  })();
  await Promise.all([toss, tumble]);
  dice.key = `icon:dice${face}`;
  dice.rot = 0;
  audio.sfx.tick();
}

export async function chestScene(game, run) {
  const { world, hud, scheduler, audio, effects, input, camera } = game;
  const chest = world.chest;
  hud.hint(t('hint.chest'));
  scheduler.setSpeed(1);
  const state = { waiting: true };
  wiggle(game, chest, state);
  await input.nextTap({ guardMs: 250 });
  state.waiting = false;
  hud.hint(null);
  const loot = easyChest(run);
  for (let shake = 0; shake < 3; shake++) {
    audio.sfx.chestShake();
    await scheduler.tween(chest, { rot: 0.14, dy: -2 }, 55, 'outQuad');
    await scheduler.tween(chest, { rot: -0.14, dy: 0 }, 55, 'outQuad');
  }
  chest.rot = 0;
  if (loot.mimic === true) await mimicAttack(game, run, chest);
  await rollDice(game, chest, loot.face);
  const rarity = RARITIES[loot.rarity];
  const dicePoint = center(game, world.dice);
  effects.sparkle(dicePoint.x, dicePoint.y, [rarity.color, '#ffffff'], 10);
  await scheduler.wait(380);
  chest.key = loot.mimic === true ? 'tile:92' : 'tile:91';
  audio.sfx.chestOpen();
  camera.flash(rarity.color, 0.22, 260);
  const chestPoint = center(game, chest);
  const rays = effects.rays(chestPoint.x, chestPoint.y - 4);
  effects.sparkle(chestPoint.x, chestPoint.y - 6, [rarity.color, '#ffffff', '#fee761'], 26);
  const lootActor = world.loot;
  Object.assign(lootActor, { key: lootIcon(loot), anchor: chest.anchor, dx: 0, dy: -6, alpha: 1, visible: true, height: 16, rot: 0 });
  world.dice.visible = false;
  await scheduler.tween(lootActor, { dy: -30 }, 420, 'outBack');
  rays.move(actorX(game.view, lootActor), game.view.groundY - 38);
  if (loot.rarity === 'common') audio.sfx.smug();
  else audio.sfx.item();
  hud.announce(t('announce.roll', { face: loot.face, rarity: t(`rarity.${loot.rarity}`) }));
  scheduler.setSpeed(1);
  const panel = lootPanel(loot, game);
  hud.panel(panel.el);
  await panel.done;
  audio.sfx.select();
  hud.closePanel();
  rays.stop();
  await scheduler.tween(lootActor, { anchor: world.hero.anchor, dy: -14, alpha: 0.3 }, 360, 'inQuad');
  lootActor.visible = false;
  world.hero.hold = itemKey(run.hero.item);
  hud.setItem(run.hero.item);
  hud.setPotion(run.hero.potion);
  const heroPoint = center(game, world.hero);
  effects.sparkle(heroPoint.x, heroPoint.y, ['#fee761', '#ffffff'], 14);
  await scheduler.tween(world.hero, { dy: -6 }, 120, 'outQuad');
  await scheduler.tween(world.hero, { dy: 0 }, 150, 'inQuad');
}

import { t } from '../../i18n.js';
import { actorX } from '../../stage/world.js';
import { top } from '../../scenes/common.js';
import { NODES, CLASSES, WEAPONS } from '../content.js';
import { floorItems } from '../engine.js';
import { DOOR_X, propScreenX } from '../rooms.js';

export const CAT_X = 0.7;
import { STREET_ORDER } from '../stage.js';
import { createCreation, deepHeroName } from '../../ui/deep/creation.js';
import { navPanel, parseNavChoice } from '../../ui/deep/nav.js';
import { showDeepHero, updateKeycard } from '../../ui/deep/gear.js';
import { keyed, fairySay, addScore, tutorial, speakAs, lumiText, lumiSay, hideFairyBubble } from './common.js';
import { setupFoeActor } from './fight.js';

export function heroLabel(hero) {
  return deepHeroName(hero.first, hero.epithet);
}

export async function titleCard(scene) {
  const { hud, scheduler, audio, camera } = scene.game;
  scheduler.setSpeed(1);
  scene.game.lighting.darkness = 0.8;
  audio.sfx.rumble();
  camera.shake(1.8, 1100);
  hud.banner(t('deep.title'), t('deep.subtitle'));
  await scheduler.wait(2600);
  hud.hideBanner();
  await scheduler.wait(300);
}

export async function promptCreate(scene) {
  const { game } = scene;
  const creation = createCreation({
    onTick: () => game.audio.sfx.tick(),
    onRoll: () => game.audio.sfx.roll(),
    onDoom: (on) => (on === true ? game.audio.doom.start() : game.audio.doom.stop()),
  });
  scene.onCleanup(() => creation.cancel());
  const input = await creation.open();
  game.audio.sfx.select();
  game.api.event('deep.create');
  return input;
}

function heroActor(scene, hero) {
  const actor = scene.game.world.hero;
  Object.assign(actor, {
    key: CLASSES[hero.cls].key,
    variant: 'base',
    anchor: 0.26,
    dx: 0,
    dy: 0,
    sx: 1,
    sy: 1,
    rot: 0,
    alpha: 1,
    visible: true,
    idle: true,
    walking: false,
    flip: false,
    height: 16,
    shadow: 6,
    hold: WEAPONS[hero.weapon.id].key,
    holdAlpha: 1,
  });
  return actor;
}

export async function heroCreated(scene, event) {
  const { game } = scene;
  const { hud, scheduler, audio, camera, effects } = game;
  const hero = event.hero;
  scene.stage.enterNode('h1', null, false);
  scene.stage.setDifficulty(scene.state.difficulty);
  game.lighting.darkness = scene.stage.darkness();
  const actor = heroActor(scene, hero);
  actor.dy = -80;
  audio.sfx.whoosh();
  await scheduler.tween(actor, { dy: 0 }, 360, 'inQuad');
  actor.sx = 1.35;
  actor.sy = 0.7;
  audio.sfx.thud();
  camera.shake(1.4, 180);
  effects.dust(actorX(game.view, actor), game.view.groundY, 12);
  scheduler.tween(actor, { sx: 1, sy: 1 }, 280, 'outBack');
  showDeepHero(hud, hero, heroLabel(hero));
  if (scene.state.difficulty !== 'normal') hud.flashWord(t(`deep.difficulty.${scene.state.difficulty}`), 1100);
  hud.score.show(0);
  hud.score.room(t('deep.room.h1'));
  await scheduler.wait(500);
  const fairy = scene.stage.state.fairy;
  Object.assign(fairy, { visible: true, alpha: 0, dx: -30, dy: -30 });
  audio.sfx.chime();
  scheduler.tween(fairy, { alpha: 1, dx: 0, dy: 0 }, 700, 'outQuad');
  await scheduler.wait(500);
  if (scene.state.difficulty === 'tryhard') scene.friend = false;
  const greeting = scene.state.difficulty === 'tryhard' ? 'deep.fairy.helloTryhard' : scene.friend === true ? 'deep.fairy.helloFriend' : 'deep.fairy.helloSulky';
  await fairySay(scene, t(greeting, { name: firstName(hero) }), 3000);
  if (scene.friend === true) await fairySay(scene, t('deep.fairy.friend.h1'), 3600);
}

export function firstName(hero) {
  return heroLabel(hero).split(' ')[0];
}

function nextEvent(upcoming, type) {
  return upcoming.find((event) => event.type === type) ?? null;
}

async function walkTo(scene, actor, anchor, ms = null) {
  const { game } = scene;
  const { scheduler, audio, effects } = game;
  const distance = Math.abs(anchor - actor.anchor) * game.view.W;
  const duration = ms ?? Math.max(260, distance * 7);
  actor.flip = anchor < actor.anchor;
  actor.walking = true;
  let walking = true;
  (async () => {
    while (walking === true) {
      audio.sfx.step();
      effects.dust(actorX(game.view, actor) + (actor.flip === true ? 3 : -3), game.view.groundY, 2);
      await scheduler.wait(170);
    }
  })();
  await scheduler.tween(actor, { anchor }, duration, 'inOutQuad');
  walking = false;
  actor.walking = false;
}

async function dissolve(scene, to, ms = 380) {
  await scene.game.scheduler.tween(scene.game.world, { dissolve: to }, ms, 'linear');
}

async function streetWalk(scene, event, upcoming) {
  hideFairyBubble(scene);
  const { game, stage } = scene;
  const { scheduler, world } = game;
  const hero = world.hero;
  const from = STREET_ORDER.indexOf(event.from);
  const to = STREET_ORDER.indexOf(event.node);
  const direction = Math.sign(to - from);
  hero.flip = direction < 0;
  hero.walking = true;
  let walking = true;
  (async () => {
    while (walking === true) {
      game.audio.sfx.step();
      game.effects.dust(actorX(game.view, hero) - 3 * direction, game.view.groundY, 2);
      await scheduler.wait(170);
    }
  })();
  const moves = [scheduler.tween(stage.state, { camSeg: to }, 1100 * Math.abs(to - from), 'inOutQuad')];
  const appear = nextEvent(upcoming, 'foeAppear');
  if (appear !== null && direction > 0) {
    const foe = setupFoeActor(scene, appear.foe);
    foe.anchor = foe.targetAnchor + 1;
    foe.visible = true;
    moves.push(scheduler.tween(foe, { anchor: foe.targetAnchor }, 1100, 'inOutQuad'));
    scene.foeEntered = true;
  }
  await Promise.all(moves);
  walking = false;
  hero.walking = false;
  hero.flip = false;
  stage.enterNode(event.node, event.from, scene.state.hero.keycard);
  stage.state.floorItems = floorItems(scene.state, event.node);
}

async function doorTransition(scene, event, upcoming) {
  hideFairyBubble(scene);
  const { game, stage, state } = scene;
  const { scheduler, audio, world, view } = game;
  const hero = world.hero;
  const portal = event.via === 'portal';
  const doorX = stage.doorScreenX(view, event.node);
  if (doorX !== null) await walkTo(scene, hero, doorX / view.W);
  stage.setDoorOpen(event.node, true);
  hero.flip = false;
  if (portal === true) {
    audio.sfx.magic();
    game.camera.flash('#d176d0', 0.35, 300);
    game.effects.sparkle(actorX(view, hero), view.groundY - 10, ['#d176d0', '#75e3ff', '#ffffff'], 26);
    await Promise.all([scheduler.tween(hero, { rot: 6.3, sx: 0.2, sy: 0.2, alpha: 0, dy: -8 }, 520, 'inQuad'), scheduler.wait(260).then(() => dissolve(scene, 1))]);
    hero.rot = 0;
  } else {
    audio.sfx.door();
    await scheduler.wait(220);
    await Promise.all([scheduler.tween(hero, { dy: -3, alpha: 0, sx: 0.8, sy: 0.8 }, 300, 'inQuad'), scheduler.wait(120).then(() => dissolve(scene, 1))]);
  }
  stage.setDoorOpen(event.node, false);
  stage.enterNode(event.node, event.from, state.hero.keycard);
  stage.state.floorItems = floorItems(state, event.node);
  world.chest.visible = false;
  world.loot.visible = false;
  game.lighting.darkness = stage.darkness();
  const arriveStreet = NODES[event.node].area === 'street';
  const arrivalDoor = stage.doorScreenX(view, event.from);
  const arrivalX = arrivalDoor !== null ? arrivalDoor / view.W : arriveStreet === true ? 0.45 : DOOR_X.back;
  Object.assign(hero, { anchor: arrivalX, dy: -3, alpha: 0, sx: 0.8, sy: 0.8, flip: false });
  world.foe.visible = false;
  stage.setDoorOpen(event.from, true);
  scene.game.hud.score.room(t(`deep.room.${event.node}`));
  await dissolve(scene, 0, 320);
  if (portal === true) {
    audio.sfx.magic();
    game.effects.sparkle(actorX(view, hero), view.groundY - 10, ['#d176d0', '#75e3ff', '#ffffff'], 26);
  } else audio.sfx.door();
  await scheduler.tween(hero, { dy: 0, alpha: 1, sx: 1, sy: 1 }, 260, 'outQuad');
  const walk = walkTo(scene, hero, 0.26);
  const appear = nextEvent(upcoming, 'foeAppear');
  const bossIntro = upcoming.some((candidate) => candidate.type === 'midbossIntro' || candidate.type === 'reveal' || candidate.type === 'mimic');
  let foeIn = Promise.resolve();
  if (appear !== null && bossIntro === false) {
    const foe = setupFoeActor(scene, appear.foe);
    foe.anchor = foe.targetAnchor + 0.5;
    foe.visible = true;
    foeIn = scheduler.wait(200).then(() => scheduler.tween(foe, { anchor: foe.targetAnchor }, 700, 'outQuad'));
    scene.foeEntered = true;
  }
  await Promise.all([walk, foeIn]);
  hero.flip = false;
  stage.setDoorOpen(event.from, false);
  audio.sfx.thud();
}

export async function enterNode(scene, event, upcoming) {
  const { game, stage } = scene;
  if (event.first === true) game.api.event(`deep.room.${event.node}`);
  if (event.via === 'start') return;
  game.hud.hint(null);
  scene.foeEntered = false;
  if (event.via === 'walk') await streetWalk(scene, event, upcoming);
  else await doorTransition(scene, event, upcoming);
  game.hud.score.room(t(`deep.room.${event.node}`));
  scene.game.scheduler.tween(game.lighting, { darkness: stage.darkness() }, 600, 'linear');
  if (event.points > 0) {
    const head = top(game, game.world.hero);
    game.hud.floatText(head.x, head.y - 6, t('deep.float.explore', { points: event.points }), 'label');
    addScore(scene, event.points);
  }
  if (event.secret > 0) {
    const head = top(game, game.world.hero);
    game.hud.floatText(head.x, head.y - 18, t('deep.float.secret', { points: event.secret }), 'label-crit');
    game.audio.sfx.fanfare();
    addScore(scene, event.secret);
  }
  if (event.first === true) await roomComment(scene, event.node);
}

async function roomComment(scene, node) {
  const friendKey = `deep.fairy.friend.${node}`;
  const key = scene.friend === true && t(friendKey) !== friendKey ? friendKey : `deep.fairy.room.${node}`;
  const text = lumiText(scene, key);
  if (text !== null && text !== key) await fairySay(scene, text, scene.friend === true ? 3400 : 2600);
  if (node === 'a2') await offstageGrunt(scene);
  if (node === 'b1') await powerCut(scene);
}

async function offstageGrunt(scene) {
  const { game } = scene;
  game.audio.sfx.grunt();
  await speakAs(scene, t('deep.manager.offstage'), '. .', game.view.W - 6, game.view.groundY - 40, { holdMs: 900, voice: 'grunt' });
}

async function powerCut(scene) {
  const { game, stage } = scene;
  game.audio.sfx.powerDown();
  game.camera.shake(1, 300);
  await game.scheduler.tween(stage.state, { blackout: 0.55 }, 250, 'linear');
  stage.state.emergency = true;
  game.hud.flashWord(t('deep.powerCut'), 900);
  await game.scheduler.wait(500);
  await lumiSay(scene, 'deep.fairy.powerCut', {}, 2200);
}

export async function restorePower(scene) {
  const { game, stage } = scene;
  if (stage.state.emergency !== true) return;
  stage.state.emergency = false;
  game.audio.sfx.beep();
  await game.scheduler.tween(stage.state, { blackout: 0 }, 400, 'linear');
}

export async function roomClear(scene, event) {
  const { game } = scene;
  if (event.fought === false) return;
  await restorePower(scene);
  if (event.flawless === true) {
    const head = top(game, game.world.hero);
    game.hud.floatText(head.x, head.y - 8, t('float.flawless', { points: event.points }), 'label-crit');
    game.audio.sfx.coin();
    addScore(scene, event.points);
    await game.scheduler.wait(500);
  }
}

async function navHints(scene, need) {
  const { state } = scene;
  if (scene.friend !== true) return;
  const hero = state.hero;
  if (hero.hp <= hero.maxHp * 0.35 && hero.potions.length > 0 && scene.warned.has('drink') === false) {
    scene.warned.add('drink');
    await fairySay(scene, t('deep.fairy.friend.drink'), 2800);
  } else if (need.options.some((option) => option.to === 'lair') === true && scene.warned.has('lair') === false) {
    scene.warned.add('lair');
    await fairySay(scene, t('deep.fairy.friend.lastRoom'), 3000);
  } else if (state.node === 'a1' && hero.keycard === true && scene.warned.has('portal') === false) {
    scene.warned.add('portal');
    await fairySay(scene, t('deep.fairy.friend.portal'), 2800);
  }
}

export async function promptNav(scene, need) {
  const { game, state } = scene;
  if (scene.navTips.has('first') === false) {
    scene.navTips.add('first');
    await tutorial(scene, 'nav', { icon: 'tile:45' });
  }
  await navHints(scene, need);
  for (;;) {
    const panel = navPanel(state, need);
    game.hud.panel(panel);
    const idle = setTimeout(() => lumiSay(scene, 'deep.fairy.idle', {}, 2600), 25000);
    const { choice } = await keyed(scene, panel, 300);
    clearTimeout(idle);
    const button = panel.querySelector(`[data-choice="${CSS.escape(choice)}"]`);
    if (button !== null && button.dataset.locked === 'true') {
      game.audio.sfx.denied();
      button.classList.remove('is-shaking');
      void button.offsetWidth;
      button.classList.add('is-shaking');
      if (choice.startsWith('go:') === true) lumiSay(scene, 'deep.fairy.locked', {}, 2600);
      else lumiSay(scene, 'deep.fairy.bagFull', {}, 2400);
      await game.scheduler.wait(500);
      continue;
    }
    game.audio.sfx.select();
    await game.hud.closePanel();
    return parseNavChoice(choice);
  }
}

export async function keycardTaken(scene) {
  const { game } = scene;
  updateKeycard(true);
  scene.stage.setKeycard(true);
  game.audio.sfx.beep();
  const head = top(game, game.world.hero);
  game.hud.floatText(head.x, head.y - 6, t('deep.float.keycard'), 'label-crit');
  await game.scheduler.wait(600);
  await lumiSay(scene, 'deep.fairy.keycard', {}, 2600);
}

export async function petCat(scene, event) {
  const { game, state } = scene;
  const { world, scheduler, audio, effects, hud, view } = game;
  const hero = world.hero;
  const start = hero.anchor;
  const catX = propScreenX(view, CAT_X);
  await walkTo(scene, hero, (catX - 12) / view.W);
  hero.flip = false;
  scene.stage.state.catAwake = true;
  audio.sfx.chime();
  for (let heart = 0; heart < 3; heart++) {
    effects.sparkle(catX, view.groundY - 12, ['#f6757a', '#ff706d', '#ffffff'], 8);
    audio.sfx.pixie();
    await scheduler.wait(260);
  }
  const head = top(game, hero);
  hud.floatText(head.x + 10, head.y - 4, t('deep.float.purr'), 'label');
  if (event.healed > 0) hud.floatText(head.x, head.y + 4, `+${event.healed}`, 'heal');
  hud.setHeroHp(event.heroHp, state.hero.maxHp);
  await scheduler.wait(500);
  await walkTo(scene, hero, start);
  hero.flip = false;
}

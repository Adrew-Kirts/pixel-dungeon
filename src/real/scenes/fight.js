import { t, foeName, foeLine, heroName } from '../../i18n.js';
import { positionAt, zoneForMs, MAX_TAP_MS } from '../../meter.js';
import { HARD_MONSTERS } from '../content.js';
import { actorX } from '../../stage/world.js';
import { heroAttack, impact, hitHero, enrage, monsterDeath, dragonDeath } from '../../scenes/battle.js';
import { center, top } from '../../scenes/common.js';
import { restartable } from '../prompt.js';
import { addScore, pointsFloat } from './common.js';

const TILES = Object.fromEntries(HARD_MONSTERS.map((monster) => [monster.id, monster.tile]));
const ACTOR_RESET = { variant: 'base', dx: 0, dy: 0, sx: 1, sy: 1, rot: 0, alpha: 1, flash: 0, idle: true, mouthOpen: false, baseScale: 1 };

export function foeWithTile(foe) {
  return { ...foe, tile: TILES[foe.id] ?? 104 };
}

export function setupFoeActor(scene, foe) {
  const actor = scene.game.world.foe;
  const stage = scene.stage.state;
  stage.monolith = false;
  Object.assign(stage.boss, { power: 0, charge: 0, lash: 0, laser: null, enraged: false, talking: false });
  if (foe.kind === 'monster') {
    Object.assign(actor, ACTOR_RESET, { key: `tile:${TILES[foe.id] ?? 104}`, targetAnchor: 0.7, height: 16, shadow: 6 });
  } else if (foe.kind === 'midboss') {
    Object.assign(actor, ACTOR_RESET, { key: 'icon:scopeCreep', targetAnchor: 0.7, height: 32, shadow: 16 });
  } else {
    Object.assign(actor, ACTOR_RESET, { key: null, targetAnchor: 0.72, height: 40, shadow: 0, idle: false, dy: scene.game.view.groundY + 40 });
    stage.monolith = true;
  }
  return actor;
}

function bossInfo(foe) {
  return {
    name: foeName(foe),
    title: t(`foe.${foe.id}.title`),
    hp: foe.hp,
    maxHp: foe.maxHp,
    segment: foe.maxHp / (foe.kind === 'boss' ? 10 : 4),
  };
}

async function monsterIntro(scene, foe, actor) {
  const { hud, scheduler, audio } = scene.game;
  hud.showFoe(foeWithTile(foe));
  const head = top(scene.game, actor);
  hud.floatText(head.x, head.y - 4, t('float.wild', { name: foeName(foe) }), 'label');
  hud.announce(t('announce.foe', { name: foeName(foe), line: foeLine(foe) }));
  audio.sfx.select();
  await scheduler.tween(actor, { dy: -6 }, 120, 'outQuad');
  await scheduler.tween(actor, { dy: 0 }, 140, 'inQuad');
  await scheduler.wait(300);
}

async function midbossIntro(scene, foe, actor) {
  const { hud, scheduler, audio, camera, effects } = scene.game;
  audio.sfx.rumble();
  camera.shake(1.4, 700);
  await scheduler.tween(actor, { sx: 1.25, sy: 0.75 }, 160, 'outQuad');
  await scheduler.tween(actor, { sx: 0.9, sy: 1.15 }, 140, 'outQuad');
  await scheduler.tween(actor, { sx: 1, sy: 1 }, 220, 'outBack');
  effects.dust(actorX(scene.game.view, actor), scene.game.view.groundY, 12);
  audio.sfx.land();
  hud.banner(foeName(foe), t(`foe.${foe.id}.title`));
  hud.announce(t('announce.boss', { name: foeName(foe), title: t(`foe.${foe.id}.title`), hp: foe.maxHp }));
  await scheduler.wait(1300);
  hud.hideBanner();
  hud.showBoss(bossInfo(foe));
  await scheduler.wait(250);
}

function heroFirstName(scene) {
  return scene.state.hero.firstName ?? heroName(scene.state.hero);
}

async function speak(scene, text, holdMs = 1600) {
  const { game } = scene;
  const { hud, scheduler, audio, view } = game;
  const boss = scene.stage.state.boss;
  const geometry = scene.stage.monolith(view, game.world.foe);
  hud.speech.show(t('boss.speaker'), geometry.eyeX - 14, geometry.eyeY - 6);
  boss.talking = true;
  for (let index = 1; index <= text.length; index++) {
    hud.speech.text(text.slice(0, index));
    if (index % 2 === 1 && text[index - 1] !== ' ') audio.sfx.voice();
    await scheduler.wait(text[index - 1] === '.' || text[index - 1] === '?' || text[index - 1] === '!' ? 140 : 32);
  }
  boss.talking = false;
  await scheduler.wait(holdMs);
  hud.speech.hide();
}

async function monolithIntro(scene, foe) {
  const { game } = scene;
  const { hud, scheduler, audio, camera, effects, view } = game;
  const actor = game.world.foe;
  const boss = scene.stage.state.boss;
  scheduler.tween(game.lighting, { darkness: 0.82 }, 700, 'linear');
  audio.sfx.rumble();
  audio.sfx.dawn();
  camera.shake(1.4, 1900);
  const geometry = scene.stage.monolith(view, actor);
  const dust = (async () => {
    for (let puff = 0; puff < 8; puff++) {
      effects.dust(geometry.left + 6 + puff * 9, view.groundY, 8);
      await scheduler.wait(200);
    }
  })();
  await scheduler.tween(actor, { dy: 0 }, 1800, 'outQuad');
  await dust;
  audio.sfx.land();
  camera.shake(3, 400);
  await scheduler.wait(350);
  for (const level of [0.4, 0, 0.7, 0.2, 1]) {
    boss.power = level;
    audio.sfx.tick();
    await scheduler.wait(90);
  }
  audio.sfx.charge();
  await scheduler.tween(boss, { charge: 0.7 }, 300, 'outQuad');
  await scheduler.tween(boss, { charge: 0 }, 400, 'inQuad');
  hud.banner(foeName(foe), t(`foe.${foe.id}.title`));
  hud.announce(t('announce.boss', { name: foeName(foe), title: t(`foe.${foe.id}.title`), hp: foe.maxHp }));
  await scheduler.wait(1500);
  hud.hideBanner();
  await speak(scene, t('boss.intro1'), 1100);
  await speak(scene, t('boss.intro2', { name: heroFirstName(scene) }), 1900);
  hud.showBoss(bossInfo(foe));
  await scheduler.wait(300);
}

export async function foeAppear(scene, event) {
  const foe = { ...event.foe };
  const { world, scheduler } = scene.game;
  const actor = world.foe;
  if (actor.visible === false || scene.foe !== null) {
    setupFoeActor(scene, foe);
    Object.assign(actor, { anchor: 1.15, visible: true });
    scene.game.audio.sfx.whoosh();
    await scheduler.tween(actor, { anchor: actor.targetAnchor }, 600, 'outQuad');
  }
  scene.foe = foe;
  if (foe.kind === 'monster') await monsterIntro(scene, foe, actor);
  else if (foe.kind === 'midboss') await midbossIntro(scene, foe, actor);
  else await monolithIntro(scene, foe);
}

export function promptStrike(scene, need) {
  const { game } = scene;
  return restartable(scene, async (attempt) => {
    game.scheduler.setSpeed(1);
    game.hud.meter.open(need.meter, { label: scene.strikes < 2 });
    attempt.onCancel(() => game.hud.meter.close());
    const tappedAt = await game.input.nextTap({ guardMs: 140 });
    const ms = Math.min(MAX_TAP_MS, Math.round(game.hud.meter.elapsed(tappedAt)));
    game.hud.meter.stop(positionAt(ms, need.meter.sweepMs), zoneForMs(ms, need.meter));
    game.audio.sfx.tick();
    scene.strikes += 1;
    return { type: 'strike', ms };
  });
}

export async function strike(scene, event) {
  const { game, state } = scene;
  const foe = scene.foe;
  const actor = game.world.foe;
  foe.hp = event.foeHp;
  if (event.foeHp === 0 && foe.kind !== 'monster' && game.reducedMotion === false) game.scheduler.slowmo(0.3, 650);
  const closeMeter = game.scheduler.wait(event.zone === 'crit' ? 280 : 170).then(() => game.hud.meter.close());
  await heroAttack(game, { hero: state.hero }, foe, actor, event.zone);
  scene.streakRun.stats.streak = Math.max(0, event.streak - 1);
  impact(game, scene.streakRun, foe, actor, { zone: event.zone, damage: event.damage });
  pointsFloat(scene, actor, event.points, event.zone === 'crit' ? 'points-gold' : 'points');
  addScore(scene, event.points);
  await closeMeter;
}

export async function poisonTick(scene, event) {
  const { game, state } = scene;
  const head = top(game, game.world.hero);
  if (event.damage > 0) {
    game.hud.floatText(head.x, head.y - 6, `-${event.damage}`, 'poison');
    game.world.hero.flash = 0.6;
    game.scheduler.tween(game.world.hero, { flash: 0 }, 200, 'linear');
    game.audio.sfx.buzz();
  }
  game.hud.setHeroHp(event.heroHp, state.hero.maxHp);
  if (event.left === 0) scene.setPoisoned(false);
  await game.scheduler.wait(180);
}

async function lunge(scene, actor, event) {
  const { game } = scene;
  const { scheduler, audio } = game;
  const hero = game.world.hero;
  const scale = actor.baseScale ?? 1;
  const reach = (actor.height ?? 16) * scale >= 28 ? 22 : 13;
  const distance = actorX(game.view, actor) - actor.dx - actorX(game.view, hero) - reach;
  await scheduler.tween(actor, { dx: 4, sx: scale * 1.15, sy: scale * 0.85 }, 150, 'outQuad');
  audio.sfx.whoosh();
  await scheduler.tween(actor, { dx: -distance, sx: scale * 0.9, sy: scale * 1.1 }, 110, 'inQuad');
  hitHero(game, { hero: { hp: event.heroHp, maxHp: scene.state.hero.maxHp } }, event.damage);
  await scheduler.tween(actor, { dx: 0, sx: scale, sy: scale }, 300, 'outQuad');
}

function heroTarget(scene) {
  const point = center(scene.game, scene.game.world.hero);
  return { x: point.x, y: point.y };
}

async function laser(scene, event) {
  const { game } = scene;
  const { scheduler, audio, camera, effects } = game;
  const boss = scene.stage.state.boss;
  const target = heroTarget(scene);
  audio.sfx.charge();
  await scheduler.tween(boss, { charge: 1 }, 380, 'inQuad');
  audio.sfx.laser();
  boss.laser = { alpha: 1, x: target.x, y: target.y };
  camera.flash('#e43b44', 0.35, 200);
  camera.shake(2.2, 260);
  effects.sparks(target.x, target.y, ['#fee761', '#ff706d', '#ffffff'], 14, 1.2);
  hitHero(game, { hero: { hp: event.heroHp, maxHp: scene.state.hero.maxHp } }, event.damage);
  scheduler.tween(boss, { charge: 0 }, 300, 'outQuad');
  await scheduler.tween(boss.laser, { alpha: 0 }, 260, 'inQuad');
  boss.laser = null;
  await scheduler.wait(160);
}

async function whip(scene, event) {
  const { game } = scene;
  const { scheduler, audio, camera } = game;
  const boss = scene.stage.state.boss;
  scene.stage.state.target = heroTarget(scene);
  await scheduler.tween(boss, { lash: -0.25 }, 160, 'outQuad');
  audio.sfx.whoosh();
  await scheduler.tween(boss, { lash: 1 }, 150, 'inQuad');
  camera.shake(2.4, 240);
  hitHero(game, { hero: { hp: event.heroHp, maxHp: scene.state.hero.maxHp } }, event.damage);
  await scheduler.tween(boss, { lash: 0 }, 360, 'outQuad');
  scene.stage.state.target = null;
}

export async function counter(scene, event) {
  const { game } = scene;
  await game.scheduler.wait(220);
  if (scene.foe !== null && scene.foe.kind === 'boss') {
    scene.bossMoves += 1;
    if (scene.bossMoves % 2 === 1) await laser(scene, event);
    else await whip(scene, event);
  } else {
    await lunge(scene, game.world.foe, event);
  }
  await game.scheduler.wait(140);
}

export async function grow(scene, event) {
  const { game } = scene;
  const actor = game.world.foe;
  const scale = 1 + 0.16 * event.growth;
  actor.baseScale = scale;
  game.audio.sfx.land();
  game.camera.shake(1.2, 220);
  await game.scheduler.tween(actor, { sx: scale * 1.1, sy: scale * 1.1 }, 180, 'outQuad');
  await game.scheduler.tween(actor, { sx: scale, sy: scale }, 200, 'outBack');
  const head = top(game, { ...actor, height: actor.height * scale });
  game.hud.floatText(head.x, head.y, t('float.grows'), 'label-rage');
  await game.scheduler.wait(260);
}

export async function enraged(scene) {
  if (scene.foe !== null && scene.foe.kind === 'boss') {
    scene.stage.state.boss.enraged = true;
    await Promise.all([speak(scene, t('boss.enrage'), 1300), enrage(scene.game, scene.foe, scene.game.world.foe)]);
    return;
  }
  await enrage(scene.game, scene.foe, scene.game.world.foe);
}

async function monolithDeath(scene) {
  const { game } = scene;
  const { scheduler, audio, camera, effects, hud, particles, view } = game;
  const actor = game.world.foe;
  const boss = scene.stage.state.boss;
  camera.flash('#ffffff', 0.8, 380);
  audio.sfx.boom();
  const words = speak(scene, t('boss.death'), 900);
  for (let flicker = 0; flicker < 8; flicker++) {
    boss.power = flicker % 2 === 0 ? 0.25 : 0.8 - flicker * 0.08;
    actor.flash = flicker % 2 === 0 ? 0.6 : 0;
    await scheduler.wait(110);
  }
  actor.flash = 0;
  audio.sfx.powerDown();
  await words;
  await scheduler.tween(boss, { power: 0 }, 700, 'inQuad');
  camera.setTint('#e43b44', 0);
  hud.setEnraged(false);
  hud.hideBoss();
  const geometry = scene.stage.monolith(view, actor);
  audio.sfx.rumble();
  camera.shake(2.4, 1400);
  const blasts = (async () => {
    for (let blast = 0; blast < 7; blast++) {
      const x = geometry.left + 8 + Math.random() * 60;
      const y = view.groundY - 10 - Math.random() * 60;
      particles.burst(x, y, { count: 16, colors: ['#fee761', '#feae34', '#f77622', '#ffffff'], speed: [0.03, 0.12], life: [240, 520], size: [1, 3], kind: 'ember' });
      effects.dust(geometry.left + Math.random() * 70, view.groundY, 10);
      if (blast % 2 === 0) audio.sfx.boom();
      await scheduler.wait(190);
    }
  })();
  await scheduler.tween(actor, { dy: view.groundY + 40 }, 1500, 'inQuad');
  await blasts;
  actor.visible = false;
  scene.stage.state.monolith = false;
  effects.coins(geometry.left + 10, view.groundY - 8, 44, view.groundY);
  audio.sfx.land();
  camera.shake(4, 500);
  await scheduler.wait(700);
}

export async function kill(scene, event) {
  const { game } = scene;
  const actor = game.world.foe;
  addScore(scene, event.points);
  const head = top(game, actor);
  if (event.kind === 'monster') await monsterDeath(game, actor);
  else if (event.kind === 'boss') await monolithDeath(scene);
  else await dragonDeath(game, actor);
  game.hud.floatText(head.x, head.y, `+${event.points}`, 'points-gold');
  scene.foe = null;
}

export async function roomClear(scene, event) {
  const { game } = scene;
  game.hud.hint(null);
  scene.stage.state.trapArmed = false;
  if (event.flawless === true) {
    const head = top(game, game.world.hero);
    game.hud.floatText(head.x, head.y - 8, t('float.flawless', { points: event.points }), 'label-crit');
    game.audio.sfx.coin();
    addScore(scene, event.points);
    await game.scheduler.wait(500);
  }
}

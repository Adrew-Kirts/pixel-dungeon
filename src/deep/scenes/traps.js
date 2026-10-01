import { t } from '../../i18n.js';
import { center, top } from '../../scenes/common.js';
import { DODGE, HORDE, TAP_EXTRA } from '../content.js';
import { addScore, pointsFloat, tutorial, lumiSay } from './common.js';
import { liveBeats } from './fight.js';
import { trapDamage } from '../engine.js';

const ARROW_FLIGHT = 420;
const MINION_TILES = [124, 120, 108, 122, 124, 120];

async function jump(scene, height = 16) {
  const { scheduler, audio } = scene.game;
  const hero = scene.game.world.hero;
  if (scene.jumping === true) return;
  scene.jumping = true;
  audio.sfx.jump();
  await scheduler.tween(hero, { dy: -height }, 150, 'outQuad');
  await scheduler.tween(hero, { dy: 0 }, 150, 'inQuad');
  scene.jumping = false;
}

export async function arrowsStart(scene) {
  const { game } = scene;
  game.audio.sfx.alarm();
  game.camera.shake(1, 300);
  scene.stage.state.slit = true;
  await tutorial(scene, 'arrows', { icon: 'icon:arrow', params: { damage: trapDamage(scene.state, DODGE.damage) } });
  game.hud.hint(t('deep.hint.arrows'));
}

export async function promptDodge(scene, need) {
  const { game } = scene;
  const taps = await liveBeats(scene, {
    beats: need.beats,
    windows: need.windows,
    extra: TAP_EXTRA.dodge,
    approach: 700,
    mode: 'dodge',
    rings: false,
    onBeat: (t0, timers) => {
      need.beats.forEach((beat, index) => {
        timers.push(
          setTimeout(() => {
            game.audio.sfx.alarm();
          }, Math.max(0, beat - ARROW_FLIGHT - 260)),
        );
        timers.push(
          setTimeout(() => {
            const to = center(game, game.world.hero);
            const fromX = game.view.W + 6;
            const heroX = to.x + 6;
            const speed = Math.max(40, fromX - heroX) / ARROW_FLIGHT;
            scene.stage.addProjectile({ icon: 'arrow', fromX, fromY: game.view.groundY - 9, toX: -40, toY: game.view.groundY - 9, startAt: t0 + beat - ARROW_FLIGHT, arriveAt: t0 + beat + (heroX + 40) / speed, arc: 0, heroX, beatIndex: index });
            game.audio.sfx.arrow();
          }, Math.max(0, beat - ARROW_FLIGHT)),
        );
      });
    },
    onTap: () => {
      jump(scene);
    },
    onGrade: (grade, index) => {
      scene.stage.resolveArrow(index, grade, performance.now());
      if (grade === 'miss') {
        const point = center(game, game.world.hero);
        game.effects.sparkle(point.x + 4, game.view.groundY - 9, ['#e43b44', '#ffffff'], 8);
        game.camera.shake(1, 160);
      }
    },
    damageFor: (grade) => (grade === 'miss' ? trapDamage(scene.state, DODGE.damage) : 0),
  });
  scene.stage.clearProjectiles();
  return { type: 'dodge', taps };
}

export async function dodge(scene, event) {
  const { game, state } = scene;
  game.hud.hint(null);
  game.hud.setHeroHp(event.heroHp, state.hero.maxHp);
  const points = event.results.reduce((sum, result) => sum + result.points, 0);
  if (points > 0) {
    pointsFloat(scene, game.world.hero, points, 'points');
    addScore(scene, points);
  }
  const clean = event.results.every((result) => result.grade !== 'miss');
  if (clean === true) {
    const head = top(game, game.world.hero);
    game.hud.floatText(head.x, head.y - 10, t('deep.float.untouched'), 'label-crit');
  }
  scene.stage.state.slit = false;
  await game.scheduler.wait(300);
}

export async function hordeStart(scene) {
  const { game, stage } = scene;
  const { scheduler, audio, camera, hud, world, effects } = game;
  const chest = world.chest;
  hud.hint(null);
  audio.sfx.chestShake();
  await scheduler.tween(chest, { rot: 0.18, dy: -3 }, 70, 'outQuad');
  await scheduler.tween(chest, { rot: -0.18, dy: 0 }, 70, 'outQuad');
  chest.rot = 0;
  chest.key = 'tile:92';
  audio.sfx.laugh();
  hud.floatText(top(game, chest).x, top(game, chest).y, t('deep.float.itsATrap'), 'label-rage');
  await scheduler.wait(400);
  for (const door of stage.state.doors) door.open = false;
  audio.sfx.slam();
  camera.shake(3, 400);
  effects.dust(game.view.W * 0.07, game.view.groundY, 10);
  await scheduler.wait(250);
  audio.sfx.alarm();
  camera.setTint('#e43b44', 0.12, true);
  hud.banner(t('deep.horde.title'), t('deep.horde.subtitle'));
  await scheduler.wait(1300);
  hud.hideBanner();
  chest.visible = false;
  await tutorial(scene, 'horde', { icon: 'tile:124' });
  hud.hint(t('deep.hint.horde'));
}

export async function promptHorde(scene, need) {
  const { game } = scene;
  const taps = await liveBeats(scene, {
    beats: need.beats,
    windows: need.windows,
    extra: TAP_EXTRA.horde,
    approach: 650,
    mode: 'horde',
    onBeat: (t0, timers) => {
      need.beats.forEach((beat, index) => {
        const travel = Math.min(1100, 520 + index * 20);
        timers.push(
          setTimeout(() => {
            scene.stage.addMinion({ index, tile: MINION_TILES[index % MINION_TILES.length], side: need.sides[index], startAt: t0 + beat - travel, arriveAt: t0 + beat });
          }, Math.max(0, beat - travel)),
        );
        timers.push(setTimeout(() => game.audio.sfx.drum(), Math.max(0, beat)));
      });
    },
    onGrade: (grade, index) => {
      const minion = scene.stage.state.minions.find((candidate) => candidate.index === index);
      if (minion !== undefined) minion.dead = performance.now();
      const point = center(game, game.world.hero);
      const side = need.sides[index] === 'left' ? -1 : 1;
      if (grade !== 'miss') {
        game.effects.slash(point.x + side * 10, point.y, grade === 'perfect' ? '#fee761' : '#ffffff');
        game.effects.poof(point.x + side * 12, point.y);
        game.audio.sfx.hit();
        game.world.hero.flip = side < 0;
      }
    },
    damageFor: (grade) => (grade === 'miss' ? trapDamage(scene.state, HORDE.bite) : 0),
  });
  scene.stage.clearMinions();
  game.world.hero.flip = false;
  return { type: 'horde', taps };
}

export async function horde(scene, event) {
  const { game, state } = scene;
  const { hud, camera, audio, scheduler } = game;
  hud.hint(null);
  camera.setTint('#e43b44', 0);
  hud.setHeroHp(event.heroHp, state.hero.maxHp);
  const points = event.results.reduce((sum, result) => sum + result.points, 0);
  addScore(scene, points + event.bonus);
  if (event.survived === false) return;
  const perfect = event.results.filter((result) => result.grade === 'perfect').length;
  const head = top(game, game.world.hero);
  hud.floatText(head.x, head.y - 4, t('deep.float.hordeClear', { n: HORDE.count }), 'label-crit');
  hud.floatText(head.x, head.y - 16, `+${event.bonus + points}`, 'points-gold');
  audio.sfx.fanfare();
  camera.flash('#fee761', 0.3, 260);
  for (const door of scene.stage.state.doors) door.open = false;
  await scheduler.wait(900);
  if (perfect === HORDE.count) hud.floatText(head.x, head.y - 28, t('deep.float.hordePerfect'), 'label-crit');
  scene.stage.state.coffee = 'ready';
  await lumiSay(scene, 'deep.fairy.hordeDone', {}, 2600);
}

export function trapChestPosition(scene) {
  const chest = scene.game.world.chest;
  Object.assign(chest, { key: 'tile:89', anchor: 0.58, targetAnchor: 0.58, height: 16, shadow: 7, dx: 0, dy: 0, rot: 0, alpha: 1, visible: true, idle: false, variant: 'gold' });
  return chest;
}

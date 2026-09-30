import { t } from '../../i18n.js';
import { actorX } from '../../stage/world.js';
import { hitHero } from '../../scenes/battle.js';
import { top } from '../../scenes/common.js';
import { restartable } from '../prompt.js';
import { tutorialPanel } from '../../ui/real/panels.js';
import { addScore } from './common.js';

const FLIGHT_MS = 300;
const LAUNCH_DELAY_MS = 150;

function arrowTarget(scene) {
  return actorX(scene.game.view, scene.game.world.hero) + 5;
}

function launch(scene) {
  const { game } = scene;
  const arrow = scene.stage.state.arrow;
  scene.stage.state.alarm = false;
  Object.assign(arrow, { x: scene.stage.slitScreenX(game.view, game.world.camX) - 4, y: game.view.groundY - 9, visible: true });
  game.audio.sfx.arrow();
  scene.arrowFlight = game.scheduler.tween(arrow, { x: arrowTarget(scene) }, FLIGHT_MS, 'linear');
  return scene.arrowFlight;
}

export async function flyArrow(scene, { hit }) {
  const { game } = scene;
  const arrow = scene.stage.state.arrow;
  if (arrow.visible === false) {
    scene.stage.state.alarm = true;
    game.audio.sfx.alarm();
    await game.scheduler.wait(LAUNCH_DELAY_MS);
    await launch(scene);
  } else if (arrow.x > arrowTarget(scene) + 1) {
    const remaining = Math.max(40, ((arrow.x - arrowTarget(scene)) / Math.max(1, scene.stage.slitScreenX(game.view, game.world.camX) - arrowTarget(scene))) * FLIGHT_MS);
    game.scheduler.killTweensOf(arrow);
    await game.scheduler.tween(arrow, { x: arrowTarget(scene) }, remaining, 'linear');
  }
  if (hit === true) {
    arrow.visible = false;
    return;
  }
  await game.scheduler.tween(arrow, { x: -24 }, FLIGHT_MS, 'linear');
  arrow.visible = false;
}

export async function trapStart(scene) {
  const { game } = scene;
  const { hud, audio, camera } = game;
  audio.sfx.alarm();
  camera.shake(1, 300);
  scene.stage.state.trapArmed = true;
  const panel = tutorialPanel({ eyebrow: t('real.trap'), title: t('real.trapTitle'), text: t('real.trapText'), icon: 'icon:arrow' }, game);
  hud.panel(panel.el);
  await panel.done;
  audio.sfx.select();
  await hud.closePanel();
  hud.hint(t('real.dodgeHint'));
}

export function promptDodge(scene, need) {
  const { game, stage } = scene;
  const arrow = stage.state.arrow;
  return restartable(scene, (attempt) => {
    const startedAt = performance.now();
    let telegraphAt = null;
    const timers = [];
    return new Promise((resolve) => {
      let settled = false;
      const settle = (value) => {
        if (settled === true) return;
        settled = true;
        for (const timer of timers) clearTimeout(timer);
        resolve(value);
      };
      attempt.onCancel(() => {
        settled = true;
        for (const timer of timers) clearTimeout(timer);
        stage.state.alarm = false;
        game.scheduler.killTweensOf(arrow);
        arrow.visible = false;
      });
      timers.push(
        setTimeout(() => {
          telegraphAt = performance.now();
          stage.state.alarm = true;
          game.audio.sfx.alarm();
          game.hud.flashWord(t('real.tapNow'), 650);
          timers.push(setTimeout(() => launch(scene), LAUNCH_DELAY_MS));
          timers.push(
            setTimeout(() => {
              game.input.cancelAll();
              settle({ type: 'dodge', ms: null });
            }, need.arrow.windowMs + 80),
          );
        }, need.arrow.waitMs),
      );
      game.input.nextTap({ guardMs: 100 }).then((at) => {
        const origin = telegraphAt ?? startedAt + need.arrow.waitMs;
        settle({ type: 'dodge', ms: Math.round(at - origin) });
      });
    });
  });
}

async function jump(scene, height = 18) {
  const { scheduler, audio } = scene.game;
  const hero = scene.game.world.hero;
  audio.sfx.jump();
  await scheduler.tween(hero, { dy: -height }, 170, 'outQuad');
  await scheduler.tween(hero, { dy: 0 }, 190, 'inQuad');
}

export async function dodge(scene, event) {
  const { game, state } = scene;
  const hero = game.world.hero;
  if (event.success === true) {
    await Promise.all([jump(scene), flyArrow(scene, { hit: false })]);
    const head = top(game, hero);
    game.hud.floatText(head.x, head.y - 4, t('float.dodged', { points: event.points }), 'label-crit');
    addScore(scene, event.points);
  } else {
    if (event.ms !== null && event.ms < 0) {
      const head = top(game, hero);
      game.hud.floatText(head.x, head.y - 4, t('float.early'), 'label');
      await jump(scene, 12);
    }
    await flyArrow(scene, { hit: true });
    hitHero(game, { hero: { hp: event.heroHp, maxHp: state.hero.maxHp } }, event.damage);
  }
  scene.stage.state.alarm = false;
  await game.scheduler.wait(260);
}

import { t } from '../../i18n.js';
import { ringAt } from '../engine.js';
import { restartable, tapOrTimeout } from '../prompt.js';
import { addScore } from './common.js';
import { tutorialPanel } from '../../ui/real/panels.js';

const RING_FLOATS = { bullseye: 'label-crit', close: 'label', head: 'label', miss: 'label-rage' };

export async function weakSpot(scene, event) {
  const { game, closeup } = scene;
  const { hud, audio, camera, scheduler } = game;
  audio.sfx.roar();
  camera.flash('#ffffff', 0.7, 220);
  hud.banner(t('real.weakSpot'), '');
  document.getElementById('boss-bar').classList.add('is-tucked');
  const view = closeup.open(event.aim);
  await scheduler.tween(view, { alpha: 1 }, 320, 'outQuad');
  await scheduler.wait(550);
  hud.hideBanner();
  if (scene.aimExplained !== true) {
    scene.aimExplained = true;
    const panel = tutorialPanel({ eyebrow: t('foe.monolith.name'), title: t('real.aimTitle'), text: t('real.aimText') }, game, 7000);
    hud.panel(panel.el);
    await panel.done;
    audio.sfx.select();
    await hud.closePanel();
  }
  hud.hint(t('real.aimHint'));
}

export function promptAim(scene, need) {
  const { game, closeup } = scene;
  return restartable(scene, async (attempt) => {
    game.scheduler.setSpeed(1);
    closeup.start(performance.now());
    attempt.onCancel(() => closeup.start(null));
    const at = await tapOrTimeout(game, { guardMs: 120, timeoutMs: need.timeoutMs + 60, attempt });
    const startedAt = closeup.state().startedAt;
    const ms = at === null ? null : Math.round(at - startedAt);
    closeup.freeze(ms, ringAt(need, ms));
    game.audio.sfx.tick();
    return { type: 'aim', ms };
  });
}

export async function aim(scene, event) {
  const { game, closeup } = scene;
  const { hud, audio, camera, scheduler } = game;
  hud.hint(null);
  const view = closeup.state();
  const eye = closeup.anchor(game.view, view.aim);
  if (event.ring === 'bullseye') {
    audio.sfx.crit();
    camera.shake(4.2, 420);
    camera.flash('#fee761', 0.5, 260);
    scheduler.freeze(180);
  } else if (event.ring === 'close') {
    audio.sfx.hit();
    camera.shake(2, 240);
  } else if (event.ring === 'head') {
    audio.sfx.glance();
    camera.shake(0.8, 140);
  } else {
    audio.sfx.smug();
  }
  if (event.damage > 0) {
    view.flash = 1;
    scheduler.tween(view, { flash: 0 }, 260, 'linear');
  }
  hud.floatText(eye.x, eye.y - 16, t(`real.${event.ring}`), RING_FLOATS[event.ring]);
  if (event.damage > 0) hud.floatText(eye.x + 10, eye.y + 4, String(event.damage), event.ring === 'bullseye' ? 'crit' : 'hit');
  if (event.points > 0) hud.floatText(eye.x - 12, eye.y + 16, `+${event.points}`, 'points-gold');
  addScore(scene, event.points);
  scene.foe.hp = event.foeHp;
  hud.setBossHp(event.foeHp, scene.foe.maxHp);
  await scheduler.wait(1000);
  await scheduler.tween(view, { alpha: 0 }, 260, 'inQuad');
  closeup.close();
  document.getElementById('boss-bar').classList.remove('is-tucked');
}

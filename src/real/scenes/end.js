import { t } from '../../i18n.js';
import { heroDeath } from '../../scenes/battle.js';
import { top } from '../../scenes/common.js';

export async function victory(scene) {
  const { game } = scene;
  const { hud, scheduler, audio, effects, camera, world } = game;
  camera.setTint('#e43b44', 0);
  scene.setPoisoned(false);
  scheduler.tween(game.lighting, { darkness: 0.3 }, 900, 'linear');
  effects.confetti(game.view);
  audio.sfx.victory();
  hud.banner(t('real.victory'), '');
  const head = top(game, world.hero);
  hud.floatText(head.x, head.y - 4, t('float.victory'), 'label-crit');
  for (let jump = 0; jump < 3; jump++) {
    await scheduler.tween(world.hero, { dy: -10 }, 160, 'outQuad');
    await scheduler.tween(world.hero, { dy: 0 }, 160, 'inQuad');
  }
  await scheduler.wait(900);
  hud.hideBanner();
}

export async function gameOver(scene) {
  const { game } = scene;
  const { hud, scheduler, camera } = game;
  game.hud.meter.close();
  scene.setPoisoned(false);
  await heroDeath(game);
  camera.setTint('#181425', 0.35);
  hud.banner(t('real.gameOver'), t('real.killedBy', { name: scene.killerName() }));
  await scheduler.wait(1600);
  hud.hideBanner();
}

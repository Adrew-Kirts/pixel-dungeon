import { t, dragonTitle } from '../i18n.js';
import { actorX } from '../stage/world.js';
import { dragonFrames } from './common.js';

export async function bossIntro(game, run) {
  const { world, hud, scheduler, audio, camera, effects } = game;
  hud.progress(2);
  scheduler.tween(game.lighting, { darkness: 0.76 }, 700, 'linear');
  audio.sfx.rumble();
  camera.shake(1, 1000);
  await scheduler.wait(450);
  const dragon = world.foe;
  Object.assign(dragon, {
    key: dragonFrames,
    variant: 'base',
    anchor: 0.72,
    dx: 0,
    dy: -game.view.H,
    sx: 1,
    sy: 1,
    rot: 0,
    alpha: 1,
    flash: 0,
    visible: true,
    idle: false,
    height: 40,
    shadow: 20,
    flapMs: 70,
    mouthOpen: false,
  });
  await scheduler.tween(dragon, { dy: 0 }, 900, 'outQuad');
  dragon.flapMs = 150;
  dragon.idle = true;
  audio.sfx.land();
  camera.shake(4, 440);
  const x = actorX(game.view, dragon);
  effects.dust(x - 14, game.view.groundY, 14);
  effects.dust(x + 14, game.view.groundY, 14);
  await scheduler.wait(240);
  dragon.mouthOpen = true;
  audio.sfx.roar();
  camera.shake(2.4, 900);
  hud.banner(run.dragon.name.toUpperCase(), dragonTitle(run.dragon));
  hud.announce(t('announce.boss', { name: run.dragon.name, title: dragonTitle(run.dragon), hp: run.dragon.maxHp }));
  await scheduler.wait(1450);
  dragon.mouthOpen = false;
  hud.hideBanner();
  hud.showBoss(run.dragon);
  await scheduler.wait(300);
}

import { t } from '../../i18n.js';
import { center, top } from '../../scenes/common.js';
import { potionPanel, doubleShotScene } from '../../ui/real/panels.js';
import { keyedChoice } from './common.js';

export async function promptPotion(scene, need) {
  const { hud, audio, scheduler } = scene.game;
  scheduler.setSpeed(1);
  audio.sfx.alarm();
  const card = potionPanel(need);
  hud.panel(card);
  const { choice } = await keyedChoice(scene, card, 500);
  audio.sfx.select();
  await hud.closePanel();
  return { type: 'potion', choice };
}

async function doubleShot(scene) {
  const { game, state } = scene;
  const cutscene = doubleShotScene(state.hero);
  document.getElementById('app').append(cutscene);
  game.audio.sfx.whoosh();
  await game.scheduler.wait(520);
  game.audio.sfx.potion();
  await game.scheduler.wait(260);
  game.audio.sfx.potion();
  game.camera.shake(2.2, 400);
  await game.scheduler.wait(900);
  cutscene.classList.add('is-leaving');
  await game.scheduler.wait(200);
  cutscene.remove();
}

export async function potion(scene, event) {
  const { game, state } = scene;
  const { hud, effects, audio, scheduler, world } = game;
  const head = top(game, world.hero);
  if (event.choice === 'save') {
    hud.floatText(head.x, head.y - 4, t('float.saved'), 'label');
    await scheduler.wait(300);
    return;
  }
  if (event.choice === 'double') await doubleShot(scene);
  const point = center(game, world.hero);
  effects.heal(point.x, point.y);
  hud.floatText(head.x, head.y, `+${event.healed}`, 'heal');
  hud.floatText(head.x, head.y - 12, event.choice === 'double' ? t('float.double') : t('float.glug'), event.choice === 'double' ? 'label-crit' : 'label');
  hud.setHeroHp(event.heroHp, state.hero.maxHp);
  hud.setPotions(state.hero.potions);
  audio.sfx.potion();
  await scheduler.wait(460);
}

import { rankFor, isBetterRecord } from '../rules.js';
import { EPITAPHS } from '../content.js';
import { t, heroName, itemName } from '../i18n.js';
import { victoryPanel, defeatPanel } from '../ui/panels.js';
import { top } from './common.js';

export async function victory(game, run) {
  const { world, hud, scheduler, audio, effects, camera, storage } = game;
  const timeMs = run.stats.endedAt - run.stats.startedAt;
  const rank = rankFor(run.stats.crits, run.stats.strikes);
  const previous = storage.getJson('record');
  const candidate = { rank, timeMs };
  const isNew = isBetterRecord(candidate, previous);
  if (isNew === true) storage.setJson('record', candidate);
  camera.setTint('#e43b44', 0);
  scheduler.tween(game.lighting, { darkness: 0.3 }, 900, 'linear');
  hud.progress(3);
  effects.confetti(game.view);
  audio.sfx.victory();
  const head = top(game, world.hero);
  hud.floatText(head.x, head.y - 4, t('float.victory'), 'label-crit');
  for (let jump = 0; jump < 2; jump++) {
    await scheduler.tween(world.hero, { dy: -10 }, 160, 'outQuad');
    await scheduler.tween(world.hero, { dy: 0 }, 160, 'inQuad');
  }
  await scheduler.wait(300);
  hud.announce(t('announce.victory', { rank, seconds: (timeMs / 1000).toFixed(1) }));
  scheduler.setSpeed(1);
  const summary = { won: true, heroName: heroName(run.hero), dragonName: run.dragon.name, rank, timeMs, strikes: run.stats.strikes, crits: run.stats.crits };
  const panel = victoryPanel(summary, { isNew, previous, best: isNew === true ? candidate : previous }, game);
  hud.panel(panel.el);
  await panel.done;
  audio.sfx.select();
  await hud.closePanel();
  return summary;
}

export async function defeat(game, run) {
  const { hud, scheduler } = game;
  const epitaph = t(`epitaph.${run.rng.int(0, EPITAPHS.length - 1)}`, { name: heroName(run.hero), item: itemName(run.hero.item) });
  hud.announce(t('announce.dead', { epitaph }));
  scheduler.setSpeed(1);
  const panel = defeatPanel(epitaph, game);
  hud.panel(panel.el);
  const choice = await panel.done;
  game.audio.sfx.select();
  await hud.closePanel();
  return choice;
}

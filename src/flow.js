import { t, foeName, foeLine, heroName } from './i18n.js';
import { createEasyRun } from './easy/engine.js';
import { resetWorld } from './stage/world.js';
import { boot } from './scenes/boot.js';
import { heroScene } from './scenes/hero.js';
import { walk } from './scenes/walk.js';
import { battle } from './scenes/battle.js';
import { chestScene } from './scenes/chest.js';
import { bossIntro } from './scenes/boss.js';
import { victory, defeat } from './scenes/ending.js';
import { top } from './scenes/common.js';

const BASE_DARKNESS = 0.5;

export function createFlow(game, treasure, onError) {
  let token = 0;

  function resetStage() {
    game.scheduler.cancelAll();
    game.input.cancelAll();
    resetWorld(game.world);
    game.world.camX = 0;
    game.hud.reset();
    game.particles.clear();
    game.effects.clear();
    game.camera.reset();
    game.lighting.darkness = BASE_DARKNESS;
    document.getElementById('boot').hidden = true;
  }

  async function introduceMonster(run) {
    const { world, hud, scheduler, audio } = game;
    hud.showFoe(run.monster);
    const head = top(game, world.foe);
    hud.floatText(head.x, head.y - 4, t('float.wild', { name: foeName(run.monster) }), 'label');
    hud.announce(t('announce.foe', { name: foeName(run.monster), line: foeLine(run.monster) }));
    audio.sfx.select();
    await scheduler.tween(world.foe, { dy: -6 }, 120, 'outQuad');
    await scheduler.tween(world.foe, { dy: 0 }, 140, 'inQuad');
    await scheduler.wait(260);
    hud.floatText(head.x, head.y - 2, foeLine(run.monster), 'label');
    await scheduler.wait(380);
  }

  async function play({ withBoot }) {
    const current = ++token;
    resetStage();
    treasure.hide();
    const seedRequest = game.seeds.next();
    if (withBoot === true) await boot(game);
    const seedInfo = await seedRequest;
    if (current !== token) return;
    const run = createEasyRun(seedInfo.seed);
    run.server = seedInfo.server;
    game.run = run;
    const { world, hud } = game;
    await heroScene(game, run);
    run.stats.startedAt = performance.now();
    hud.progress(0);
    Object.assign(world.foe, { key: `tile:${run.monster.tile}`, variant: 'base', targetAnchor: 0.7, height: 16, shadow: 6, idle: true, dx: 0, dy: 0, sx: 1, sy: 1, rot: 0, alpha: 1, flash: 0 });
    await walk(game, { enter: [world.foe] });
    await introduceMonster(run);
    if ((await battle(game, run, run.monster, world.foe)) === 'lost') return lose(run, current);
    hud.progress(1);
    Object.assign(world.chest, { key: 'tile:89', targetAnchor: 0.66, height: 16, shadow: 7, dx: 0, dy: 0, rot: 0 });
    await walk(game, { enter: [world.chest], ms: 1000 });
    await chestScene(game, run);
    await walk(game, { exit: [world.chest], ms: 1000 });
    await bossIntro(game, run);
    if ((await battle(game, run, run.dragon, world.foe)) === 'lost') return lose(run, current);
    run.stats.endedAt = performance.now();
    game.lastEasy = run.server === null ? null : { runId: run.server.runId, token: run.server.token, strikes: [...run.strikes], hero: run.hero, at: run.server.issuedAt };
    const summary = await victory(game, run);
    if (current !== token) return;
    token++;
    resetStage();
    treasure.show(summary, null);
  }

  async function lose(run, current) {
    game.lastEasy = null;
    const choice = await defeat(game, run);
    if (current !== token) return;
    if (choice === 'retry') {
      await play({ withBoot: false });
      return;
    }
    token++;
    resetStage();
    treasure.show({ won: false, heroName: heroName(run.hero) }, game.storage.getJson('record'));
  }

  return {
    resetStage,
    start(options) {
      play(options).catch(onError);
    },
    skipToTreasure() {
      token++;
      resetStage();
      treasure.show(null, game.storage.getJson('record'));
    },
  };
}

import { t, heroName } from '../../i18n.js';
import { actorX } from '../../stage/world.js';
import { walk } from '../../scenes/walk.js';
import { heroScene } from '../../scenes/hero.js';
import { heroKey, heroVariant, itemKey, top } from '../../scenes/common.js';
import { heroChoicePanel } from '../../ui/real/panels.js';
import { keyedChoice } from './common.js';
import { setupFoeActor } from './fight.js';

export async function titleCard(scene) {
  const { hud, scheduler, audio, camera } = scene.game;
  scheduler.setSpeed(1);
  scene.game.lighting.darkness = 0.62;
  audio.sfx.rumble();
  camera.shake(1.6, 900);
  hud.banner(t('real.title'), t('real.subtitle'));
  hud.score.show(0);
  hud.score.room(t('real.room', { n: 0, total: scene.state.plan.length }));
  await scheduler.wait(2700);
  hud.hideBanner();
  await scheduler.wait(350);
}

export async function promptHero(scene) {
  const { hud, audio } = scene.game;
  const card = heroChoicePanel(scene.easy.hero);
  hud.panel(card);
  const { choice } = await keyedChoice(scene, card, 450);
  audio.sfx.select();
  await hud.closePanel();
  return { type: 'hero', choice };
}

async function dropHero(scene, hero) {
  const { world, hud, scheduler, audio, camera, effects } = scene.game;
  const actor = world.hero;
  Object.assign(actor, { key: heroKey(hero), variant: heroVariant(hero), anchor: 0.26, dy: -70, dx: 0, visible: true, idle: true, height: 16, shadow: 6, hold: itemKey(hero.item) });
  audio.sfx.whoosh();
  await scheduler.tween(actor, { dy: 0 }, 340, 'inQuad');
  actor.sx = 1.35;
  actor.sy = 0.7;
  audio.sfx.thud();
  camera.shake(1.2, 160);
  effects.dust(actorX(scene.game.view, actor), scene.game.view.groundY, 10);
  scheduler.tween(actor, { sx: 1, sy: 1 }, 280, 'outBack');
  hud.showHero(hero);
  hud.setPotions(hero.potions);
  const head = top(scene.game, actor);
  hud.floatText(head.x, head.y - 4, t('float.fullHp'), 'heal');
  audio.sfx.potion();
  hud.announce(t('announce.hero', { name: heroName(hero), cls: t(`class.${hero.cls}`), hp: hero.maxHp, atk: hero.atk }));
  await scheduler.wait(700);
}

export async function introduceHero(scene, hero, choice) {
  if (choice === 'continue') {
    await dropHero(scene, hero);
    return;
  }
  await heroScene(scene.game, { hero });
  scene.game.hud.setPotions(hero.potions);
}

export async function heroEvent(scene, event) {
  await introduceHero(scene, event.hero, event.choice);
}

function nextEvent(upcoming, type) {
  return upcoming.find((event) => event.type === type) ?? null;
}

export async function roomStart(scene, event, upcoming) {
  const { game } = scene;
  const { world, hud, view } = game;
  const stage = scene.stage;
  hud.score.room(t('real.room', { n: event.index + 1, total: scene.state.plan.length }));
  game.api.event(`real.room.${event.index + 1}`);
  const closed = stage.closeSlits(world.camX);
  for (const x of closed) {
    if (x > -10 && x < view.W + 10) game.effects.dust(x, view.groundY - 9, 8);
  }
  if (closed.length > 0) game.audio.sfx.thud();
  const exit = [world.foe, world.chest, stage.state.lamp].filter((actor) => actor.visible === true);
  const enter = [];
  const destination = world.camX + 0.6 * view.W;
  if (event.kind === 'fight' || event.kind === 'midboss' || event.kind === 'boss') {
    const appear = nextEvent(upcoming, 'foeAppear');
    if (appear !== null) enter.push(setupFoeActor(scene, appear.foe));
  } else if (event.kind === 'genie') {
    Object.assign(stage.state.lamp, { targetAnchor: 0.68, dx: 0, dy: 0, rot: 0, alpha: 1 });
    enter.push(stage.state.lamp);
    const ask = nextEvent(upcoming, 'genieAsk');
    if (ask !== null && ask.question.id === 'hire') stage.addDecor('slit', destination + view.W * 0.92);
  } else if (event.kind === 'trap') {
    stage.addDecor('poster', destination + view.W * (view.portrait === true ? 0.55 : 0.5));
    stage.addDecor('slit', destination + view.W * 0.92);
  } else if (event.kind === 'chest') {
    Object.assign(world.chest, { key: 'tile:89', targetAnchor: 0.66, height: 16, shadow: 7, dx: 0, dy: 0, rot: 0, alpha: 1 });
    enter.push(world.chest);
  }
  if (event.kind === 'boss') game.scheduler.tween(game.lighting, { darkness: 0.7 }, 1100, 'linear');
  else game.scheduler.tween(game.lighting, { darkness: 0.5 }, 1100, 'linear');
  await walk(game, { enter, exit, ms: 1100 });
  stage.pruneDecor(world.camX);
}

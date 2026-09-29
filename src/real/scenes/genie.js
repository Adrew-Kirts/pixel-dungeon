import { t } from '../../i18n.js';
import { MAX_TAP_MS } from '../../meter.js';
import { actorX } from '../../stage/world.js';
import { hitHero } from '../../scenes/battle.js';
import { center, top } from '../../scenes/common.js';
import { geniePanel } from '../../ui/real/panels.js';
import { GENIE } from '../content.js';
import { addScore, keyedChoice } from './common.js';
import { flyArrow } from './trap.js';

export async function genieAsk(scene, event) {
  const { game } = scene;
  const { scheduler, audio, effects, hud } = game;
  const { lamp, genie } = scene.stage.state;
  scene.question = event.question;
  for (let rub = 0; rub < 3; rub++) {
    await scheduler.tween(lamp, { rot: 0.18 }, 70, 'outQuad');
    await scheduler.tween(lamp, { rot: -0.18 }, 70, 'outQuad');
  }
  lamp.rot = 0;
  const x = actorX(game.view, lamp);
  audio.sfx.magic();
  effects.poof(x, game.view.groundY - 10);
  effects.sparkle(x, game.view.groundY - 18, ['#3aa8ff', '#8bdcff', '#ffffff'], 22);
  Object.assign(genie, { anchor: lamp.anchor, dx: 2, dy: -4, alpha: 0, visible: true, sx: 0.6, sy: 0.6 });
  await scheduler.tween(genie, { alpha: 1, dy: -12, sx: 1, sy: 1 }, 480, 'outBack');
  hud.announce(t(`q.${event.question.id}.text`));
  await scheduler.wait(420);
}

export async function promptAnswer(scene, need) {
  const { hud, audio } = scene.game;
  const panel = geniePanel(need.question);
  scene.geniePanel = panel;
  hud.panel(panel.el);
  const result = await keyedChoice(scene, panel.el, 450);
  audio.sfx.select();
  const ms = Math.min(MAX_TAP_MS, Math.round(result.at - result.armedAt));
  return { type: 'answer', choice: result.choice, ms };
}

function correctIds(question) {
  if (question.answer === '*') return question.choices.map((choice) => choice.id);
  return [question.answer];
}

function rewardLine(event, healed) {
  if (event.reward === 'potion') return t('real.reward.potion');
  if (event.reward === 'heal') return t('real.reward.healN', { n: healed });
  if (event.reward === 'atk') return t('real.reward.atk');
  if (event.reward === 'points') return t('real.reward.points');
  return null;
}

async function poisonArrow(scene) {
  const { game } = scene;
  const { camera, audio, hud } = game;
  await flyArrow(scene, { hit: true });
  audio.sfx.buzz();
  camera.shake(2.4, 420);
  camera.flash('#b55088', 0.55, 380);
  scene.setPoisoned(true);
  const head = top(game, game.world.hero);
  hud.floatText(head.x, head.y - 4, t('float.poison'), 'poison');
}

export async function genieAnswer(scene, event) {
  const { game, state } = scene;
  const { hud, audio, scheduler, effects, camera } = game;
  const panel = scene.geniePanel;
  const question = scene.question;
  const genie = scene.stage.state.genie;
  const healed = Math.max(0, event.heroHp - scene.heroHp);
  panel.mark(correctIds(question), event.choice);
  const lines = [];
  if (event.correct === true) {
    audio.sfx.fanfare();
    effects.sparkle(actorX(game.view, genie), game.view.groundY - 22, ['#fee761', '#ffffff', '#43e1b3'], 24);
    const special = { allCorrect: 'real.genieAll', hired: 'real.genieHired', goed: 'real.genieGoed' }[event.special] ?? 'real.genieRight';
    lines.push(t(special));
    const reward = rewardLine(event, healed);
    if (reward !== null) lines.push(reward);
    if (event.ms < GENIE.fastMs) lines.push(t('real.fast'));
    panel.say(lines);
    addScore(scene, event.points);
    if (event.special === 'goed') {
      camera.flash('#feae34', 0.35, 300);
      hud.banner(t('real.genieGoed'), '');
    }
    if (healed > 0) {
      const point = center(game, game.world.hero);
      effects.heal(point.x, point.y);
      hud.setHeroHp(event.heroHp, state.hero.maxHp);
      const head = top(game, game.world.hero);
      hud.floatText(head.x, head.y, `+${healed}`, 'heal');
    }
    if (event.reward === 'atk') {
      const head = top(game, game.world.hero);
      hud.floatText(head.x, head.y, t('float.atk'), 'label-crit');
    }
    hud.setPotions(state.hero.potions);
    await scheduler.tween(genie, { dy: -18 }, 200, 'outQuad');
    await scheduler.tween(genie, { dy: -12 }, 200, 'inQuad');
  } else if (event.special === 'poison') {
    lines.push(t('real.geniePoison'));
    panel.say(lines);
    audio.sfx.laugh();
    await poisonArrow(scene);
  } else {
    lines.push(t('real.genieWrong'));
    panel.say(lines);
    audio.sfx.laugh();
    for (let shake = 0; shake < 3; shake++) {
      await scheduler.tween(genie, { dx: 4 }, 60, 'outQuad');
      await scheduler.tween(genie, { dx: 0 }, 60, 'outQuad');
    }
    if (event.damage > 0) hitHero(game, { hero: { hp: event.heroHp, maxHp: state.hero.maxHp } }, event.damage);
  }
  await scheduler.wait(1500);
  if (event.special === 'goed') hud.hideBanner();
  await hud.closePanel();
  effects.poof(actorX(game.view, genie), game.view.groundY + genie.dy - 12);
  audio.sfx.whoosh();
  await scheduler.tween(genie, { alpha: 0, dy: -24, sx: 0.4, sy: 1.4 }, 260, 'inQuad');
  genie.visible = false;
}

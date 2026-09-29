import { t, foeName, potionName } from '../i18n.js';
import { ITEMS } from '../content.js';
import { isEnraged } from '../rules.js';
import { positionAt, MAX_TAP_MS } from '../meter.js';
import { easyMeter, easyStrike, easyCounter } from '../easy/engine.js';
import { actorX } from '../stage/world.js';
import { center, top, flash, knock, vibrate } from './common.js';

async function meterRound(game, run, foe) {
  const { hud, input, scheduler } = game;
  const config = easyMeter(foe);
  scheduler.setSpeed(1);
  hud.meter.open(config, { label: run.stats.strikes < 2 });
  const tappedAt = await input.nextTap({ guardMs: 140 });
  const strike = easyStrike(run, foe, Math.min(MAX_TAP_MS, hud.meter.elapsed(tappedAt)));
  hud.meter.stop(positionAt(strike.ms, config.sweepMs), strike.zone);
  game.audio.sfx.tick();
  return strike;
}

export async function heroAttack(game, run, foe, actor, zone) {
  const { world, scheduler, audio, effects } = game;
  const hero = world.hero;
  const item = run.hero.item;
  const target = center(game, actor);
  if (item.family === 'spell' && item !== ITEMS.woodenStick) {
    audio.sfx.whoosh();
    await scheduler.tween(hero, { dy: -5, holdRot: -1.2, holdY: 7 }, 150, 'outQuad');
    if (item.id === 'lightningBolt') {
      effects.lightning(target.x, game.view.groundY + actor.dy);
      await scheduler.wait(50);
    } else {
      await effects.fireball(actorX(game.view, hero) + 7, game.view.groundY - 12, target.x, target.y);
    }
    scheduler.tween(hero, { dy: 0, holdRot: -0.35, holdY: 3 }, 240, 'outQuad');
    return;
  }
  const reach = (actor.height ?? 16) >= 28 ? 25 : 15;
  const distance = Math.max(0, actorX(game.view, actor) - actor.dx - actorX(game.view, hero) + hero.dx - reach);
  audio.sfx.whoosh();
  await scheduler.tween(hero, { dx: -3, holdRot: -1.4 }, 90, 'outQuad');
  await scheduler.tween(hero, { dx: distance, holdRot: 1.4 }, 110, 'inQuad');
  effects.slash(target.x - 2, target.y, zone === 'crit' ? '#fee761' : '#ffffff');
  scheduler.tween(hero, { dx: 0, holdRot: -0.35 }, 280, 'outQuad');
}

export function impact(game, run, foe, actor, result) {
  const { scheduler, camera, effects, hud, audio } = game;
  const point = center(game, actor);
  const head = top(game, actor);
  flash(game, actor);
  if (result.zone === 'crit') {
    run.stats.streak += 1;
    scheduler.freeze(160);
    camera.shake(4.2, 380);
    camera.flash('#fee761', 0.5, 240);
    effects.critBurst(point.x, point.y);
    effects.coins(point.x, point.y - 4, 5, game.view.groundY);
    hud.floatText(head.x, head.y, String(result.damage), 'crit');
    hud.floatText(head.x, head.y - 12, run.stats.streak >= 2 ? t('float.combo', { n: run.stats.streak }) : t('float.critical'), 'label-crit');
    audio.sfx.crit();
    vibrate(40);
    knock(game, actor, 9);
  } else if (result.zone === 'hit') {
    run.stats.streak = 0;
    scheduler.freeze(60);
    camera.shake(1.6, 170);
    effects.sparks(point.x, point.y);
    hud.floatText(head.x, head.y, String(result.damage), 'hit');
    audio.sfx.hit();
    knock(game, actor, 4);
  } else {
    run.stats.streak = 0;
    camera.shake(0.6, 110);
    effects.sparks(point.x, point.y, ['#8b9bb4', '#c0cbdc'], 5, 0.6);
    hud.floatText(head.x, head.y, String(result.damage), 'glance');
    hud.floatText(head.x, head.y - 9, t('float.weak'), 'label');
    audio.sfx.glance();
    knock(game, actor, 2);
  }
  if (foe.kind !== 'monster') hud.setBossHp(foe.hp, foe.maxHp);
  else hud.setFoeHp(foe.hp, foe.maxHp);
  const label = t(result.zone === 'crit' ? 'announce.perfect' : result.zone === 'hit' ? 'announce.hit' : 'announce.weak');
  hud.announce(t('announce.strike', { label, damage: result.damage, foe: foeName(foe), hp: foe.hp }));
}

export function hitHero(game, run, damage) {
  const { world, camera, hud, audio } = game;
  const hero = world.hero;
  const head = top(game, hero);
  flash(game, hero, 220);
  knock(game, hero, -4, 300);
  camera.shake(1.8, 190);
  hud.floatText(head.x, head.y, `-${damage}`, 'hurt');
  hud.setHeroHp(run.hero.hp, run.hero.maxHp);
  audio.sfx.hurt();
}

async function foeAttack(game, run, foe, actor, counter) {
  const { world, scheduler, effects, audio } = game;
  const hero = world.hero;
  const target = center(game, hero);
  if (foe.kind === 'dragon') {
    run.dragonMoves += 1;
    if (run.dragonMoves % 2 === 0) {
      actor.mouthOpen = true;
      await scheduler.tween(actor, { dx: 3, sy: 1.04 }, 180, 'outQuad');
      const mouthX = actorX(game.view, actor) - 19;
      const mouthY = game.view.groundY + actor.dy - 27;
      await effects.breath(mouthX, mouthY, target.x, target.y, 640);
      hitHero(game, run, counter.damage);
      await scheduler.wait(320);
      actor.mouthOpen = false;
      await scheduler.tween(actor, { dx: 0, sy: 1 }, 200, 'outQuad');
      return;
    }
    const distance = actorX(game.view, actor) - actor.dx - actorX(game.view, hero) - 28;
    await scheduler.tween(actor, { dx: 5 }, 150, 'outQuad');
    audio.sfx.whoosh();
    await scheduler.tween(actor, { dx: -distance }, 120, 'inQuad');
    effects.claws(target.x, target.y);
    hitHero(game, run, counter.damage);
    await scheduler.tween(actor, { dx: 0 }, 320, 'outQuad');
    return;
  }
  const distance = actorX(game.view, actor) - actor.dx - actorX(game.view, hero) - 13;
  await scheduler.tween(actor, { dx: 4, sx: 1.15, sy: 0.85 }, 150, 'outQuad');
  audio.sfx.whoosh();
  await scheduler.tween(actor, { dx: -distance, sx: 0.9, sy: 1.1 }, 110, 'inQuad');
  hitHero(game, run, counter.damage);
  await scheduler.tween(actor, { dx: 0, sx: 1, sy: 1 }, 300, 'outQuad');
}

async function drinkPotion(game, run, drink) {
  const { world, hud, effects, audio, scheduler } = game;
  const point = center(game, world.hero);
  const head = top(game, world.hero);
  hud.setPotion(null);
  effects.heal(point.x, point.y);
  hud.floatText(head.x, head.y, `+${drink.healed}`, 'heal');
  hud.floatText(head.x, head.y - 10, t('float.glug'), 'label');
  hud.setHeroHp(run.hero.hp, run.hero.maxHp);
  audio.sfx.potion();
  hud.announce(t('announce.potion', { potion: potionName(drink.potion), healed: drink.healed }));
  await scheduler.wait(420);
}

export async function enrage(game, foe, actor) {
  const { scheduler, audio, camera, hud } = game;
  const head = top(game, actor);
  actor.mouthOpen = true;
  audio.sfx.roar();
  camera.shake(2.2, 700);
  camera.setTint('#e43b44', 0.1, true);
  hud.setEnraged(true);
  hud.floatText(head.x, head.y, t('float.enraged'), 'label-rage');
  hud.announce(t('announce.enraged', { name: foeName(foe) }));
  await scheduler.wait(760);
  actor.mouthOpen = false;
}

export async function monsterDeath(game, actor) {
  const { scheduler, effects, hud } = game;
  const point = center(game, actor);
  for (let blink = 0; blink < 3; blink++) {
    actor.flash = 1;
    await scheduler.wait(55);
    actor.flash = 0;
    await scheduler.wait(55);
  }
  effects.poof(point.x, point.y);
  game.audio.sfx.thud();
  actor.visible = false;
  effects.coins(point.x, point.y, 7, game.view.groundY);
  hud.hideFoe();
  await scheduler.wait(520);
}

export async function dragonDeath(game, actor) {
  const { scheduler, effects, camera, audio, hud, particles } = game;
  const point = center(game, actor);
  camera.flash('#ffffff', 0.9, 420);
  for (let blast = 0; blast < 6; blast++) {
    const x = point.x + (Math.random() * 30 - 15);
    const y = point.y + (Math.random() * 24 - 12);
    particles.burst(x, y, { count: 18, colors: ['#fee761', '#feae34', '#f77622', '#ffffff'], speed: [0.03, 0.12], life: [240, 520], size: [1, 3], kind: 'ember' });
    if (blast % 2 === 0) audio.sfx.boom();
    camera.shake(2.6, 200);
    actor.flash = blast % 2 === 0 ? 1 : 0;
    await scheduler.wait(130);
  }
  actor.visible = false;
  effects.poof(point.x, point.y);
  effects.coins(point.x, point.y - 4, 44, game.view.groundY);
  camera.shake(4, 520);
  audio.sfx.boom();
  camera.setTint('#e43b44', 0);
  hud.setEnraged(false);
  hud.hideBoss();
  await scheduler.wait(750);
}

export async function heroDeath(game) {
  const { world, scheduler, audio, effects, camera } = game;
  const hero = world.hero;
  hero.variant = 'gray';
  hero.idle = false;
  hero.holdAlpha = 0;
  camera.shake(2, 260);
  audio.sfx.defeat();
  await scheduler.tween(hero, { rot: -1.57, dy: 1, dx: -2 }, 420, 'outBounce');
  await scheduler.wait(380);
  const prop = world.prop;
  Object.assign(prop, { key: 'tile:65', anchor: hero.anchor, dx: 10, dy: -60, visible: true, height: 16 });
  await scheduler.tween(prop, { dy: 0 }, 300, 'inQuad');
  audio.sfx.thud();
  camera.shake(1.4, 180);
  effects.dust(actorX(game.view, prop), game.view.groundY, 10);
  await scheduler.wait(300);
}

export async function battle(game, run, foe, actor) {
  let enraged = isEnraged(foe);
  for (;;) {
    const { zone, result } = await meterRound(game, run, foe);
    if (result.killed === true && foe.kind === 'dragon' && game.reducedMotion === false) game.scheduler.slowmo(0.3, 650);
    const closeMeter = game.scheduler.wait(zone === 'crit' ? 280 : 170).then(() => game.hud.meter.close());
    await heroAttack(game, run, foe, actor, zone);
    impact(game, run, foe, actor, result);
    await closeMeter;
    if (result.killed === true) {
      if (foe.kind === 'dragon') await dragonDeath(game, actor);
      else await monsterDeath(game, actor);
      return 'won';
    }
    if (enraged === false && isEnraged(foe) === true) {
      enraged = true;
      await enrage(game, foe, actor);
    }
    await game.scheduler.wait(240);
    const counter = easyCounter(run, foe);
    await foeAttack(game, run, foe, actor, counter);
    if (counter.killed === true) {
      await heroDeath(game);
      return 'lost';
    }
    if (counter.potion !== null) await drinkPotion(game, run, counter.potion);
    await game.scheduler.wait(160);
  }
}

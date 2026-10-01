import { t } from '../../i18n.js';
import { positionAt, zoneForMs, MAX_TAP_MS } from '../../meter.js';
import { actorX } from '../../stage/world.js';
import { impact, monsterDeath } from '../../scenes/battle.js';
import { center, top, flash, knock } from '../../scenes/common.js';
import { applyIcon } from '../../ui/icons.js';
import { restartable } from '../../real/prompt.js';
import { createLiveJudge } from '../judge.js';
import { absorbOf, healAmount } from '../engine.js';
import { WEAPONS, POTIONS, TAP_EXTRA } from '../content.js';
import { hasIcon } from '../rooms.js';
import { updateWeapon, updateShield, updatePotions } from '../../ui/deep/gear.js';
import { el, append } from '../../ui/dom.js';
import { addScore, pointsFloat, foeLabel, keyed, tutorial, lumiSay } from './common.js';

const ELITE_SCALE = 1.4;
const RESET = { variant: 'base', dx: 0, dy: 0, sx: 1, sy: 1, rot: 0, alpha: 1, flash: 0, idle: true, mouthOpen: false, baseScale: 1, flip: false, hold: null };

function frames(names, ms) {
  return (now) => {
    const available = names.filter((name) => hasIcon(name) === true);
    if (available.length === 0) return 'tile:104';
    return `icon:${available[Math.floor(now / ms) % available.length]}`;
  };
}

export function setupFoeActor(scene, foe) {
  const actor = scene.game.world.foe;
  if (foe.id === 'manager') {
    Object.assign(actor, RESET, {
      key: (now) => {
        const name = scene.managerFrame(now);
        return hasIcon(name) === true ? `icon:${name}` : 'tile:86';
      },
      targetAnchor: 0.72,
      height: 32,
      shadow: 9,
    });
  } else if (foe.id === 'moth') {
    Object.assign(actor, RESET, {
      key: (now) => {
        const prefix = scene.mothEnraged === true ? 'mothEnraged' : 'moth';
        const order = [0, 1, 2, 1];
        const name = `${prefix}${order[Math.floor(now / 110) % order.length]}`;
        return hasIcon(name) === true ? `icon:${name}` : 'tile:120';
      },
      targetAnchor: Math.min(0.7, (scene.game.view.W - 34) / scene.game.view.W),
      height: 48,
      shadow: 16,
      idle: false,
      dy: -18,
    });
  } else if (foe.id === 'bug') {
    Object.assign(actor, RESET, { key: frames(['bug0', 'bug1'], 90), targetAnchor: 0.72, height: 16, shadow: 5, idle: false, dy: -10 });
  } else if (foe.id === 'glitch') {
    Object.assign(actor, RESET, { key: frames(['glitch0', 'glitch1'], 70), targetAnchor: 0.72, height: 16, shadow: 5, idle: false, dy: -6 });
  } else {
    Object.assign(actor, RESET, { key: foe.key, variant: foe.variant ?? 'base', targetAnchor: 0.72, height: 16, shadow: 6 });
  }
  if (foe.rank === 'elite') Object.assign(actor, { baseScale: ELITE_SCALE, sx: ELITE_SCALE, sy: ELITE_SCALE, height: Math.round(16 * ELITE_SCALE), shadow: 9 });
  return actor;
}

function foeShim(foe) {
  const boss = foe.rank === 'midboss' || foe.rank === 'boss';
  return { id: foe.id, kind: boss === true ? 'boss' : 'monster', name: foeLabel(foe), hp: foe.hp, maxHp: foe.maxHp };
}

function showFoeCard(scene, foe) {
  const card = document.getElementById('foe-card');
  card.querySelector('[data-role="name"]').textContent = foeLabel(foe);
  const portrait = card.querySelector('[data-role="portrait"]');
  const key = foe.id === 'bug' ? 'icon:bug0' : foe.key;
  applyIcon(portrait, key, window.innerWidth <= 620 ? 2 : 3);
  portrait.classList.toggle('is-shadow', foe.variant === 'shadow');
  scene.game.hud.setFoeHp(foe.hp, foe.maxHp, true);
  card.hidden = false;
}

export function showBossBar(scene, foe) {
  scene.game.hud.showBoss({ name: foeLabel(foe), title: t(`deep.foe.${foe.id}.title`), hp: foe.hp, maxHp: foe.maxHp, segment: foe.maxHp / 10 });
}

export async function foeAppear(scene, event) {
  const { game } = scene;
  const { scheduler, audio, hud } = game;
  const foe = { ...event.foe };
  const actor = game.world.foe;
  scene.foe = foe;
  if (foe.id === 'moth' && event.returning === true) {
    await scene.boss.mothReturns(scene, foe);
    return;
  }
  if (foe.id === 'manager' || (foe.id === 'moth' && event.returning === false)) return;
  if (scene.foeEntered !== true || actor.visible === false) {
    setupFoeActor(scene, foe);
    Object.assign(actor, { anchor: 1.15, visible: true });
    audio.sfx.whoosh();
    await scheduler.tween(actor, { anchor: actor.targetAnchor }, 520, 'outQuad');
  }
  scene.foeEntered = false;
  showFoeCard(scene, foe);
  const head = top(game, actor);
  if (foe.id !== 'mimic') hud.floatText(head.x, head.y - 4, t(foe.rank === 'elite' ? 'deep.float.elite' : 'float.wild', { name: foeLabel(foe) }), foe.rank === 'elite' ? 'label-rage' : 'label');
  hud.announce(t('deep.announce.foe', { name: foeLabel(foe), hp: foe.hp }));
  audio.sfx.select();
  const baseDy = actor.dy;
  await scheduler.tween(actor, { dy: baseDy - 6 }, 120, 'outQuad');
  await scheduler.tween(actor, { dy: baseDy }, 140, 'inQuad');
  await scheduler.wait(200);
  if (foe.armor > 0) await tutorial(scene, 'armor', { icon: 'icon:towerShield' });
  if (foe.id === 'ghost') await tutorial(scene, 'ghost', { icon: 'tile:121' });
  if (foe.id === 'glitch') await tutorial(scene, 'glitch', { icon: 'icon:glitch0' });
}

export async function promptStrike(scene, need) {
  const { game } = scene;
  game.scheduler.setSpeed(1);
  if (scene.strikes === 0) await tutorial(scene, 'strike', { icon: 'icon:stick' });
  return restartable(scene, async (attempt) => {
    game.scheduler.setSpeed(1);
    game.hud.meter.open(need.meter, { label: scene.strikes < 2 });
    const meter = document.getElementById('meter');
    meter.classList.toggle('is-fading', need.meter.fade === true);
    meter.classList.toggle('is-glitching', need.meter.shake === true);
    meter.classList.toggle('is-dusted', need.meter.dusted === true);
    attempt.onCancel(() => game.hud.meter.close());
    const tappedAt = await game.input.nextTap({ guardMs: 140 });
    const ms = Math.min(MAX_TAP_MS, Math.round(game.hud.meter.elapsed(tappedAt)));
    game.hud.meter.stop(positionAt(ms, need.meter.sweepMs), zoneForMs(ms, need.meter));
    game.audio.sfx.tick();
    scene.strikes += 1;
    return { type: 'strike', ms };
  });
}

async function heroSwing(scene, zone) {
  const { game, state } = scene;
  const { world, scheduler, audio, effects } = game;
  const hero = world.hero;
  const actor = world.foe;
  const weapon = WEAPONS[state.hero.weapon.id];
  const target = center(game, { ...actor, height: Math.min(actor.height ?? 16, 32) });
  if (weapon.family === 'spell') {
    audio.sfx.whoosh();
    await scheduler.tween(hero, { dy: -5, holdRot: -1.2, holdY: 7 }, 150, 'outQuad');
    if (weapon.fx === 'lightning') {
      effects.lightning(target.x, game.view.groundY + Math.min(0, actor.dy));
      await scheduler.wait(50);
    } else {
      await effects.fireball(actorX(game.view, hero) + 7, game.view.groundY - 12, target.x, target.y);
    }
    scheduler.tween(hero, { dy: 0, holdRot: -0.35, holdY: 3 }, 240, 'outQuad');
    return;
  }
  const reach = (actor.height ?? 16) >= 28 ? 26 : 15;
  const distance = Math.max(0, actorX(game.view, actor) - actor.dx - actorX(game.view, hero) + hero.dx - reach);
  audio.sfx.whoosh();
  await scheduler.tween(hero, { dx: -3, holdRot: -1.4 }, 90, 'outQuad');
  await scheduler.tween(hero, { dx: distance, holdRot: 1.4 }, 110, 'inQuad');
  effects.slash(target.x - 2, target.y, zone === 'crit' ? '#fee761' : '#ffffff');
  scheduler.tween(hero, { dx: 0, holdRot: -0.35 }, 280, 'outQuad');
}

export async function strike(scene, event) {
  const { game } = scene;
  const foe = scene.foe;
  const actor = game.world.foe;
  foe.hp = event.foeHp;
  if (event.foeHp === 0 && (foe.rank === 'midboss' || foe.rank === 'boss') && game.reducedMotion === false) game.scheduler.slowmo(0.3, 650);
  const closeMeter = game.scheduler.wait(event.zone === 'crit' ? 280 : 170).then(() => game.hud.meter.close());
  await heroSwing(scene, event.zone);
  scene.streakRun.stats.streak = Math.max(0, event.streak - 1);
  impact(game, scene.streakRun, foeShim(foe), actor, { zone: event.zone, damage: event.damage });
  if (event.riposte === true) {
    const head = top(game, actor);
    game.hud.floatText(head.x - 6, head.y - 22, t('deep.float.riposte'), 'label-crit');
  }
  scene.stage.state.riposte = false;
  pointsFloat(scene, actor, event.points, event.zone === 'crit' ? 'points-gold' : 'points');
  addScore(scene, event.points);
  updateWeapon(event.weapon, false);
  const weaponDef = WEAPONS[event.weapon.id];
  if (event.weapon.dur !== null && weaponDef.durability !== null && event.weapon.dur > 0 && event.weapon.dur <= Math.ceil(weaponDef.durability * 0.2) && scene.warned.has(`w:${event.weapon.id}`) === false) {
    scene.warned.add(`w:${event.weapon.id}`);
    lumiSay(scene, 'deep.fairy.worn', { item: t(`deep.item.${event.weapon.id}`) }, 2600);
  }
  await closeMeter;
}

export async function itemBreak(scene, event) {
  const { game, state } = scene;
  const { scheduler, audio, effects, hud, world } = game;
  const hero = world.hero;
  const point = center(game, hero);
  audio.sfx.shatter();
  effects.sparks(point.x + 6, point.y - 2, ['#c0cbdc', '#8b9bb4', '#ffffff'], 18, 1.1);
  hud.floatText(point.x, point.y - 20, t('deep.float.broke', { item: t(`deep.item.${event.item}`) }), 'label-rage');
  if (event.slot === 'weapon') {
    hero.holdAlpha = 0;
    await scheduler.wait(260);
    hero.hold = WEAPONS.stick.key;
    hero.holdAlpha = 1;
    updateWeapon(state.hero.weapon);
  } else {
    updateShield(state.hero.shield);
  }
  if (scene.warned.has('broke') === false) {
    scene.warned.add('broke');
    lumiSay(scene, event.slot === 'weapon' ? 'deep.fairy.brokeWeapon' : 'deep.fairy.brokeShield', {}, 2800);
  }
  await scheduler.wait(300);
}

export async function poisonTick(scene, event) {
  const { game, state } = scene;
  const head = top(game, game.world.hero);
  const buzz = el('div', 'poison-buzz');
  document.getElementById('fx').append(buzz);
  setTimeout(() => buzz.remove(), 520);
  game.camera.shake(1.3, 260);
  game.audio.sfx.buzz();
  game.hud.floatText(head.x, head.y - 6, `-${event.damage}`, 'poison');
  flash(game, game.world.hero, 220);
  game.hud.setHeroHp(event.heroHp, state.hero.maxHp);
  await game.scheduler.wait(320);
}

function heroCenter(scene) {
  return center(scene.game, scene.game.world.hero);
}

function foeHand(scene) {
  const { game } = scene;
  const actor = game.world.foe;
  const x = actorX(game.view, actor) - 8;
  const y = game.view.groundY + Math.min(0, actor.dy) - (actor.height ?? 16) * 0.6;
  return { x, y };
}

function scheduleFoeMoves(scene, attack, t0, timers) {
  const { game } = scene;
  const { scheduler, audio } = game;
  const actor = game.world.foe;
  const hero = game.world.hero;
  const lead = 170;
  const projectile = attack.projectile;
  const moth = scene.foe.id === 'moth';
  const later = (ms, fn) => timers.push(setTimeout(fn, Math.max(0, ms - (performance.now() - t0))));
  scheduler.tween(actor, { sx: (actor.baseScale ?? 1) * 1.12, sy: (actor.baseScale ?? 1) * 0.9 }, 220, 'outQuad').then(() => scheduler.tween(actor, { sx: actor.baseScale ?? 1, sy: actor.baseScale ?? 1 }, 240, 'outQuad'));
  if (projectile !== null || attack.dust === true) {
    const icon = attack.dust === true ? 'mothDust' : projectile;
    const flight = 430;
    attack.beats.forEach((beat) => {
      later(beat - flight, () => {
        const from = foeHand(scene);
        const to = heroCenter(scene);
        scene.stage.addProjectile({ icon, fromX: from.x, fromY: from.y, toX: to.x + 2, toY: to.y, startAt: t0 + beat - flight, arriveAt: t0 + beat, arc: icon === 'seed' ? 4 : 14, spin: icon === 'padlock' || icon === 'stickyNote' ? 1 : 0 });
        audio.sfx.whoosh();
      });
    });
    return;
  }
  const reach = moth === true ? 20 : (actor.height ?? 16) >= 28 ? 22 : 13;
  const distance = () => actorX(game.view, actor) - actor.dx - actorX(game.view, hero) - reach;
  attack.beats.forEach((beat, index) => {
    later(beat - lead - (index === 0 ? 110 : 0), () => {
      if (index === 0) {
        audio.sfx.whoosh();
        scheduler.tween(actor, { dx: -distance(), dy: moth === true ? -4 : actor.dy }, lead + 110, 'inQuad');
      } else {
        scheduler.tween(actor, { dx: -distance() + 7 }, lead / 2, 'outQuad').then(() => scheduler.tween(actor, { dx: -distance() }, lead / 2, 'inQuad'));
      }
    });
  });
  const last = attack.beats[attack.beats.length - 1];
  later(last + 120, () => scheduler.tween(actor, { dx: 0, dy: moth === true ? -18 : actor.id === 'bug' ? -10 : 0 }, 300, 'outQuad'));
}

const LABELS = {
  defend: { perfect: 'deep.float.parry', good: 'deep.float.block' },
  dodge: { perfect: 'deep.float.jumpPerfect', good: 'deep.float.jump' },
  horde: { perfect: 'deep.float.slashPerfect', good: 'deep.float.slash' },
};

function liveFeedback(scene, grade, local, mode = 'defend') {
  const { game } = scene;
  const { hud, audio, camera, effects } = game;
  const hero = game.world.hero;
  const point = heroCenter(scene);
  const head = top(game, hero);
  const labels = LABELS[mode];
  if (grade === 'perfect') {
    if (mode === 'defend') {
      audio.sfx.clang();
      camera.shake(1.4, 140);
      effects.sparks(point.x + 7, point.y, ['#fee761', '#ffffff', '#feae34'], 14, 1.1);
      knock(game, game.world.foe, 5, 220);
    }
    hud.floatText(head.x, head.y - 4, t(labels.perfect), 'label-crit');
  } else if (grade === 'good') {
    if (mode === 'defend') {
      audio.sfx.block();
      effects.sparks(point.x + 6, point.y, ['#75e3ff', '#c0cbdc'], 8, 0.8);
      knock(game, hero, -2, 180);
    }
    hud.floatText(head.x, head.y - 4, t(labels.good), 'label');
  } else if (grade === 'early') {
    hud.floatText(head.x, head.y - 4, t('float.early'), 'label');
  } else if (grade === 'flail') {
    hud.floatText(head.x, head.y - 4, t('deep.float.flail'), 'label-rage');
  }
  if (local !== null && local.damage > 0) {
    flash(game, hero, 200);
    knock(game, hero, -4, 280);
    camera.shake(1.8, 180);
    hud.floatText(head.x + 4, head.y + 6, `-${local.damage}`, 'hurt');
    hud.setHeroHp(local.hp, scene.state.hero.maxHp);
    audio.sfx.hurt();
  }
}

function localDamage(hero, attack, grade) {
  if (grade === 'perfect') return 0;
  if (grade === 'good') return Math.ceil(attack.damage * (1 - absorbOf(hero, attack.heavy)) - 1e-9);
  return attack.damage;
}

export function liveBeats(scene, { beats, windows, extra, approach, heavy = false, onBeat = null, onGrade = null, onTap = null, damageFor, mode = 'defend', rings = true }) {
  const { game } = scene;
  let committed = false;
  return restartable(scene, (attempt) => {
    const t0 = performance.now();
    const judge = createLiveJudge(beats, windows, extra);
    const timers = [];
    const taps = [];
    let hp = scene.state.hero.hp;
    let settled = false;
    const outcomes = beats.map(() => null);
    if (rings === true) scene.stage.addRings(beats, approach, t0, heavy);
    else scene.stage.addMarkers(beats, t0);
    const resolveBeat = (index, grade, early = false) => {
      if (outcomes[index] !== null) return;
      committed = true;
      const damage = Math.min(hp, damageFor(grade, index));
      outcomes[index] = { grade, damage };
      scene.stage.resolveRing(index, grade, performance.now());
      const land = () => {
        hp -= damage;
        liveFeedback(scene, early === true ? 'early' : grade, damage > 0 || grade === 'miss' ? { damage, hp } : null, mode);
        if (onGrade !== null) onGrade(grade, index, damage);
      };
      if (grade === 'miss' && early === true) {
        liveFeedback(scene, 'early', null, mode);
        timers.push(setTimeout(() => {
          hp -= damage;
          liveFeedback(scene, 'miss', { damage, hp }, mode);
          if (onGrade !== null) onGrade('miss', index, damage);
        }, Math.max(0, beats[index] - (performance.now() - t0))));
        return;
      }
      land();
    };
    return new Promise((resolve) => {
      const finish = () => {
        if (settled === true) return;
        settled = true;
        for (const timer of timers) clearTimeout(timer);
        game.input.cancelAll();
        scene.stage.clearRings();
        resolve(taps.slice(0, 64));
      };
      attempt.onCancel(() => {
        settled = true;
        for (const timer of timers) clearTimeout(timer);
        scene.stage.clearRings();
        scene.stage.clearProjectiles();
        scene.stage.clearMinions();
      });
      if (onBeat !== null) onBeat(t0, timers);
      beats.forEach((beat, index) => {
        timers.push(
          setTimeout(() => {
            for (const missed of judge.expire(performance.now() - t0)) resolveBeat(missed.index, 'miss');
          }, beat + windows.good + 4),
        );
      });
      timers.push(setTimeout(finish, beats[beats.length - 1] + windows.good + 90));
      const listen = () => {
        game.input.nextTap({ guardMs: 30 }).then((at) => {
          if (settled === true) return;
          const ms = Math.round(at - t0);
          taps.push(ms);
          committed = true;
          if (onTap !== null) onTap(ms);
          const missed = judge.expire(ms);
          for (const entry of missed) resolveBeat(entry.index, 'miss');
          const result = judge.tap(ms);
          if (result !== null && result.grade === 'flail') {
            if (scene.flailShown !== true) liveFeedback(scene, 'flail', null, mode);
            scene.flailShown = true;
          } else if (result !== null) {
            resolveBeat(result.index, result.grade, result.grade === 'miss' && result.error < 0);
          }
          listen();
        });
      };
      listen();
    });
  }, { canRestart: () => committed === false });
}

export async function attackTelegraph(scene, event) {
  const beats = event.attack.beats.length;
  if (beats > 1) {
    const head = top(scene.game, scene.game.world.foe);
    scene.game.hud.floatText(head.x, head.y - 8, t('deep.float.hits', { n: beats }), 'label-rage');
  }
  if (scene.foe !== null && scene.foe.id === 'manager') await scene.boss.managerLine(scene, event.attack);
  else if (scene.foe !== null && scene.foe.id === 'moth') await scene.boss.mothTell(scene, event.attack);
  else await scene.game.scheduler.wait(120);
}

export async function promptDefend(scene, need) {
  const { state } = scene;
  if (scene.defends === 0) await tutorial(scene, 'defend', { icon: 'icon:kiteShield' });
  scene.defends += 1;
  scene.flailShown = false;
  const attack = need.attack;
  const taps = await liveBeats(scene, {
    beats: attack.beats,
    windows: need.windows,
    extra: TAP_EXTRA.defend,
    approach: attack.beats[0],
    heavy: attack.heavy,
    onBeat: (t0, timers) => scheduleFoeMoves(scene, attack, t0, timers),
    damageFor: (grade) => localDamage(state.hero, attack, grade),
  });
  scene.stage.clearProjectiles();
  return { type: 'defend', taps };
}

export async function defend(scene, event) {
  const { game, state } = scene;
  const actor = game.world.foe;
  game.scheduler.tween(actor, { dx: 0 }, 200, 'outQuad');
  game.hud.setHeroHp(event.heroHp, state.hero.maxHp);
  updateShield(event.shield, false);
  const points = event.results.reduce((sum, result) => sum + result.points, 0);
  if (points > 0) {
    pointsFloat(scene, game.world.hero, points, 'points');
    addScore(scene, points);
  }
  if (event.poisoned === true && scene.poisoned !== true) {
    scene.poisoned = true;
    scene.setPoisoned(true);
    const head = top(game, game.world.hero);
    game.hud.floatText(head.x, head.y - 14, t('float.poison'), 'poison');
    lumiSay(scene, 'deep.fairy.poisoned', {}, 3200);
  }
  if (event.dusted === true) {
    const head = top(game, game.world.hero);
    game.hud.floatText(head.x, head.y - 14, t('deep.float.dusted'), 'label-rage');
  }
  scene.stage.state.riposte = event.riposte === true;
  await game.scheduler.wait(220);
}

export async function promptPotion(scene, need) {
  const { game, state } = scene;
  const card = el('div', 'panel-card potion-pick');
  const actions = el('div', 'potion-actions');
  let key = 1;
  for (const option of need.options) {
    const button = el('button', option === need.options[0] && option !== 'save' ? 'btn btn-primary' : 'btn');
    button.type = 'button';
    button.dataset.choice = option;
    button.dataset.key = String(key++);
    if (option === 'save') append(button, el('span', '', t('real.save')));
    else {
      const icon = el('span', 'px-icon');
      applyIcon(icon, POTIONS[option].key, 2);
      append(button, icon, el('span', '', t('deep.potion.drink', { potion: t(`deep.item.${option}`), heal: healAmount(scene.state, POTIONS[option].heal) })));
    }
    actions.append(button);
  }
  append(card, el('p', 'eyebrow', t('real.potionEyebrow')), el('h2', 'panel-title', t('real.potionQuestion')), el('p', 'panel-subtitle', t('hud.hp', { hp: need.hp, max: need.maxHp })), actions);
  game.hud.panel(card);
  const { choice } = await keyed(scene, card, 450);
  game.audio.sfx.select();
  await game.hud.closePanel();
  state.lastPotionChoice = choice;
  return { type: 'potion', choice };
}

export async function drink(scene, event) {
  const { game, state } = scene;
  const { hud, effects, audio, scheduler, world } = game;
  const point = center(game, world.hero);
  const head = top(game, world.hero);
  effects.heal(point.x, point.y);
  hud.floatText(head.x, head.y, `+${event.healed}`, 'heal');
  hud.floatText(head.x, head.y - 10, t('float.glug'), 'label');
  hud.setHeroHp(event.heroHp, state.hero.maxHp);
  updatePotions(event.potions);
  audio.sfx.potion();
  if (event.cured === true) {
    scene.poisoned = false;
    scene.setPoisoned(false);
    effects.sparkle(point.x, point.y, ['#63c74d', '#feffd6'], 12);
    hud.floatText(head.x, head.y - 20, t('deep.float.cured'), 'heal');
  }
  await scheduler.wait(520);
}

export async function kill(scene, event) {
  const { game } = scene;
  const actor = game.world.foe;
  addScore(scene, event.points);
  const head = top(game, actor);
  if (event.foe.id === 'manager') await scene.boss.managerDeath(scene);
  else if (event.foe.id === 'moth') return;
  else await monsterDeath(game, actor);
  game.hud.floatText(head.x, head.y, `+${event.points}`, 'points-gold');
  scene.foe = null;
}

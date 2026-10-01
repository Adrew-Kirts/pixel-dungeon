import { t } from '../../i18n.js';
import { actorX } from '../../stage/world.js';
import { center, top } from '../../scenes/common.js';
import { heroDeath } from '../../scenes/battle.js';
import { el, append } from '../../ui/dom.js';
import { applyIcon } from '../../ui/icons.js';
import { speakAs, fairySay, hideFairyBubble, talkSkip } from './common.js';
import { setupFoeActor, showBossBar } from './fight.js';
import { firstName } from './world.js';

const MELON = ['#e43b44', '#ff706d', '#63c74d', '#3e8948', '#265c42', '#181425'];

function managerAnchor(scene) {
  const { game } = scene;
  const actor = game.world.foe;
  return { x: actorX(game.view, actor) - 10, y: game.view.groundY - 34 };
}

function mothAnchor(scene) {
  const { game } = scene;
  const actor = game.world.foe;
  return { x: actorX(game.view, actor) - 22, y: game.view.groundY + actor.dy - 34 };
}

export function createBoss(scene) {
  scene.managerMood = 'calm';
  scene.managerTalking = false;
  scene.mothEnraged = false;
  scene.managerFrame = (now) => {
    const open = scene.managerTalking === true && Math.floor(now / 110) % 2 === 0;
    if (scene.managerMood === 'headless') return 'managerHeadless';
    if (scene.managerMood === 'melon') return open === true ? 'managerMelonTalk' : 'managerMelon';
    if (scene.managerMood === 'angry') return 'managerAngry';
    return open === true ? 'managerTalk' : 'manager';
  };

  async function managerSay(text, holdMs = 1100) {
    const anchor = managerAnchor(scene);
    scene.managerTalking = true;
    const voice = scene.managerMood === 'melon' ? 'grunt' : 'voice';
    await speakAs(scene, t('deep.manager.speaker'), text, anchor.x, anchor.y, { holdMs: 0, voice, keep: true });
    scene.managerTalking = false;
    await scene.game.scheduler.wait(holdMs);
    scene.game.hud.speech.hide();
  }

  async function mothSay(text, holdMs = 1200) {
    const anchor = mothAnchor(scene);
    await speakAs(scene, t('deep.moth.speaker'), text, anchor.x, anchor.y, { holdMs, voice: 'pixie' });
  }

  return {
    async midbossIntro() {
      const { game } = scene;
      const { scheduler, audio, hud, camera } = game;
      const actor = setupFoeActor(scene, { id: 'manager' });
      Object.assign(actor, { anchor: actor.targetAnchor, visible: true, alpha: 0 });
      await scheduler.tween(actor, { alpha: 1 }, 400, 'linear');
      await scheduler.wait(300);
      audio.sfx.grunt();
      await managerSay('. .', 700);
      await managerSay(t('deep.manager.intro', { name: firstName(scene.state.hero) }), 1100);
      audio.sfx.rumble();
      camera.shake(1.2, 500);
      hud.banner(t('deep.foe.manager'), t('deep.foe.manager.title'));
      await scheduler.wait(1500);
      hud.hideBanner();
      scene.foe = { id: 'manager', rank: 'midboss', hp: 160, maxHp: 160 };
    },
    async managerAppear(foe) {
      scene.foe = foe;
      showBossBar(scene, foe);
      await scene.game.scheduler.wait(200);
    },
    async managerLine(_scene, attack) {
      if (attack.line === null) return;
      if (attack.line === 'hmpf') {
        scene.game.audio.sfx.grunt();
        await managerSay('. .', 500);
        return;
      }
      await managerSay(t(`deep.manager.${attack.line}`, { name: firstName(scene.state.hero) }), 450);
    },
    async melon() {
      const { game } = scene;
      const { scheduler, audio, camera, hud, effects } = game;
      const actor = game.world.foe;
      scene.managerMood = 'angry';
      audio.sfx.roar();
      camera.shake(2, 500);
      await managerSay(t('deep.manager.melon'), 500);
      for (let blink = 0; blink < 6; blink++) {
        scene.managerMood = blink % 2 === 0 ? 'melon' : 'angry';
        actor.flash = blink % 2 === 0 ? 0.8 : 0;
        audio.sfx.tick();
        await scheduler.wait(90);
      }
      actor.flash = 0;
      scene.managerMood = 'melon';
      audio.sfx.splat();
      camera.flash('#63c74d', 0.4, 260);
      camera.setTint('#e43b44', 0.1, true);
      const head = top(game, actor);
      effects.sparks(head.x, head.y + 8, ['#63c74d', '#e43b44', '#fee761'], 16, 1);
      hud.setEnraged(true);
      hud.floatText(head.x, head.y, t('deep.float.melon'), 'label-rage');
      await scheduler.wait(700);
    },
    async managerDeath() {
      const { game } = scene;
      const { scheduler, audio, camera, hud, particles, effects } = game;
      const actor = game.world.foe;
      const head = top(game, actor);
      scene.lastFoePoint = center(game, actor);
      await scheduler.wait(200);
      for (let wobble = 0; wobble < 4; wobble++) {
        actor.sx = 1.08;
        actor.sy = 0.94;
        await scheduler.wait(70);
        actor.sx = 0.94;
        actor.sy = 1.06;
        await scheduler.wait(70);
      }
      actor.sx = 1;
      actor.sy = 1;
      audio.sfx.splat();
      camera.shake(4, 520);
      camera.flash('#e43b44', 0.5, 300);
      particles.burst(head.x, head.y + 10, { count: 60, colors: MELON, speed: [0.04, 0.16], life: [500, 1100], size: [1, 3], kind: 'ember' });
      particles.burst(head.x, head.y + 10, { count: 24, colors: ['#181425'], speed: [0.05, 0.14], life: [700, 1200], size: [1, 2], kind: 'ember' });
      splatter();
      scene.managerMood = 'headless';
      hud.setEnraged(false);
      camera.setTint('#e43b44', 0);
      await scheduler.wait(500);
      await scheduler.tween(actor, { rot: 1.4, dy: 2 }, 420, 'outBounce');
      audio.sfx.thud();
      effects.dust(actorX(game.view, actor), game.view.groundY, 12);
      await scheduler.tween(actor, { alpha: 0 }, 500, 'linear');
      actor.visible = false;
      hud.hideBoss();
      hud.floatText(head.x, head.y, t('deep.float.managerDown'), 'label-crit');
      await scheduler.wait(400);
    },
    async reveal() {
      const { game } = scene;
      const { scheduler, audio, camera, hud, effects, view } = game;
      const fairy = scene.stage.state.fairy;
      game.world.foe.visible = false;
      scheduler.tween(game.lighting, { darkness: 0.86 }, 800, 'linear');
      const point = scene.stage.fairyPosition(view, game.world.hero, scheduler.time);
      Object.assign(fairy, { follow: false, x: point.x, y: point.y, dx: 0, dy: 0 });
      await scheduler.tween(fairy, { x: view.W * 0.64, y: view.groundY - 40 }, 900, 'inOutQuad');
      await fairySay(scene, t('deep.fairy.reveal1'), 2200);
      audio.sfx.laugh();
      await fairySay(scene, t('deep.fairy.reveal2'), 2400);
      hideFairyBubble(scene);
      audio.sfx.dawn();
      audio.sfx.rumble();
      camera.shake(2, 1600);
      for (let pulse = 0; pulse < 8; pulse++) {
        fairy.sad = pulse % 2 === 0;
        fairy.scale = 1 + pulse * 0.35;
        fairy.glow = 1 + pulse * 0.4;
        audio.sfx.flutter();
        await scheduler.wait(110);
      }
      camera.flash('#ffffff', 0.9, 420);
      audio.sfx.boom();
      fairy.visible = false;
      const actor = setupFoeActor(scene, { id: 'moth' });
      Object.assign(actor, { anchor: actor.targetAnchor, visible: true, dy: -24, alpha: 1 });
      effects.sparkle(actorX(view, actor), view.groundY - 30, ['#b86f50', '#e8b796', '#feae34', '#ffffff'], 40);
      await scheduler.tween(actor, { dy: -18 }, 500, 'outQuad');
      hud.banner(t('deep.foe.moth'), t('deep.foe.moth.title'));
      await scheduler.wait(1700);
      hud.hideBanner();
      await mothSay(t('deep.moth.intro'), 1100);
      scene.foe = { id: 'moth', rank: 'boss', hp: 240, maxHp: 240 };
    },
    async mothAppear(foe) {
      scene.foe = foe;
      showBossBar(scene, foe);
      await scene.game.scheduler.wait(200);
    },
    async mothTell(_scene, attack) {
      const { game } = scene;
      game.audio.sfx.flutter();
      if (attack.move === 'dust') await mothSay(t('deep.moth.dust'), 250);
      else if (attack.move === 'frenzy') await game.scheduler.wait(150);
      else await game.scheduler.wait(160);
    },
    async spawn() {
      const { game } = scene;
      const { scheduler, audio, camera, hud } = game;
      const actor = game.world.foe;
      await mothSay(t('deep.moth.spawn'), 700);
      audio.sfx.powerDown();
      await scheduler.tween(scene.stage.state, { blackout: 0.35 }, 500, 'linear');
      camera.shake(1.4, 500);
      await scheduler.tween(actor, { dy: -140 }, 600, 'inQuad');
      actor.visible = false;
      hud.hideBoss();
      await scheduler.wait(200);
    },
    async mothReturns(_scene, foe) {
      const { game } = scene;
      const { scheduler, audio, camera, hud } = game;
      scene.mothEnraged = true;
      const actor = setupFoeActor(scene, { id: 'moth' });
      Object.assign(actor, { anchor: actor.targetAnchor, visible: true, dy: -140 });
      audio.sfx.roar();
      await scheduler.tween(actor, { dy: -18 }, 700, 'outQuad');
      camera.shake(2.4, 400);
      camera.setTint('#e43b44', 0.1, true);
      showBossBar(scene, foe);
      hud.setEnraged(true);
      await mothSay(t('deep.moth.back'), 700);
      scene.foe = foe;
    },
    async frenzy() {
      const { game } = scene;
      game.audio.sfx.roar();
      game.camera.shake(2.8, 600);
      await mothSay(t('deep.moth.frenzy'), 600);
    },
    async victory() {
      const { game } = scene;
      const { scheduler, audio, camera, hud, particles } = game;
      const actor = game.world.foe;
      camera.flash('#ffffff', 0.8, 380);
      audio.sfx.boom();
      hud.setEnraged(false);
      camera.setTint('#e43b44', 0);
      hud.hideBoss();
      const point = center(game, actor);
      for (let spin = 0; spin < 6; spin++) {
        particles.burst(point.x, point.y, { count: 14, colors: ['#e8b796', '#b86f50', '#fee761', '#ffffff'], speed: [0.02, 0.09], life: [300, 700], size: [1, 2], kind: 'ember' });
        audio.sfx.flutter();
        await scheduler.wait(120);
      }
      await scheduler.tween(actor, { dy: -2, rot: 0.6, sx: 0.4, sy: 0.4, alpha: 0.2 }, 900, 'inQuad');
      actor.visible = false;
      scene.stage.state.blackout = 0;
      await scheduler.tween(game.lighting, { darkness: 0.5 }, 600, 'linear');
      await logbook(scene);
    },
    async death(killer) {
      const { game } = scene;
      if (killer === 'moth' || killer === 'bug') game.audio.sfx.laugh();
      await heroDeath(game);
    },
  };
}

function splatter() {
  const root = document.getElementById('fx');
  const layer = el('div', 'melon-splat');
  for (let index = 0; index < 14; index++) {
    const drop = el('span', 'melon-drop');
    drop.style.left = `${8 + Math.random() * 84}%`;
    drop.style.top = `${10 + Math.random() * 70}%`;
    drop.style.setProperty('--size', `${10 + Math.random() * 26}px`);
    drop.style.animationDelay = `${Math.random() * 120}ms`;
    if (index % 4 === 0) drop.classList.add('is-seed');
    layer.append(drop);
  }
  root.append(layer);
  setTimeout(() => layer.remove(), 2400);
}

async function logbook(scene) {
  const { game } = scene;
  const root = el('div', 'cutscene logbook');
  root.setAttribute('role', 'img');
  root.setAttribute('aria-label', t('deep.logbook.aria'));
  const page = el('div', 'logbook-page');
  const moth = el('span', 'px-icon logbook-moth');
  applyIcon(moth, 'icon:moth1', 3);
  const taped = append(el('div', 'logbook-taped'), moth, el('span', 'tape tape-left'), el('span', 'tape tape-right'));
  append(
    page,
    el('p', 'logbook-head', '9/9 · 1947'),
    el('p', 'logbook-line is-key', '1545   Relay #70 Panel F (moth) in relay.'),
    taped,
    el('p', 'logbook-quote', 'First actual case of bug being found.'),
  );
  const timer = el('span', 'logbook-timer');
  timer.style.setProperty('--hold', '6800ms');
  append(root, page, el('p', 'cutscene-title logbook-title', t('deep.logbook.title')), timer, el('p', 'logbook-skip', t('deep.logbook.skip')));
  document.getElementById('app').append(root);
  game.audio.sfx.victory();
  await game.scheduler.wait(900);
  const skip = talkSkip(scene);
  await Promise.race([game.scheduler.wait(5900), skip.promise]);
  skip.done();
  root.classList.add('is-leaving');
  await game.scheduler.wait(400);
  root.remove();
}


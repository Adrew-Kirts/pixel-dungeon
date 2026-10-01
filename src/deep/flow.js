import { t } from '../i18n.js';
import { createDeepRun, expected, apply, floorItems } from './engine.js';
import { titleCard, promptCreate, heroCreated, enterNode, roomClear, promptNav, petCat } from './scenes/world.js';
import { foeAppear, promptStrike, strike, itemBreak, poisonTick, attackTelegraph, promptDefend, defend, promptPotion, drink, kill } from './scenes/fight.js';
import { arrowsStart, promptDodge, dodge, hordeStart, promptHorde, horde, trapChestPosition } from './scenes/traps.js';
import { chestOpen, drop, offer, promptLoot, take, leave, coffee } from './scenes/loot.js';
import { createBoss } from './scenes/boss.js';
import { showDeepResults } from './scenes/results.js';
import { hideFairyBubble, skipTalk } from './scenes/common.js';
import { hideDeepGear } from '../ui/deep/gear.js';
import { isFairyFriend } from '../ui/deep/fairy.js';
import { floorItemX } from './stage.js';


async function mimicReveal(scene) {
  const { game } = scene;
  const { world, scheduler, audio, camera, hud } = game;
  const chest = world.chest;
  Object.assign(chest, { key: 'tile:89', anchor: 0.72, height: 16, shadow: 7, dx: 0, dy: -40, rot: 0, alpha: 1, visible: true, idle: false, variant: 'base' });
  audio.sfx.whoosh();
  await scheduler.tween(chest, { dy: 0 }, 300, 'inQuad');
  audio.sfx.thud();
  await scheduler.wait(500);
  for (let shake = 0; shake < 3; shake++) {
    audio.sfx.chestShake();
    await scheduler.tween(chest, { rot: 0.16 }, 60, 'outQuad');
    await scheduler.tween(chest, { rot: -0.16 }, 60, 'outQuad');
  }
  chest.rot = 0;
  chest.visible = false;
  const foe = world.foe;
  Object.assign(foe, { key: 'tile:92', variant: 'base', anchor: 0.72, targetAnchor: 0.72, dx: 0, dy: 0, sx: 1.8, sy: 1, rot: 0, alpha: 1, flash: 0, visible: true, idle: true, height: 22, shadow: 9, flip: false, baseScale: 1.4 });
  scheduler.tween(foe, { sx: 1.4, sy: 1.4 }, 260, 'outBack');
  audio.sfx.roar();
  camera.shake(2.2, 300);
  hud.floatText(game.view.W * 0.72, game.view.groundY - 26, t('float.mimic'), 'label-rage');
  scene.foeEntered = true;
  await scheduler.wait(400);
}

function createScene(game, state, session) {
  const cleanups = [];
  const heroCard = document.getElementById('hero-card');
  const scene = {
    game,
    state,
    session,
    stage: game.deep.stage,
    score: 0,
    strikes: 0,
    defends: 0,
    foe: null,
    foeEntered: false,
    tips: new Set(),
    navTips: new Set(),
    warned: new Set(),
    streakRun: { stats: { streak: 0 } },
    rays: null,
    lastFoePoint: null,
    fairyTimer: 0,
    fairyRelease: () => {},
    talkSkips: new Set(),
    heroHp: 0,
    setPoisoned(value) {
      heroCard.classList.toggle('is-poisoned', value);
    },
    floorAnchor(item) {
      const floor = state.floor[state.node] ?? [];
      const index = floor.findIndex((entry) => entry.id === item.id);
      return floorItemX(game.view, state.node, Math.max(0, index)) / game.view.W;
    },
    killerName() {
      return t(`deep.killer.${state.killer ?? 'dungeon'}`);
    },
    onCleanup(fn) {
      cleanups.push(fn);
      return () => {
        const index = cleanups.indexOf(fn);
        if (index >= 0) cleanups.splice(index, 1);
      };
    },
    cleanup() {
      for (const fn of cleanups.splice(0)) fn();
      scene.setPoisoned(false);
      hideFairyBubble(scene);
    },
  };
  scene.boss = createBoss(scene);
  scene.friend = isFairyFriend(game.storage);
  const onKey = (event) => {
    if (event.repeat === true || ['Shift', 'Control', 'Alt', 'Meta', 'Tab'].includes(event.key) === true) return;
    skipTalk(scene);
  };
  const onPointer = () => skipTalk(scene);
  window.addEventListener('keydown', onKey, true);
  window.addEventListener('pointerdown', onPointer, true);
  scene.onCleanup(() => {
    window.removeEventListener('keydown', onKey, true);
    window.removeEventListener('pointerdown', onPointer, true);
    skipTalk(scene);
  });
  return scene;
}

const HANDLERS = {
  create: heroCreated,
  enter: enterNode,
  foeAppear: (scene, event) => {
    if (event.foe.id === 'manager') return scene.boss.managerAppear({ ...event.foe });
    if (event.foe.id === 'moth' && event.returning === false) return scene.boss.mothAppear({ ...event.foe });
    return foeAppear(scene, event);
  },
  strike,
  break: itemBreak,
  poisonTick,
  attack: attackTelegraph,
  defend,
  drink,
  save: async (scene) => {
    const { game } = scene;
    game.hud.floatText(game.view.W * 0.26, game.view.groundY - 30, t('float.saved'), 'label');
  },
  kill,
  roomClear,
  midbossIntro: (scene) => scene.boss.midbossIntro(),
  melon: (scene) => scene.boss.melon(),
  reveal: (scene) => scene.boss.reveal(),
  spawn: (scene) => scene.boss.spawn(),
  frenzy: (scene) => scene.boss.frenzy(),
  mimic: mimicReveal,
  arrowsStart,
  dodge,
  hordeStart,
  horde,
  chestOpen,
  drop,
  offer,
  take,
  leave,
  coffee,
  pet: petCat,
  victory: (scene) => scene.boss.victory(),
  gameOver: (scene, event) => scene.boss.death(event.killer),
};

const PROMPTS = {
  create: promptCreate,
  nav: promptNav,
  strike: promptStrike,
  defend: promptDefend,
  potion: promptPotion,
  loot: promptLoot,
  dodge: promptDodge,
  horde: promptHorde,
};

async function animate(scene, events) {
  for (let index = 0; index < events.length; index++) {
    const event = events[index];
    const handler = HANDLERS[event.type];
    if (handler !== undefined) await handler(scene, event, events.slice(index + 1));
  }
}

function syncStage(scene) {
  const { state, stage, game } = scene;
  stage.state.floorItems = state.phase === 'done' || state.node === null ? [] : floorItems(state, state.node);
  stage.state.coffee = state.coffee;
  stage.state.catAwake = state.cat === 'petted';
  if (state.node === 'c1' && state.trapChest === 'closed' && state.phase === 'nav' && game.world.chest.visible === false) trapChestPosition(scene);
}

export function createDeepFlow(game, { api, treasure, resetStage, storage, onError, fixedSeed = null }) {
  const root = document.documentElement;
  const results = document.getElementById('results');
  let token = 0;
  let scene = null;

  function clearDeep() {
    if (scene !== null) scene.cleanup();
    scene = null;
    game.deep.scene = null;
    game.deep.stage.reset();
    results.hidden = true;
    results.querySelector('[data-role="content"]').replaceChildren();
    document.getElementById('deep-create').hidden = true;
    for (const cutscene of document.querySelectorAll('.cutscene')) cutscene.remove();
    hideDeepGear();
    root.classList.remove('mode-deep');
    if (game.mode === 'deep') game.mode = 'easy';
  }

  function exit() {
    token++;
    clearDeep();
    resetStage();
    treasure.show(null, storage.getJson('record'));
  }

  async function run(preset = null) {
    const current = ++token;
    const alive = () => current === token;
    let session = null;
    if (fixedSeed === null) {
      try {
        session = await api.startRun('deep', 4000);
      } catch {
        session = null;
      }
    }
    if (alive() === false) return;
    resetStage();
    clearDeep();
    treasure.hide();
    game.mode = 'deep';
    root.classList.add('mode-deep');
    const seed = session !== null ? session.seed : fixedSeed ?? crypto.getRandomValues(new Uint32Array(1))[0];
    const state = createDeepRun({ seed });
    scene = createScene(game, state, session);
    game.deep.scene = scene;
    const activeScene = scene;
    const startedAt = performance.now();
    const pad = async () => {
      const owed = state.gameMs - (performance.now() - startedAt);
      if (owed > 0) await game.scheduler.wait(owed);
    };
    const inputs = [];
    await titleCard(activeScene);
    if (alive() === false) return;
    if (session === null) game.hud.flashWord(t('deep.offline'), 2600);
    while (state.phase !== 'done') {
      syncStage(activeScene);
      const need = expected(state);
      let input;
      if (need.type === 'create' && preset !== null) {
        input = { ...preset };
        game.api.event('deep.create');
      } else input = await PROMPTS[need.type](activeScene, need);
      if (alive() === false) return;
      const events = apply(state, input);
      inputs.push(input);
      await animate(activeScene, events);
      if (alive() === false) return;
      syncStage(activeScene);
      await pad();
      if (alive() === false) return;
    }
    game.hud.hint(null);
    await showDeepResults(activeScene, {
      api,
      session,
      body: session === null ? null : { token: session.token, inputs },
      alive,
      storage,
      onAgain: () => start(),
      onReplay: () => start(inputs[0]),
      onExit: exit,
    });
  }

  function start(preset = null) {
    run(preset).catch(onError);
  }

  return {
    start,
    exit,
    cancel() {
      token++;
      clearDeep();
    },
    active() {
      return game.mode === 'deep';
    },
    running() {
      return scene !== null && scene.state.phase !== 'done';
    },
  };
}


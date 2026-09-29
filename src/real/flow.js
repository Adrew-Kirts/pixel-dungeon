import { t, foeName } from '../i18n.js';
import { createRealRun, expected, apply } from './engine.js';
import { titleCard, promptHero, introduceHero, heroEvent, roomStart } from './scenes/hero.js';
import { foeAppear, promptStrike, strike, poisonTick, counter, grow, enraged, kill, roomClear } from './scenes/fight.js';
import { genieAsk, promptAnswer, genieAnswer } from './scenes/genie.js';
import { trapStart, promptDodge, dodge } from './scenes/trap.js';
import { weakSpot, promptAim, aim } from './scenes/weakspot.js';
import { promptPotion, potion } from './scenes/potion.js';
import { chestReady, promptChest, chest } from './scenes/chest.js';
import { victory, gameOver } from './scenes/end.js';
import { showResults } from './scenes/results.js';

const EASY_HERO_MAX_AGE_MS = 40 * 60 * 1000;
const WALL_ARROW = 'A wall arrow';

const HANDLERS = {
  hero: heroEvent,
  roomStart,
  foeAppear,
  strike,
  poisonTick,
  counter,
  grow,
  enrage: enraged,
  kill,
  roomClear,
  potion,
  chestReady,
  chest,
  genieAsk,
  genieAnswer,
  trapStart,
  dodge,
  weakSpot,
  aim,
  victory,
  gameOver,
};

const PROMPTS = {
  hero: promptHero,
  strike: promptStrike,
  potion: promptPotion,
  answer: promptAnswer,
  dodge: promptDodge,
  aim: promptAim,
  chest: promptChest,
};

function createScene(game, state, easy) {
  const cleanups = [];
  const heroCard = document.getElementById('hero-card');
  const scene = {
    game,
    state,
    easy,
    stage: game.real.stage,
    closeup: game.real.closeup,
    score: 0,
    strikes: 0,
    bossMoves: 0,
    foe: null,
    question: null,
    geniePanel: null,
    arrowFlight: null,
    heroHp: state.hero === null ? 0 : state.hero.hp,
    streakRun: { stats: { streak: 0 } },
    setPoisoned(value) {
      game.real.stage.state.poisoned = value;
      heroCard.classList.toggle('is-poisoned', value);
    },
    killerName() {
      if (state.killer === WALL_ARROW) return t('real.wallArrow');
      if (state.foe !== null) return foeName(state.foe);
      return state.killer ?? state.lastFoe ?? '';
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
    },
  };
  return scene;
}

async function animate(scene, events) {
  for (let index = 0; index < events.length; index++) {
    const event = events[index];
    const handler = HANDLERS[event.type];
    if (handler !== undefined) await handler(scene, event, events.slice(index + 1));
    if (event.type === 'hero') scene.heroHp = event.hero.hp;
    else if (typeof event.heroHp === 'number') scene.heroHp = event.heroHp;
  }
}

export function createRealFlow(game, { api, treasure, resetStage, storage, onError }) {
  const root = document.documentElement;
  const results = document.getElementById('results');
  const toast = document.getElementById('toast');
  let token = 0;
  let scene = null;
  let toastTimer = 0;

  function showToast(text) {
    clearTimeout(toastTimer);
    toast.textContent = text;
    toast.hidden = false;
    toastTimer = setTimeout(() => {
      toast.hidden = true;
    }, 3600);
  }

  function clearReal() {
    if (scene !== null) scene.cleanup();
    scene = null;
    game.real.scene = null;
    game.real.stage.reset();
    game.real.closeup.close();
    document.getElementById('boss-bar').classList.remove('is-tucked');
    results.hidden = true;
    results.querySelector('[data-role="content"]').replaceChildren();
    for (const cutscene of document.querySelectorAll('.cutscene')) cutscene.remove();
    root.classList.remove('mode-real');
    game.mode = 'easy';
  }

  function exit() {
    token++;
    clearReal();
    resetStage();
    treasure.show(null, storage.getJson('record'));
  }

  async function run({ easy }) {
    const current = ++token;
    const alive = () => current === token;
    let session;
    try {
      session = await api.startRun('real');
    } catch {
      if (alive() === true) showToast(t('real.offline'));
      return;
    }
    if (alive() === false) return;
    const usable = easy !== null && Date.now() - easy.at < EASY_HERO_MAX_AGE_MS ? easy : null;
    resetStage();
    clearReal();
    treasure.hide();
    game.mode = 'real';
    root.classList.add('mode-real');
    const state = createRealRun({ seed: session.seed, easyHero: usable === null ? null : usable.hero });
    scene = createScene(game, state, usable);
    game.real.scene = scene;
    const activeScene = scene;
    const startedAt = performance.now();
    const pad = async () => {
      const owed = state.gameMs - (performance.now() - startedAt);
      if (owed > 0) await game.scheduler.wait(owed);
    };
    const inputs = [];
    await titleCard(activeScene);
    if (alive() === false) return;
    if (state.phase !== 'hero') {
      await introduceHero(activeScene, state.hero, 'new');
      await animate(activeScene, state.initialEvents);
    }
    if (alive() === false) return;
    await pad();
    while (state.phase !== 'done') {
      const need = expected(state);
      const input = await PROMPTS[need.type](activeScene, need);
      if (alive() === false) return;
      const events = apply(state, input);
      inputs.push(input);
      await animate(activeScene, events);
      if (alive() === false) return;
      await pad();
      if (alive() === false) return;
    }
    const body = { token: session.token, inputs };
    if (usable !== null) {
      body.easy = { runId: usable.runId, token: usable.token, strikes: usable.strikes };
      if (game.lastEasy === usable) game.lastEasy = null;
    }
    game.hud.hint(null);
    await showResults(activeScene, {
      api,
      runId: session.runId,
      body,
      alive,
      storage,
      onAgain: () => start({ easy: null }),
      onExit: exit,
    });
  }

  function start(options) {
    run(options).catch(onError);
  }

  return {
    start,
    exit,
    cancel() {
      token++;
      clearReal();
    },
    active() {
      return game.mode === 'real';
    },
  };
}

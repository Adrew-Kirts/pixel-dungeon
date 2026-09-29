import { createScheduler } from './engine/scheduler.js';
import { computeView } from './engine/view.js';
import { startLoop } from './engine/loop.js';
import { createCamera } from './engine/camera.js';
import { createParticles } from './engine/particles.js';
import { loadSprites, snap } from './engine/sprites.js';
import { createInput } from './engine/input.js';
import { createAudio } from './engine/audio.js';
import { createStorage } from './engine/storage.js';
import { createWorld, drawWorld, drawDissolve, actorX } from './stage/world.js';
import { createBackground } from './stage/background.js';
import { createEffects } from './stage/effects.js';
import { createHud } from './ui/hud.js';
import { createTreasure } from './ui/treasure.js';
import { createFlow } from './flow.js';
import { initLanguage, setLanguage, getLanguage, onLanguageChange, applyStaticTranslations, t } from './i18n.js';
import { createApi } from './net/api.js';
import { createEasySeeds } from './net/seeds.js';
import { createRealFlow } from './real/flow.js';
import { createRealStage } from './real/stage.js';
import { createCloseup } from './real/closeup.js';

window.__dungeonReady = true;
const root = document.documentElement;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const params = new URLSearchParams(location.search);
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const api = createApi('');

const canvas = document.getElementById('scene');
const ctx = canvas.getContext('2d');
const storage = createStorage();
initLanguage(storage);
applyStaticTranslations();
const scheduler = createScheduler();
const camera = createCamera({ reducedMotion });
const particles = createParticles();
const audio = createAudio(storage);
const input = createInput({ root: document.getElementById('app'), keyTarget: window });
let view = computeView(window.innerWidth, window.innerHeight, window.devicePixelRatio || 1);

const game = {
  get view() {
    return view;
  },
  scheduler,
  camera,
  particles,
  audio,
  input,
  storage,
  reducedMotion,
  seeds: null,
  mode: 'easy',
  lastEasy: null,
  real: { stage: createRealStage(), closeup: createCloseup() },
  world: createWorld(),
  lighting: { darkness: 0.5 },
};
game.effects = createEffects({ scheduler, particles, camera, audio });
game.hud = createHud({ getView: () => view });
if (new URLSearchParams(location.search).has('debug') === true) window.__game = game;

let flow = null;
let realFlow = null;
let failed = false;
function fail(error) {
  if (failed === true) return;
  failed = true;
  console.error(error);
  try {
    if (realFlow !== null) realFlow.cancel();
    flow.skipToTreasure();
  } catch {
    root.classList.add('game-failed');
  }
}
window.addEventListener('error', (event) => fail(event.error ?? event.message));
window.addEventListener('unhandledrejection', (event) => fail(event.reason));

const treasure = createTreasure({
  onPlay: () => flow.start({ withBoot: false }),
  onReal: () => realFlow.start({ easy: game.lastEasy }),
  input,
});
game.seeds = createEasySeeds({
  api,
  fixedSeed: Number.isFinite(seedParam) === true ? seedParam : null,
  onAvailability: (available) => treasure.setRealAvailable(available),
});
if (Number.isFinite(seedParam) === true) {
  api
    .leaderboard()
    .then(() => treasure.setRealAvailable(true))
    .catch(() => treasure.setRealAvailable(false));
}
game.seeds.warm();
const challengeId = params.get('challenge');
if (typeof challengeId === 'string' && /^[A-Za-z0-9_-]{6,32}$/.test(challengeId) === true) {
  api
    .result(challengeId)
    .then((result) => {
      treasure.setChallenge({ initials: result.initials, score: result.score });
      const toast = document.getElementById('toast');
      toast.textContent = treasure.challengeText();
      toast.hidden = false;
      setTimeout(() => {
        toast.hidden = true;
      }, 4200);
    })
    .catch(() => {});
}

function resize() {
  view = computeView(window.innerWidth, window.innerHeight, window.devicePixelRatio || 1);
  canvas.width = view.W * view.k;
  canvas.height = view.H * view.k;
  canvas.style.width = `${view.W * view.css}px`;
  canvas.style.height = `${view.H * view.css}px`;
  canvas.style.left = `${view.offsetX}px`;
  canvas.style.top = `${view.offsetY}px`;
  game.hud.meter.resize();
}
window.addEventListener('resize', resize);
resize();

input.onIdleTap(() => {
  if (game.mode !== 'real') scheduler.setSpeed(3);
});
const unlockAudio = () => {
  if (navigator.userActivation !== undefined && navigator.userActivation.isActive === false) return;
  audio.unlock();
};
for (const type of ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown']) window.addEventListener(type, unlockAudio, { passive: true });
document.addEventListener('visibilitychange', () => {
  if (document.hidden === false && audio.context() !== null && audio.context().state !== 'running') audio.unlock();
});

const muteButton = document.getElementById('mute');
function renderMute() {
  const muted = audio.muted();
  muteButton.setAttribute('aria-pressed', String(muted));
  muteButton.setAttribute('aria-label', t(muted === true ? 'unmute' : 'mute'));
}
muteButton.addEventListener('click', (event) => {
  if (event.detail > 0) muteButton.blur();
  audio.unlock();
  audio.toggleMute();
  renderMute();
});
renderMute();

document.getElementById('lang').addEventListener('click', (event) => {
  if (event.detail > 0) event.currentTarget.blur();
  setLanguage(getLanguage() === 'fr' ? 'en' : 'fr');
});
onLanguageChange(() => {
  applyStaticTranslations();
  renderMute();
});

function showTreasureNow() {
  if (flow === null) treasure.show(null, storage.getJson('record'));
  else if (realFlow !== null && realFlow.active() === true) realFlow.exit();
  else flow.skipToTreasure();
}
document.getElementById('skip').addEventListener('click', (event) => {
  event.preventDefault();
  showTreasureNow();
});
window.addEventListener('hashchange', () => {
  if (location.hash === '#treasure' && treasure.visible() === false) showTreasureNow();
});

function render() {
  if (treasure.visible() === true) return;
  const { k, W, H } = view;
  const sprites = game.sprites;
  const now = scheduler.time;
  ctx.setTransform(k, 0, 0, k, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#181425';
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.translate(snap(camera.state.offsetX, k), snap(camera.state.offsetY, k));
  const realStage = game.real.stage;
  const lights = game.background.draw(ctx, view, game.world.camX, now, k, realStage.hiddenRanges());
  realStage.drawBack(ctx, view, game.world, sprites, now, k);
  drawWorld(ctx, view, game.world, sprites, now, k);
  realStage.drawFront(ctx, view, sprites, now, k);
  const { hero, foe } = game.world;
  if (hero.visible === true) lights.push({ x: actorX(view, hero), y: view.groundY - 9, radius: 44, strength: 0.92 });
  if (foe.visible === true) lights.push({ x: actorX(view, foe), y: view.groundY - (foe.height ?? 16) / 2, radius: foe.height >= 32 ? 58 : 36, strength: 0.75 });
  lights.push(...realStage.lights(view, game.world));
  game.background.drawLighting(ctx, view, lights, game.lighting.darkness, now);
  game.effects.draw(ctx, k);
  particles.draw(ctx, k);
  realStage.drawOverlay(ctx, view, game.world, now, k);
  ctx.restore();
  camera.drawOverlay(ctx, view, now);
  game.real.closeup.draw(ctx, view, sprites, performance.now());
  drawDissolve(ctx, view, game.world);
}

async function start() {
  if (root.classList.contains('game-failed') === true) {
    root.classList.remove('game-failed');
    treasure.show(null, storage.getJson('record'));
  }
  game.sprites = await loadSprites();
  game.background = createBackground(game.sprites);
  flow = createFlow(game, treasure, fail);
  realFlow = createRealFlow(game, { api, treasure, resetStage: flow.resetStage, storage, onError: fail });
  startLoop({
    update(realMs, now) {
      const dt = scheduler.update(realMs);
      camera.update(realMs);
      particles.update(dt);
      game.effects.update(dt);
      game.hud.update(now);
    },
    render,
  });
  if (treasure.visible() === true) return;
  if (location.hash === '#treasure') {
    treasure.show(null, storage.getJson('record'));
  } else {
    root.classList.add('mode-game');
    flow.start({ withBoot: true });
  }
}

start().catch(fail);

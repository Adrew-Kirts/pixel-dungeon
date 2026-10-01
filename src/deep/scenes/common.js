import { t, has, formatNumber } from '../../i18n.js';
import { toScreen } from '../../engine/view.js';
import { top } from '../../scenes/common.js';
import { waitForKeyedChoice, tutorialPanel } from '../../ui/real/panels.js';
import { el } from '../../ui/dom.js';

export function addScore(scene, points) {
  if (points <= 0) return;
  scene.score += points;
  scene.game.hud.score.set(scene.score);
}

export function pointsFloat(scene, actor, points, kind = 'points') {
  if (points <= 0) return;
  const head = top(scene.game, actor);
  scene.game.hud.floatText(head.x + 8, head.y - 18, `+${formatNumber(points)}`, kind);
}

export function foeLabel(foe) {
  return t(`deep.foe.${foe.id}`);
}

export async function keyed(scene, root, guardMs = 350) {
  const choice = waitForKeyedChoice(root, { guardMs });
  const unregister = scene.onCleanup(() => choice.cancel());
  const result = await choice.promise;
  unregister();
  return result;
}

export async function tutorial(scene, id, { icon = null, params = {} } = {}) {
  const { game } = scene;
  const key = `deep.tip.${id}`;
  if (scene.tips.has(id) === true) return;
  scene.tips.add(id);
  const difficulty = scene.state.difficulty;
  const variant = has(`${key}.text.${difficulty}`) === true ? difficulty : null;
  const seenId = variant === null ? id : `${id}.${variant}`;
  const seen = game.storage.getJson('deepTips') ?? [];
  if (seen.includes(seenId) === true) {
    flashHint(scene, t(variant !== null && has(`${key}.short.${variant}`) === true ? `${key}.short.${variant}` : `${key}.short`, params));
    return;
  }
  game.storage.setJson('deepTips', [...seen, seenId]);
  const text = t(variant === null ? `${key}.text` : `${key}.text.${variant}`, params);
  const panel = tutorialPanel({ eyebrow: t(`${key}.eyebrow`), title: t(`${key}.title`), text, icon }, game, 9000);
  game.hud.panel(panel.el);
  await panel.done;
  game.audio.sfx.select();
  await game.hud.closePanel();
}

function flashHint(scene, text, holdMs = 2400) {
  const { hud } = scene.game;
  if (scene.state.difficulty === 'tryhard') return;
  if (scene.stage.state.fairy.visible === true) {
    fairySay(scene, text, holdMs);
    return;
  }
  hud.hint(text);
  clearTimeout(scene.hintTimer);
  scene.hintTimer = setTimeout(() => {
    if (document.getElementById('hint').textContent === text) hud.hint(null);
  }, holdMs);
}

export function talkSkip(scene) {
  let release = () => {};
  const promise = new Promise((resolve) => {
    release = resolve;
  });
  scene.talkSkips.add(release);
  return {
    promise,
    done() {
      scene.talkSkips.delete(release);
    },
  };
}

export function skipTalk(scene) {
  if (scene.talkSkips.size === 0) return false;
  const releases = [...scene.talkSkips];
  scene.talkSkips.clear();
  for (const release of releases) release();
  return true;
}

export function fairySay(scene, text, minMs = 2600) {
  const { game } = scene;
  const holdMs = Math.max(minMs, 1800 + text.length * 55);
  const bubble = document.getElementById('fairy-bubble');
  const fairy = scene.stage.state.fairy;
  if (fairy.visible === false) return Promise.resolve();
  const point = scene.stage.fairyPosition(game.view, game.world.hero, game.scheduler.time);
  const screen = toScreen(game.view, point.x, point.y - 10);
  bubble.replaceChildren(document.createTextNode(text), el('span', 'bubble-timer'));
  bubble.style.setProperty('--hold', `${holdMs}ms`);
  bubble.hidden = false;
  bubble.classList.remove('is-popping');
  void bubble.offsetWidth;
  bubble.classList.add('is-popping');
  const width = bubble.offsetWidth;
  const left = Math.max(12, Math.min(window.innerWidth - width - 12, screen.left - 18));
  const hudBottom = document.getElementById('hud-top').getBoundingClientRect().bottom;
  let top = Math.max(hudBottom + 8, screen.top - bubble.offsetHeight - 6);
  const panel = document.querySelector('#panel:not([hidden]) .panel-card');
  bubble.classList.remove('is-detached');
  if (panel !== null) {
    const box = panel.getBoundingClientRect();
    const overlaps = left < box.right && left + width > box.left && top + bubble.offsetHeight > box.top;
    if (overlaps === true) {
      top = Math.max(hudBottom + 8, box.top - bubble.offsetHeight - 10);
      if (top + bubble.offsetHeight > box.top) {
        top = hudBottom + 8;
        bubble.classList.add('is-detached');
      }
    }
  }
  bubble.style.left = `${left}px`;
  bubble.style.top = `${top}px`;
  bubble.style.setProperty('--tail-x', `${Math.max(12, Math.min(width - 12, screen.left - left))}px`);
  game.audio.sfx.chime();
  clearTimeout(scene.fairyTimer);
  scene.fairyRelease();
  return new Promise((resolve) => {
    const skip = talkSkip(scene);
    let open = true;
    const finish = (hide) => {
      if (open === false) return;
      open = false;
      clearTimeout(scene.fairyTimer);
      skip.done();
      if (hide === true) bubble.hidden = true;
      resolve();
    };
    scene.fairyRelease = () => finish(false);
    scene.fairyTimer = setTimeout(() => finish(true), holdMs);
    skip.promise.then(() => finish(true));
  });
}

const ALWAYS_SAID = new Set(['deep.fairy.room.b1']);

export function lumiText(scene, key, params = {}) {
  const variant = `${key}.${scene.state.difficulty}`;
  if (ALWAYS_SAID.has(key) === true) return t(key, params);
  if (scene.state.difficulty === 'hard' && has(variant) === true) return t(variant, params);
  if (scene.state.difficulty !== 'tryhard') return t(key, params);
  const cryptic = `${key}.cryptic`;
  const text = t(cryptic, params);
  return text === cryptic ? null : text;
}

export function lumiSay(scene, key, params = {}, minMs = 2600) {
  const text = lumiText(scene, key, params);
  if (text === null) return Promise.resolve();
  return fairySay(scene, text, minMs);
}

export function hideFairyBubble(scene) {
  clearTimeout(scene.fairyTimer);
  scene.fairyRelease();
  document.getElementById('fairy-bubble').hidden = true;
}

export async function speakAs(scene, name, text, anchorX, anchorY, { holdMs = 1400, voice = 'voice', keep = false } = {}) {
  const { hud, scheduler, audio } = scene.game;
  hud.speech.show(name, anchorX, anchorY);
  const typing = talkSkip(scene);
  let typed = true;
  typing.promise.then(() => {
    typed = false;
  });
  for (let index = 1; index <= text.length && typed === true; index++) {
    hud.speech.text(text.slice(0, index));
    const char = text[index - 1];
    if (index % 2 === 1 && char !== ' ') audio.sfx[voice]();
    await Promise.race([scheduler.wait(char === '.' || char === '?' || char === '!' ? 150 : 34), typing.promise]);
  }
  typing.done();
  hud.speech.text(text);
  const reading = talkSkip(scene);
  await Promise.race([scheduler.wait(holdMs), reading.promise]);
  reading.done();
  if (keep === false) hud.speech.hide();
}

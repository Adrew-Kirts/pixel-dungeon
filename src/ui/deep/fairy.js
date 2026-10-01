import { t, onLanguageChange } from '../../i18n.js';
import { el, append } from '../dom.js';
import { applyIcon } from '../icons.js';
import { renderBoard } from '../real/board.js';

export function fairyMood(storage) {
  const mood = storage.getJson('lumi');
  if (mood === null || typeof mood !== 'object') return { yes: 0, no: 0 };
  return { yes: Number.isInteger(mood.yes) === true ? mood.yes : 0, no: Number.isInteger(mood.no) === true ? mood.no : 0 };
}

export function isFairyFriend(storage) {
  return fairyMood(storage).no === 0;
}

const PSST_EVERY_MS = [14000, 26000];
const PSST_SHOW_MS = 1800;
const RETURN_MS = 22000;
const APPEAR_MS = 1600;

export function createFairy({ api, audio, storage, onDeep }) {
  const root = document.documentElement;
  const lumi = document.getElementById('lumi');
  const sprite = lumi.querySelector('[data-role="sprite"]');
  const icon = sprite.querySelector('.px-icon');
  const bubble = lumi.querySelector('[data-role="bubble"]');
  let frame = 0;
  let mood = 'happy';
  let state = 'away';
  let flapTimer = 0;
  let psstTimer = 0;
  let hideTimer = 0;
  let returnTimer = 0;
  let appearTimer = 0;
  let moodTimers = [];

  function later(fn, ms) {
    const timer = setTimeout(() => {
      moodTimers = moodTimers.filter((entry) => entry !== timer);
      fn();
    }, ms);
    moodTimers.push(timer);
  }

  function clearMoodTimers() {
    for (const timer of moodTimers) clearTimeout(timer);
    moodTimers = [];
  }

  function scale() {
    return window.innerWidth <= 620 ? 2 : 3;
  }

  function draw() {
    const name = mood === 'sad' ? `fairySad${frame}` : `fairy${frame}`;
    applyIcon(icon, `icon:${name}`, scale());
  }

  function flap() {
    clearInterval(flapTimer);
    flapTimer = setInterval(() => {
      frame = frame === 0 ? 1 : 0;
      draw();
    }, mood === 'sad' ? 320 : 140);
  }

  function schedulePsst() {
    clearTimeout(psstTimer);
    const wait = PSST_EVERY_MS[0] + Math.random() * (PSST_EVERY_MS[1] - PSST_EVERY_MS[0]);
    psstTimer = setTimeout(() => {
      if (state !== 'idle' || visible() === false) {
        schedulePsst();
        return;
      }
      say('psst', t('fairy.psst'));
      hideTimer = setTimeout(() => {
        if (state === 'idle') bubble.hidden = true;
        schedulePsst();
      }, PSST_SHOW_MS);
    }, wait);
  }

  function visible() {
    return root.classList.contains('mode-treasure') === true && document.hidden === false;
  }

  function say(kind, text, actions = []) {
    clearTimeout(hideTimer);
    bubble.className = `lumi-bubble is-${kind}`;
    bubble.replaceChildren(el('p', 'lumi-text', text));
    if (actions.length > 0) bubble.append(append(el('div', 'lumi-actions'), ...actions));
    bubble.hidden = false;
  }

  function show() {
    clearTimeout(appearTimer);
    clearTimeout(returnTimer);
    clearMoodTimers();
    mood = 'happy';
    state = 'idle';
    lumi.hidden = false;
    lumi.classList.remove('is-leaving', 'is-sad');
    lumi.classList.add('is-arriving');
    draw();
    flap();
    schedulePsst();
  }

  function remember(answer) {
    const mood = fairyMood(storage);
    mood[answer] += 1;
    storage.setJson('lumi', mood);
  }

  function showLegends() {
    state = 'legends';
    audio.sfx.select();
    const back = el('button', 'btn lumi-back', t('fairy.back'));
    back.type = 'button';
    back.addEventListener('click', () => {
      state = 'idle';
      ask();
    });
    const board = el('div', 'lumi-board');
    board.append(el('p', 'wall-note', t('wall.loading')));
    say('legends', t('fairy.legendsLine'), [back]);
    bubble.insertBefore(append(el('div', 'lumi-legends'), el('p', 'lumi-legends-title', t('deep.wall')), board), bubble.lastChild);
    api
      .leaderboard('deep')
      .then((response) => {
        if (state !== 'legends') return;
        board.replaceChildren(renderBoard(Array.isArray(response.entries) === true ? response.entries : [], null, 'deep'));
      })
      .catch(() => {
        if (state === 'legends') board.replaceChildren(el('p', 'wall-note', t('wall.offline')));
      });
    back.focus({ preventScroll: true });
  }

  function ask() {
    if (state === 'asking') return;
    state = 'asking';
    api.event('fairy.open');
    audio.unlock();
    audio.sfx.chime();
    const yes = el('button', 'btn btn-primary lumi-yes', t('fairy.yes'));
    yes.type = 'button';
    const no = el('button', 'btn lumi-no', t('fairy.no'));
    no.type = 'button';
    const lock = () => {
      yes.disabled = true;
      no.disabled = true;
    };
    yes.addEventListener('click', () => {
      lock();
      accept();
    });
    no.addEventListener('click', () => {
      lock();
      decline();
    });
    const legends = el('button', 'text-button lumi-legends-link', t('fairy.legends'));
    legends.type = 'button';
    legends.addEventListener('click', showLegends);
    const friend = isFairyFriend(storage);
    const greeting = fairyMood(storage).yes > 0 && friend === true ? t('fairy.questionFriend') : friend === false ? t('fairy.questionSulky') : t('fairy.question');
    say('ask', greeting, [yes, no, legends]);
    yes.focus({ preventScroll: true });
  }

  function accept() {
    if (state !== 'asking') return;
    state = 'leaving';
    clearTimeout(psstTimer);
    remember('yes');
    api.event('fairy.yes');
    audio.sfx.magic();
    say('yes', t('fairy.yesLine'));
    later(() => {
      lumi.classList.add('is-zooming');
      later(() => {
        bubble.hidden = true;
        lumi.classList.remove('is-zooming');
        hide();
        onDeep();
      }, 700);
    }, 450);
  }

  function decline() {
    if (state !== 'asking') return;
    state = 'sad';
    clearTimeout(psstTimer);
    remember('no');
    api.event('fairy.no');
    mood = 'sad';
    lumi.classList.add('is-sad');
    draw();
    flap();
    audio.sfx.defeat();
    say('sad', t('fairy.sad'));
    later(() => {
      bubble.hidden = true;
      lumi.classList.add('is-leaving');
      later(() => {
        hide();
        returnTimer = setTimeout(() => {
          if (visible() === true && state === 'away') show();
        }, RETURN_MS);
      }, 900);
    }, 1800);
  }

  function hide() {
    clearTimeout(psstTimer);
    clearTimeout(hideTimer);
    clearInterval(flapTimer);
    clearMoodTimers();
    lumi.classList.remove('is-zooming', 'is-leaving');
    lumi.hidden = true;
    bubble.hidden = true;
    state = 'away';
  }

  sprite.addEventListener('click', () => {
    if (state === 'idle' || state === 'legends') {
      state = 'idle';
      ask();
    }
  });
  lumi.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && (state === 'asking' || state === 'legends')) {
      state = 'idle';
      bubble.hidden = true;
      schedulePsst();
    }
  });
  onLanguageChange(() => {
    if (state === 'asking') {
      state = 'idle';
      ask();
    }
  });

  const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  let keys = [];
  function trick(kind) {
    if (root.classList.contains('mode-treasure') === false) return;
    if (state === 'away' || lumi.hidden === true) show();
    state = 'idle';
    lumi.classList.remove('is-spinning');
    void lumi.offsetWidth;
    lumi.classList.add('is-spinning');
    audio.unlock();
    audio.sfx.magic();
    say('psst', t(kind === 'konami' ? 'fairy.konami' : 'fairy.name'));
    api.event(kind === 'konami' ? 'fairy.konami' : 'fairy.name');
    later(() => {
      if (state === 'idle') bubble.hidden = true;
      lumi.classList.remove('is-spinning');
    }, 3200);
  }
  window.addEventListener('keydown', (event) => {
    if (root.classList.contains('mode-treasure') === false || event.repeat === true) return;
    if (event.target instanceof HTMLElement && (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA')) return;
    keys = [...keys, event.key.length === 1 ? event.key.toLowerCase() : event.key].slice(-10);
    if (KONAMI.every((key, index) => keys[index] === key) === true) {
      keys = [];
      trick('konami');
    } else if (keys.slice(-4).join('') === 'lumi') {
      keys = [];
      trick('name');
    }
  });

  const observer = new MutationObserver(() => {
    const onTreasure = root.classList.contains('mode-treasure');
    if (onTreasure === true && state === 'away' && lumi.hidden === true) {
      clearTimeout(appearTimer);
      appearTimer = setTimeout(() => {
        if (root.classList.contains('mode-treasure') === true && state === 'away') show();
      }, APPEAR_MS);
    } else if (onTreasure === false) {
      clearTimeout(appearTimer);
      clearTimeout(returnTimer);
      hide();
    }
  });
  observer.observe(root, { attributes: true, attributeFilter: ['class'] });
  if (root.classList.contains('mode-treasure') === true) appearTimer = setTimeout(show, APPEAR_MS);

  return { show, hide, ask };
}

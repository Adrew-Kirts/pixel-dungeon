import { el, append } from './dom.js';
import { formatRunTime } from './panels.js';
import { t, formatNumber, onLanguageChange } from '../i18n.js';
import { renderBoard } from './real/board.js';

export function createTreasure({ onPlay, onReal, input, api }) {
  const root = document.documentElement;
  const main = document.getElementById('treasure');
  const badge = main.querySelector('[data-role="run-badge"]');
  const play = document.getElementById('play-again');
  play.addEventListener('click', () => onPlay());
  const realButton = document.getElementById('real-dungeon');
  realButton.addEventListener('click', () => onReal());
  const scrollHint = document.getElementById('scroll-hint');
  scrollHint.addEventListener('click', () => realButton.scrollIntoView({ behavior: 'smooth', block: 'center' }));
  const challengeBanner = document.getElementById('challenge');
  let challenge = null;

  function renderChallenge() {
    challengeBanner.hidden = challenge === null;
    if (challenge !== null) challengeBanner.textContent = t(challenge.mode === 'deep' ? 'deep.challenge' : 'challenge.banner', { who: challenge.initials ?? t('challenge.someone'), score: formatNumber(challenge.score) });
  }
  onLanguageChange(renderChallenge);
  main.addEventListener('click', (event) => {
    const link = event.target instanceof Element ? event.target.closest('[data-track]') : null;
    if (link !== null) api.event(`click.${link.dataset.track}`);
  });
  function createScroll(section, mode) {
    const toggle = section.querySelector('.wall-toggle');
    const hint = section.querySelector('[data-role="hint"]');
    const board = section.querySelector('[data-role="board"]');
    let entries = null;
    let status = 'idle';

    function render() {
      const isOpen = section.classList.contains('is-open');
      toggle.setAttribute('aria-expanded', String(isOpen));
      hint.textContent = t(isOpen === true ? 'wall.close' : 'wall.open');
      if (status === 'loading') board.replaceChildren(el('p', 'wall-note', t('wall.loading')));
      else if (status === 'failed') board.replaceChildren(el('p', 'wall-note', t('wall.offline')));
      else if (entries !== null) board.replaceChildren(renderBoard(entries, null, mode));
    }
    onLanguageChange(render);

    function open() {
      section.classList.add('is-open');
      status = 'loading';
      render();
      return api
        .leaderboard(mode)
        .then((response) => {
          entries = Array.isArray(response.entries) === true ? response.entries : [];
          status = 'ready';
        })
        .catch(() => {
          status = 'failed';
        })
        .then(() => {
          render();
          setTimeout(() => {
            if (section.classList.contains('is-open') === true && root.classList.contains('mode-treasure') === true) section.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          }, 520);
        });
    }

    function close() {
      section.classList.remove('is-open');
      render();
    }

    toggle.addEventListener('click', () => {
      if (section.classList.contains('is-open') === true) close();
      else open();
    });
    render();
    return { open, close, section };
  }

  const wall = createScroll(document.getElementById('wall'), 'real');

  const lightbox = document.getElementById('lightbox');
  for (const trigger of main.querySelectorAll('[data-lightbox]')) {
    trigger.addEventListener('click', (event) => {
      if (typeof lightbox.showModal !== 'function') return;
      event.preventDefault();
      lightbox.showModal();
    });
  }
  lightbox.addEventListener('click', (event) => {
    if (event.target === lightbox || event.target.tagName === 'IMG') lightbox.close();
  });

  function renderBadge(summary, record) {
    badge.replaceChildren();
    if (summary === null && record === null) {
      badge.hidden = true;
      return;
    }
    if (summary !== null && summary.won === true) {
      badge.textContent = t('badge.won', { hero: summary.heroName, dragon: summary.dragonName, rank: summary.rank, time: formatRunTime(summary.timeMs) });
    } else if (summary !== null) {
      badge.textContent = t('badge.lost', { hero: summary.heroName });
    } else {
      badge.textContent = t('badge.best', { rank: record.rank, time: formatRunTime(record.timeMs) });
    }
    badge.hidden = false;
  }

  return {
    show(summary = null, record = null) {
      input.setEnabled(false);
      root.classList.remove('mode-game');
      root.classList.add('mode-treasure');
      renderBadge(summary, record);
      play.textContent = t(summary === null ? 'treasure.play' : 'treasure.playAgain');
      const wantsWall = location.hash === '#wall';
      api.event('treasure.view');
      if (location.hash !== '#treasure' && wantsWall === false) history.replaceState(null, '', '#treasure');
      window.scrollTo(0, 0);
      main.focus({ preventScroll: true });
      if (wantsWall === true) {
        wall.section.scrollIntoView({ block: 'center' });
        wall.open();
      } else {
        wall.close();
      }
    },
    setChallenge(value) {
      challenge = value;
      renderChallenge();
    },
    challengeText() {
      renderChallenge();
      return challenge === null ? null : challengeBanner.textContent;
    },
    setRealAvailable(available) {
      realButton.hidden = available === false;
      scrollHint.hidden = available === false;
    },
    hide() {
      input.setEnabled(true);
      root.classList.remove('mode-treasure');
      root.classList.add('mode-game');
      if (location.hash === '#treasure' || location.hash === '#wall') history.replaceState(null, '', location.pathname + location.search);
    },
    visible() {
      return root.classList.contains('mode-treasure');
    },
  };
}

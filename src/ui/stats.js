import { el, append } from './dom.js';
import { formatNumber, foeName } from '../i18n.js';

const TAPS = 5;
const TAP_WINDOW_MS = 2500;

function compact(value) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 10_000) return `${Math.round(value / 1000)}k`;
  return formatNumber(value);
}

function percent(part, total) {
  return total === 0 ? '–' : `${Math.round((part / total) * 100)} %`;
}

function card(value, label, detail = null, highlight = false) {
  const root = el('div', highlight === true ? 'stat-card is-highlight' : 'stat-card');
  return append(root, el('strong', 'stat-value', value), el('span', 'stat-label', label), detail === null ? null : el('small', 'stat-detail', detail));
}

function renderStats(content, stats, onForget) {
  const count = (name) => stats.counters[name] ?? 0;
  const kills = count('real.kills.monster') + count('real.kills.midboss') + count('real.kills.boss');
  const hireYes = count('real.hire.yes');
  const hireNo = count('real.hire.no');
  const killers = Object.entries(stats.counters)
    .filter(([name]) => name.startsWith('real.deathBy.') === true)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name, value]) => {
      const id = name.slice('real.deathBy.'.length);
      return `${id === 'arrow' ? 'Wall arrows' : foeName({ id, name: id })} ${value}`;
    });
  const best = stats.best === null ? 'nobody yet' : `${formatNumber(stats.best.score)} by ${stats.best.initials ?? 'an anonymous hero'}`;
  const hours = count('real.seconds') / 3600;
  const grid = el('div', 'stat-grid');
  append(
    grid,
    card(compact(count('visit')), 'page loads'),
    card(compact(count('easy.start')), 'easy runs', `${formatNumber(count('easy.win'))} dragons slain · ${percent(count('easy.win'), count('easy.win') + count('easy.lose'))} win`),
    card(compact(count('easy.rank.S')), 'S ranks', `A ${count('easy.rank.A')} · B ${count('easy.rank.B')} · C ${count('easy.rank.C')}`),
    card(compact(count('real.started')), 'Real Dungeon entries', `${formatNumber(count('real.finished'))} finished · ${formatNumber(count('real.victory'))} Monoliths toppled`),
    card(compact(count('real.score')), 'points dealt', `best: ${best}`),
    card(`${percent(hireYes, hireYes + hireNo)} yes`, 'would hire Ezra', `${formatNumber(hireYes)} yes · ${formatNumber(hireNo)} no (they got an arrow)`, true),
    card(compact(kills), 'monsters slain', `${formatNumber(count('real.kills.boss'))} Monoliths · ${formatNumber(count('real.kills.midboss'))} scope creeps`),
    card(compact(count('real.perfects')), 'perfect hits', `of ${formatNumber(count('real.strikes'))} strikes · ${formatNumber(count('real.bullseyes'))} bullseyes`),
    card(compact(count('real.dodged')), 'arrows dodged', `${formatNumber(count('real.arrowHits'))} arrows eaten`),
    card(compact(count('real.genie.right')), 'genie answers right', `${formatNumber(count('real.genie.wrong'))} wrong`),
    card(compact(count('real.doubleShots')), 'DOUBLE SHOTS', `${formatNumber(count('real.potions'))} single potions`),
    card(compact(count('real.bots')), 'bots caught 🤖'),
    card(compact(count('real.daves')), 'heroes named Dave'),
    card(compact(count('real.mimics')), 'mimic bites'),
    card(killers.length === 0 ? '–' : killers[0].replace(/ \d+$/, ''), 'deadliest foe', killers.length === 0 ? null : killers.join(' · ')),
    card(hours >= 1 ? `${hours.toFixed(1)} h` : `${Math.round(hours * 60)} min`, 'spent in the Real Dungeon'),
    card(`${count('lang.en')} / ${count('lang.fr')}`, 'English / French picks'),
    card(compact(stats.wall), 'names carved on the wall of fame', 'it shows the best 5'),
  );
  const forget = el('button', 'text-button', 'Forget key on this device');
  forget.type = 'button';
  forget.addEventListener('click', onForget);
  content.replaceChildren(el('h2', 'stats-title', 'Dungeon stats'), el('p', 'stats-subtitle', "For Ezra's eyes only."), grid, append(el('p', 'stats-footer'), forget));
}

export function setupStats({ api, storage }) {
  const chest = document.querySelector('.hoard-chest');
  const dialog = document.getElementById('stats-dialog');
  const content = dialog.querySelector('[data-role="content"]');
  let taps = [];

  function renderKeyForm(message = null) {
    const form = el('form', 'stats-form');
    const input = el('input', 'stats-input');
    input.type = 'password';
    input.autocomplete = 'off';
    input.placeholder = 'Key';
    input.setAttribute('aria-label', 'Stats key');
    const unlock = el('button', 'btn btn-primary', 'Unlock');
    unlock.type = 'submit';
    append(form, input, unlock);
    dialog.classList.add('is-locked');
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const key = input.value.trim();
      if (key !== '') load(key, true);
    });
    content.replaceChildren();
    append(content, el('p', 'stats-lock', '🔒'), el('h2', 'stats-title', 'Who goes there?'), el('p', 'stats-subtitle', 'Only the keeper of the key may count the gold.'), message === null ? null : el('p', 'stats-error', message), form);
    input.focus();
  }

  function load(key, remember) {
    content.replaceChildren(el('p', 'stats-subtitle', 'Counting the gold…'));
    dialog.classList.remove('is-locked');
    api
      .stats(key)
      .then((stats) => {
        if (remember === true) storage.set('statsKey', key);
        renderStats(content, stats, () => {
          storage.set('statsKey', '');
          renderKeyForm();
        });
      })
      .catch((error) => {
        if (error.status === 401) {
          storage.set('statsKey', '');
          renderKeyForm('Nope. Wrong key.');
        } else if (error.status === 429) {
          renderKeyForm('Too many tries. Come back in an hour.');
        } else {
          renderKeyForm('The dungeon is not answering right now.');
        }
      });
  }

  function open() {
    if (typeof dialog.showModal !== 'function') return;
    dialog.showModal();
    const key = storage.get('statsKey');
    if (typeof key === 'string' && key !== '') load(key, false);
    else renderKeyForm();
  }

  chest.addEventListener('pointerdown', () => {
    const now = performance.now();
    taps = taps.filter((at) => now - at < TAP_WINDOW_MS);
    taps.push(now);
    if (taps.length >= TAPS) {
      taps = [];
      open();
    }
  });
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
}

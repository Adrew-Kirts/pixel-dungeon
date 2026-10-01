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

function section(title, cards) {
  const grid = el('div', 'stat-grid');
  append(grid, ...cards);
  return append(el('section', 'stat-section'), el('h3', 'stat-section-title', title), grid);
}

function funnel(steps) {
  const list = el('ol', 'stat-funnel');
  const first = steps[0][1];
  for (const [label, value] of steps) {
    const row = el('li');
    const bar = el('span', 'stat-funnel-bar');
    bar.style.setProperty('--share', first === 0 ? '0%' : `${Math.min(100, Math.round((value / first) * 100))}%`);
    append(row, el('span', 'stat-funnel-label', label), append(el('span', 'stat-funnel-track'), bar), el('strong', 'stat-funnel-value', `${formatNumber(value)} · ${percent(value, first)}`));
    list.append(row);
  }
  return list;
}

const DEEP_ROOMS = [
  ['h1', 'Main Street · gate'],
  ['a1', 'Archives'],
  ['a2', 'Open Space'],
  ['mb', "Manager's office"],
  ['b1', 'Server room'],
  ['h2', 'Arrow alley'],
  ['h3', 'Crossing'],
  ['c1', 'Break room (horde)'],
  ['h4', 'Iron door'],
  ['d1', 'Descent'],
  ['d2', 'Flooded crypt'],
  ['d3', 'Hall of echoes'],
  ['lair', 'Final boss'],
];

function deepSections(stats, count) {
  const started = count('deep.started');
  const finished = count('deep.finished');
  const fairyOpen = count('fairy.open');
  const classes = ['knight', 'rogue', 'wizard', 'barbarian'].map((id) => `${id} ${count(`deep.class.${id}`)}`).join(' · ');
  const deaths = Object.entries(stats.counters)
    .filter(([name]) => name.startsWith('deep.deathAt.') === true)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name, value]) => `${name.slice('deep.deathAt.'.length)} ${value}`);
  const best = stats.deepBest === null || stats.deepBest === undefined ? 'nobody yet' : `${formatNumber(stats.deepBest.score)} by ${stats.deepBest.initials ?? 'an anonymous hero'}`;
  const hours = count('deep.seconds') / 3600;
  const steps = [['created a hero', count('deep.create')]];
  for (const [id, label] of DEEP_ROOMS) steps.push([label, count(`deep.room.${id}`)]);
  steps.push(['finished', finished], ['won', count('deep.victory')]);
  return [
    section('Deep Dungeon', [
      card(`${count('fairy.yes')} / ${count('fairy.no')}`, 'fairy: yes / no', `${formatNumber(fairyOpen)} clicked her`),
      card(compact(started), 'runs started', `${percent(finished, started)} finished`),
      card(compact(count('deep.victory')), 'bugs fixed', `${percent(count('deep.victory'), finished)} of finished runs`),
      card(compact(Math.max(0, started - finished)), 'abandoned', `${compact(count('deep.quit'))} pressed Skip mid-run`),
      card(compact(count('deep.score')), 'points scored', `best: ${best}`),
      card(deaths.length === 0 ? '–' : deaths[0].replace(/ \d+$/, ''), 'deadliest room', deaths.length === 0 ? null : deaths.join(' · ')),
      card(`${percent(count('deep.horde.survived'), count('deep.horde.opened'))}`, 'survived the horde', `${formatNumber(count('deep.horde.opened'))} opened the chest`),
      card(compact(count('deep.manager.killed')), 'managers defeated', classes),
      card(compact(count('deep.den')), 'found the secret room', `${compact(count('deep.cat'))} petted the cat · ${compact(count('fairy.konami') + count('fairy.name'))} fairy easter eggs`),
      card(hours >= 1 ? `${hours.toFixed(1)} h` : `${Math.round(hours * 60)} min`, 'played in total', `${compact(stats.deepWall ?? 0)} names on the wall of legends`),
      card(compact(count('deep.difficulty.tryhard')), 'finished runs on Try Hard', `normal ${compact(count('deep.difficulty.normal'))} · difficult ${compact(count('deep.difficulty.hard'))}`),
      card(compact(count('deep.bots')), 'bots caught'),
    ]),
    append(el('div', 'stat-funnel-wrap'), el('p', 'stat-funnel-title', 'How far people get in the Deep Dungeon'), funnel(steps)),
  ];
}

function renderStats(content, stats, onForget) {
  const count = (name) => stats.counters[name] ?? 0;
  const easyStarted = count('easy.start');
  const easyEnded = count('easy.win') + count('easy.lose');
  const realStarted = count('real.started');
  const realFinished = count('real.finished');
  const hireYes = count('real.hire.yes');
  const hireNo = count('real.hire.no');
  const killers = Object.entries(stats.counters)
    .filter(([name]) => name.startsWith('real.deathBy.') === true)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name, value]) => {
      const id = name.slice('real.deathBy.'.length);
      return `${id === 'arrow' ? 'wall arrows' : foeName({ id, name: id })} ${value}`;
    });
  const best = stats.best === null ? 'nobody yet' : `${formatNumber(stats.best.score)} by ${stats.best.initials ?? 'an anonymous hero'}`;
  const hours = count('real.seconds') / 3600;
  const roomSteps = [['entered', realStarted]];
  for (let room = 1; room <= 11; room++) roomSteps.push([room === 11 ? 'room 11 · Monolith' : `room ${room}`, count(`real.room.${room}`)]);
  roomSteps.push(['finished', realFinished], ['won', count('real.victory')]);
  const forget = el('button', 'text-button', 'Forget key on this device');
  forget.type = 'button';
  forget.addEventListener('click', onForget);
  content.replaceChildren();
  append(
    content,
    el('h2', 'stats-title', 'Dungeon stats'),
    el('p', 'stats-subtitle', "For Ezra's eyes only. Funnels and clicks count from 30 Sep 2026."),
    section('Visitors', [
      card(compact(count('visit')), 'page loads'),
      card(compact(count('visit.first')), 'first visits', 'distinct browsers, roughly'),
      card(compact(count('treasure.view')), 'treasure page views'),
      card(`${count('lang.en')} / ${count('lang.fr')}`, 'English / French picks'),
    ]),
    section('Easy game', [
      card(compact(easyStarted), 'runs started', `${percent(easyEnded, easyStarted)} reached an ending`),
      card(compact(count('easy.win')), 'dragons slain', `${percent(count('easy.win'), easyEnded)} of finished runs`),
      card(compact(count('easy.lose')), 'heroes lost'),
      card(compact(Math.max(0, easyStarted - easyEnded)), 'stopped before the end', `${compact(count('easy.skip'))} pressed Skip`),
      card(compact(count('easy.rank.S')), 'S ranks', `A ${count('easy.rank.A')} · B ${count('easy.rank.B')} · C ${count('easy.rank.C')}`),
    ]),
    append(el('div', 'stat-funnel-wrap'), el('p', 'stat-funnel-title', 'Easy game funnel'), funnel([['started', easyStarted], ['reached the chest', count('easy.chest')], ['reached the dragon', count('easy.boss')], ['won', count('easy.win')]])),
    section('Real Dungeon', [
      card(compact(realStarted), 'entries', `${percent(realFinished, realStarted)} finished`),
      card(compact(count('real.victory')), 'Monoliths toppled', `${percent(count('real.victory'), realFinished)} of finished runs`),
      card(compact(Math.max(0, realStarted - realFinished)), 'abandoned', `${compact(count('real.quit'))} pressed Skip mid-run`),
      card(compact(count('real.score')), 'points scored', `best: ${best}`),
      card(killers.length === 0 ? '–' : killers[0].replace(/ \d+$/, ''), 'deadliest foe', killers.length === 0 ? null : killers.join(' · ')),
      card(hours >= 1 ? `${hours.toFixed(1)} h` : `${Math.round(hours * 60)} min`, 'played in total', `${compact(stats.wall)} names carved on the wall of fame`),
      card(compact(count('real.bots')), 'bots caught'),
    ]),
    append(el('div', 'stat-funnel-wrap'), el('p', 'stat-funnel-title', 'How far people get in the Real Dungeon'), funnel(roomSteps)),
    ...deepSections(stats, count),
    section('Genie', [
      card(`${percent(hireYes, hireYes + hireNo)} yes`, 'would hire Ezra', `${formatNumber(hireYes)} yes · ${formatNumber(hireNo)} no`, true),
      card(percent(count('real.genie.right'), count('real.genie.right') + count('real.genie.wrong')), 'right answers', `${formatNumber(count('real.genie.right'))} right · ${formatNumber(count('real.genie.wrong'))} wrong`),
    ]),
    section('Portfolio clicks', [
      card(compact(count('click.picto')), 'Picto Planning'),
      card(compact(count('click.github')), 'GitHub'),
      card(compact(count('click.linkedin')), 'LinkedIn'),
      card(compact(count('click.repo')), 'source code', `${compact(count('click.original'))} opened the 2023 original`),
    ]),
    append(el('p', 'stats-footer'), forget),
  );
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

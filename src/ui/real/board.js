import { t, formatNumber } from '../../i18n.js';
import { el, append } from '../dom.js';
import { applyIcon } from '../icons.js';

const DEEP_ICONS = { knight: 'tile:97', rogue: 'tile:112', wizard: 'tile:84', barbarian: 'tile:87' };
const LEVEL_ICONS = { hard: 'icon:diffHard', tryhard: 'icon:diffTryhard' };

function classIcon(entry, mode) {
  if (mode === 'deep') return { key: DEEP_ICONS[entry.heroClass] ?? 'tile:97', label: t(`deep.class.${Object.hasOwn(DEEP_ICONS, entry.heroClass) === true ? entry.heroClass : 'knight'}`) };
  const wizard = entry.heroClass === 'wizard';
  return { key: `tile:${wizard === true ? 84 : 97}`, label: t(`class.${wizard === true ? 'wizard' : 'warrior'}`) };
}

export function renderBoard(entries, you = null, mode = 'real') {
  if (entries.length === 0) return el('p', 'board-empty', t(mode === 'deep' ? 'deep.wallEmpty' : 'real.emptyBoard'));
  const list = el('ol', 'board');
  let marked = false;
  for (const entry of entries) {
    const row = el('li');
    const icon = el('span', 'px-icon board-class');
    const hero = classIcon(entry, mode);
    applyIcon(icon, hero.key, 1.5);
    icon.setAttribute('aria-label', hero.label);
    let secret = null;
    let level = null;
    if (mode === 'deep') {
      secret = entry.secret === true ? secretMark() : el('span', 'board-secret-empty');
      level = Object.hasOwn(LEVEL_ICONS, entry.difficulty) === true ? levelMark(entry.difficulty) : el('span', 'board-level-empty');
    }
    append(row, el('span', 'board-rank', String(entry.rank)), el('span', 'board-initials', entry.initials), el('span', 'board-score', formatNumber(entry.score)), level, secret, icon);
    if (mode === 'deep') row.classList.add('has-secret-slot');
    if (marked === false && you !== null && entry.initials === you.initials && entry.score === you.score) {
      row.classList.add('is-you');
      marked = true;
    }
    list.append(row);
  }
  if (mode !== 'deep') return list;
  const legends = [];
  for (const id of Object.keys(LEVEL_ICONS)) {
    if (entries.some((entry) => entry.difficulty === id) === true) legends.push(append(el('p', 'board-legend'), levelMark(id), document.createTextNode(t(`deep.difficulty.${id}`))));
  }
  if (entries.some((entry) => entry.secret === true) === true) legends.push(append(el('p', 'board-legend'), secretMark(), document.createTextNode(t('deep.secretLegend'))));
  if (legends.length === 0) return list;
  return append(el('div', 'board-wrap'), list, append(el('div', 'board-legends'), ...legends));
}

function levelMark(id) {
  const mark = el('span', 'px-icon board-level');
  applyIcon(mark, LEVEL_ICONS[id], 1);
  mark.setAttribute('role', 'img');
  mark.setAttribute('aria-label', t(`deep.difficulty.${id}`));
  mark.title = t(`deep.difficulty.${id}`);
  return mark;
}

function secretMark() {
  const mark = el('span', 'px-icon board-secret');
  applyIcon(mark, 'icon:secretMark', 1.6);
  mark.setAttribute('role', 'img');
  mark.setAttribute('aria-label', t('deep.secretLegend'));
  mark.title = t('deep.secretLegend');
  return mark;
}

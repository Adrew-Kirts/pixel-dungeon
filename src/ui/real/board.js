import { t, formatNumber } from '../../i18n.js';
import { el, append } from '../dom.js';
import { applyIcon } from '../icons.js';

export function renderBoard(entries, you = null) {
  if (entries.length === 0) return el('p', 'board-empty', t('real.emptyBoard'));
  const list = el('ol', 'board');
  let marked = false;
  for (const entry of entries) {
    const row = el('li');
    const icon = el('span', 'px-icon board-class');
    applyIcon(icon, `tile:${entry.heroClass === 'wizard' ? 84 : 97}`, 1.5);
    icon.setAttribute('aria-label', t(`class.${entry.heroClass === 'wizard' ? 'wizard' : 'warrior'}`));
    append(row, el('span', 'board-rank', String(entry.rank)), el('span', 'board-initials', entry.initials), el('span', 'board-score', formatNumber(entry.score)), icon);
    if (marked === false && you !== null && entry.initials === you.initials && entry.score === you.score) {
      row.classList.add('is-you');
      marked = true;
    }
    list.append(row);
  }
  return list;
}

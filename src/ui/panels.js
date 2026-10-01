import { ITEMS, RARITIES } from '../content.js';
import { t, heroName, itemName, itemLine, potionName } from '../i18n.js';
import { applyIcon } from './icons.js';
import { el, append, waitForChoice } from './dom.js';

function button(label, choice, primary = false) {
  const element = el('button', primary === true ? 'btn btn-primary btn-large' : 'btn', label);
  element.type = 'button';
  element.dataset.choice = choice;
  return element;
}

function stat(label, className) {
  const wrapper = el('div', `stat ${className}`);
  const value = el('dd', '', '0');
  append(wrapper, el('dt', '', label), value);
  return { wrapper, value };
}

export function heroRevealPanel(hero, { scheduler, audio, input }) {
  const card = el('div', 'panel-card reveal');
  const hp = stat(t('stat.hp'), 'stat-hp');
  const atk = stat(t('stat.atk'), 'stat-atk');
  const stats = append(el('dl', 'stats'), hp.wrapper, atk.wrapper);
  append(
    card,
    el('p', 'eyebrow', t(hero.legendary === true ? 'reveal.legendary' : 'reveal.appears')),
    el('h2', 'panel-title', heroName(hero)),
    el('p', 'panel-subtitle', t(`class.${hero.cls}`)),
    hero.legendary === true ? el('span', 'badge', t('reveal.badge')) : null,
    stats,
    button(t('reveal.go'), 'go', true),
    el('p', 'tap-anywhere', t('reveal.tap')),
  );

  async function spin() {
    for (let step = 0; step < 12; step++) {
      if (step < 9) hp.value.textContent = String(10 + Math.floor(Math.random() * 30));
      atk.value.textContent = String(2 + Math.floor(Math.random() * 9));
      audio.sfx.roll();
      await scheduler.wait(50);
      if (step === 8) {
        hp.value.textContent = String(hero.maxHp);
        hp.wrapper.classList.add('is-landed');
        audio.sfx.tick();
      }
    }
    atk.value.textContent = String(hero.atk);
    atk.wrapper.classList.add('is-landed');
    audio.sfx.tick();
  }

  spin();
  return { el: card, done: waitForChoice(card, input, { tapValue: 'go', guardMs: 450 }) };
}

function lootEntry(iconName, name, detail) {
  const figure = el('figure', 'loot-item');
  const icon = el('span', 'px-icon');
  applyIcon(icon, `icon:${iconName}`, 3);
  const caption = append(el('figcaption'), el('strong', '', name), el('span', '', detail));
  return append(figure, icon, caption);
}

const LOOT_AUTO_MS = 3200;

export function lootPanel(loot, { input, scheduler }, keep = null) {
  const rarity = RARITIES[loot.rarity];
  const card = el('div', 'panel-card loot');
  card.style.setProperty('--rarity', rarity.color);
  const items = el('div', 'loot-items');
  if (keep !== null) {
    const kept = lootEntry(keep.item.icon, itemName(keep.item), t('loot.atk', { n: keep.item.bonus }));
    kept.classList.add('is-kept');
    append(items, kept);
    if (keep.same === false) {
      const left = lootEntry(loot.item.icon, itemName(loot.item), t('loot.atk', { n: loot.item.bonus }));
      left.classList.add('is-left');
      append(items, left);
    }
  } else if (loot.item !== null) append(items, lootEntry(loot.item.icon, itemName(loot.item), t('loot.atk', { n: loot.item.bonus })));
  if (loot.potion !== null) append(items, lootEntry(loot.potion.icon, potionName(loot.potion), t('loot.heal', { n: loot.potion.heal })));
  if (loot.item === null && loot.potion === null) append(items, lootEntry(ITEMS.woodenStick.icon, itemName(ITEMS.woodenStick), t('loot.atk', { n: 0 })));
  let line = itemLine(ITEMS.woodenStick);
  if (keep !== null) line = keep.same === true ? t('loot.same', { item: itemName(keep.item) }) : t('loot.keep', { kept: itemName(keep.item), found: itemName(loot.item) });
  else if (loot.item !== null) line = itemLine(loot.item);
  else if (loot.potion !== null) line = t('loot.potionLine');
  append(
    card,
    el('p', 'eyebrow', t('loot.rolled', { face: loot.face, rarity: t(`rarity.${loot.rarity}`) })),
    items,
    el('p', 'loot-line', line),
    button(t(loot.rarity === 'common' ? 'loot.fine' : 'loot.onward'), 'go', true),
  );
  const fill = el('span', 'auto-bar-fill');
  append(card, append(el('div', 'auto-bar'), fill));
  const countdown = { value: 1 };
  const auto = scheduler.tween(countdown, { value: 0 }, LOOT_AUTO_MS, 'linear', (state) => {
    fill.style.transform = `scaleX(${state.value})`;
  });
  return { el: card, done: waitForChoice(card, input, { tapValue: 'go', guardMs: 600, auto }) };
}

function formatSeconds(ms) {
  return `${(ms / 1000).toFixed(1)} s`;
}

export function victoryPanel(summary, record, { input }) {
  const card = el('div', 'panel-card victory');
  const rank = el('div', `rank rank-${summary.rank}`, summary.rank);
  rank.setAttribute('aria-label', `Rank ${summary.rank}`);
  const stats = el('dl', 'run-stats');
  for (const [label, value] of [
    [t('victory.time'), formatSeconds(summary.timeMs)],
    [t('victory.strikes'), String(summary.strikes)],
    [t('victory.crits'), String(summary.crits)],
  ]) {
    append(stats, append(el('div'), el('dt', '', label), el('dd', '', value)));
  }
  let recordLine;
  if (record.isNew === true) {
    recordLine = el('p', 'record is-new', t(record.previous === null ? 'victory.firstClear' : 'victory.newRecord'));
  } else {
    recordLine = el('p', 'record', t('victory.best', { rank: record.best.rank, time: formatSeconds(record.best.timeMs) }));
  }
  append(
    card,
    el('p', 'eyebrow', t('victory.cleared')),
    rank,
    el('p', 'panel-subtitle', t(`rank.${summary.rank}`)),
    stats,
    recordLine,
    button(t('victory.claim'), 'claim', true),
  );
  return { el: card, done: waitForChoice(card, input, { tapValue: 'claim', guardMs: 1200 }) };
}

export function defeatPanel(epitaph, { input }) {
  const card = el('div', 'panel-card defeat');
  append(
    card,
    el('p', 'eyebrow', t('defeat.title')),
    el('p', 'epitaph', epitaph),
    append(el('div', 'actions'), button(t('defeat.retry'), 'retry', true), button(t('defeat.treasure'), 'treasure')),
  );
  return { el: card, done: waitForChoice(card, input, { guardMs: 600 }) };
}

export function formatRunTime(ms) {
  return formatSeconds(ms);
}

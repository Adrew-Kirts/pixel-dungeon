import { t, getLanguage, heroName as localizedName } from '../../i18n.js';
import { el, append } from '../dom.js';
import { applyIcon } from '../icons.js';
import { FIRST_NAMES, EPITHETS } from '../../content.js';
import { CLASSES, CLASS_ORDER, WEAPONS, SHIELDS, STARTING_WEAPONS, STARTING_SHIELDS, DEFENSE, METER, DIFFICULTIES, DIFFICULTY_ORDER } from '../../deep/content.js';

const STEPS = ['difficulty', 'cls', 'weapon', 'shield', 'name'];
const LAST = STEPS.length - 1;
const DIFFICULTY_ICONS = { normal: 'icon:diffNormal', hard: 'icon:diffHard', tryhard: 'icon:diffTryhard' };

export function deepHeroName(first, epithet) {
  return localizedName({ name: `${FIRST_NAMES[first]} ${EPITHETS[epithet]}`, firstName: FIRST_NAMES[first], epithetIndex: epithet });
}

function randomIndex(length) {
  return crypto.getRandomValues(new Uint32Array(1))[0] % length;
}

function statBar(label, value, max, tone = '', shown = String(value)) {
  const row = el('div', `stat-row ${tone}`);
  const bar = el('span', 'stat-bar');
  const fill = el('i');
  fill.style.width = `${Math.max(6, Math.min(100, (value / max) * 100))}%`;
  bar.append(fill);
  append(row, el('span', 'stat-label', label), bar, el('b', 'stat-value', shown));
  return row;
}

function parryMs(cls, shield, difficulty) {
  return Math.round(DEFENSE.parryMs * CLASSES[cls].parry * SHIELDS[shield].parry * DIFFICULTIES[difficulty].parry);
}

function focus(cls) {
  return Math.round(METER.zones.crit * CLASSES[cls].critZone * 1000) / 10;
}

function card(choice, key, { icon, title, lines, perk, selected, tone = '' }) {
  const button = el('button', `pick-card${selected === true ? ' is-selected' : ''}${tone === '' ? '' : ` ${tone}`}`);
  button.type = 'button';
  button.dataset.choice = choice;
  button.dataset.key = String(key);
  button.setAttribute('aria-pressed', String(selected === true));
  const portrait = el('span', 'px-icon pick-icon');
  applyIcon(portrait, icon, 3);
  const body = el('span', 'pick-body');
  append(body, el('strong', 'pick-title', title), ...lines);
  const embers = tone === 'is-level-tryhard' ? append(el('span', 'card-embers'), el('i'), el('i'), el('i'), el('i'), el('i'), el('i')) : null;
  append(button, embers, portrait, body, perk === null ? null : el('small', 'pick-perk', perk), el('kbd', '', String(key)));
  return button;
}

export function createCreation({ onTick = () => {}, onRoll = () => {}, onDoom = () => {} } = {}) {
  const root = document.getElementById('deep-create');
  const content = root.querySelector('[data-role="content"]');
  const pick = { difficulty: 'normal', cls: 'knight', weapon: 'sword', shield: 'kite', first: randomIndex(FIRST_NAMES.length), epithet: randomIndex(EPITHETS.length) };
  let step = 0;
  let rolls = 0;
  let resolveDone = null;
  let onKey = null;

  function weaponsFor(cls) {
    return STARTING_WEAPONS[CLASSES[cls].family];
  }

  function header() {
    const dots = el('ol', 'create-steps');
    STEPS.forEach((name, index) => {
      const item = el('li', index === step ? 'is-current' : index < step ? 'is-done' : '', t(`deep.create.step.${name}`));
      dots.append(item);
    });
    return append(el('header', 'create-header'), el('p', 'eyebrow', t('deep.create.eyebrow')), el('h2', 'create-title', t(`deep.create.title.${STEPS[step]}`)), dots);
  }

  function difficultyCards() {
    return DIFFICULTY_ORDER.map((id, index) => {
      const level = DIFFICULTIES[id];
      return card(id, index + 1, {
        icon: DIFFICULTY_ICONS[id],
        title: t(`deep.difficulty.${id}`),
        lines: [
          statBar(t('deep.stat.foes'), Math.round(level.hp * level.damage * 100), 180, 'is-atk', `${Math.round(level.hp * level.damage * 100)}%`),
          statBar(t('deep.stat.bag'), level.potions, 3, 'is-hp'),
          statBar(t('deep.stat.score'), level.score, 1.8, 'is-score', `×${level.score.toLocaleString(getLanguage() === 'fr' ? 'fr-FR' : 'en-US')}`),
        ],
        perk: t(`deep.difficulty.${id}.perk`),
        selected: pick.difficulty === id,
        tone: `is-level-${id}`,
      });
    });
  }

  function classCards() {
    return CLASS_ORDER.map((id, index) => {
      const cls = CLASSES[id];
      return card(id, index + 1, {
        icon: cls.key,
        title: t(`deep.class.${id}`),
        lines: [statBar(t('deep.stat.hp'), cls.hp, 56, 'is-hp'), statBar(t('deep.stat.atk'), cls.atk, 8, 'is-atk'), statBar(t('deep.stat.guard'), parryMs(id, 'kite', pick.difficulty), 60, 'is-guard'), statBar(t('deep.stat.focus'), focus(id), 8, 'is-focus')],
        perk: t(`deep.class.${id}.perk`),
        selected: pick.cls === id,
      });
    });
  }

  function weaponCards() {
    return weaponsFor(pick.cls).map((id, index) => {
      const weapon = WEAPONS[id];
      return card(id, index + 1, {
        icon: weapon.key,
        title: t(`deep.item.${id}`),
        lines: [statBar(t('deep.stat.power'), weapon.power, 9, 'is-atk'), statBar(t('deep.stat.uses'), weapon.durability, 40, 'is-dur')],
        perk: t(`deep.item.${id}.perk`),
        selected: pick.weapon === id,
      });
    });
  }

  function shieldCards() {
    return STARTING_SHIELDS[CLASSES[pick.cls].family].map((id, index) => {
      const shield = SHIELDS[id];
      return card(id, index + 1, {
        icon: shield.key,
        title: t(`deep.item.${id}`),
        lines: [statBar(t('deep.stat.absorb'), Math.round(shield.absorb * 100), 80, 'is-guard'), statBar(t('deep.stat.parry'), parryMs(pick.cls, id, pick.difficulty), 70, 'is-focus'), statBar(t('deep.stat.uses'), shield.durability, 30, 'is-dur')],
        perk: t(`deep.item.${id}.perk`),
        selected: pick.shield === id,
      });
    });
  }

  function summary() {
    const cls = CLASSES[pick.cls];
    const weapon = WEAPONS[pick.weapon];
    const shield = SHIELDS[pick.shield];
    const nameLine = el('div', 'name-roll');
    const name = el('p', 'hero-name-big', deepHeroName(pick.first, pick.epithet));
    const roll = el('button', 'btn btn-dice', t(rolls >= 20 ? 'deep.create.rerollAll' : rolls >= 10 ? 'deep.create.rerollAgain' : 'deep.create.reroll'));
    roll.type = 'button';
    roll.dataset.action = 'roll';
    roll.setAttribute('aria-label', t('deep.create.rerollLabel'));
    append(nameLine, name, roll);
    const portrait = el('span', 'px-icon summary-portrait');
    applyIcon(portrait, cls.key, 5);
    const gear = el('div', 'summary-gear');
    for (const item of [weapon, shield]) {
      const icon = el('span', 'px-icon');
      applyIcon(icon, item.key, 3);
      append(gear, append(el('span', 'summary-item'), icon, el('small', '', t(`deep.item.${item.id}`))));
    }
    const stats = el('div', 'summary-stats');
    append(
      stats,
      statBar(t('deep.stat.hp'), cls.hp, 56, 'is-hp'),
      statBar(t('deep.stat.atk'), cls.atk + weapon.power, 16, 'is-atk'),
      statBar(t('deep.stat.parry'), parryMs(pick.cls, pick.shield, pick.difficulty), 70, 'is-focus'),
      statBar(t('deep.stat.absorb'), Math.round(Math.max(0, shield.absorb - cls.blockPenalty) * 100), 80, 'is-guard'),
    );
    const card = append(el('div', 'summary-card'), portrait, append(el('div', 'summary-body'), nameLine, append(el('p', 'summary-class', t(`deep.class.${pick.cls}`)), el('span', `level-badge is-level-${pick.difficulty}`, t(`deep.difficulty.${pick.difficulty}.short`))), gear, stats));
    return [card, el('p', 'summary-note', t('deep.create.note'))];
  }

  let doom = false;

  function setDoom(on) {
    root.classList.toggle('is-doom', on);
    if (on === doom) return;
    doom = on;
    onDoom(on);
  }

  function render() {
    setDoom(pick.difficulty === 'tryhard');
    const nodes = [difficultyCards, classCards, weaponCards, shieldCards, summary][step]();
    const grid = el('div', step === LAST ? 'create-summary' : `pick-grid is-${nodes.length}`);
    append(grid, ...nodes);
    const back = el('button', 'btn', t('deep.create.back'));
    back.type = 'button';
    back.dataset.action = 'back';
    back.disabled = step === 0;
    const next = el('button', 'btn btn-primary', t(step === LAST ? 'deep.create.enter' : 'deep.create.next'));
    next.type = 'button';
    next.dataset.action = 'next';
    content.replaceChildren(header(), grid, append(el('div', 'create-actions'), back, next));
    const focusTarget = step === LAST ? next : content.querySelector('.pick-card.is-selected');
    focusTarget?.focus({ preventScroll: true });
  }

  function select(choice) {
    onTick();
    if (step === 0) pick.difficulty = choice;
    else if (step === 1) {
      pick.cls = choice;
      if (weaponsFor(choice).includes(pick.weapon) === false) pick.weapon = weaponsFor(choice)[0];
      const shields = STARTING_SHIELDS[CLASSES[choice].family];
      if (shields.includes(pick.shield) === false) pick.shield = shields[1];
    } else if (step === 2) pick.weapon = choice;
    else if (step === 3) pick.shield = choice;
    render();
  }

  function go(delta) {
    const next = step + delta;
    if (next < 0) return;
    if (next > LAST) {
      finish();
      return;
    }
    step = next;
    onTick();
    render();
  }

  function roll() {
    rolls += 1;
    pick.first = randomIndex(FIRST_NAMES.length);
    pick.epithet = randomIndex(EPITHETS.length);
    onRoll();
    render();
    content.querySelector('.hero-name-big')?.classList.add('is-rolled');
  }

  function finish() {
    cleanup();
    root.hidden = true;
    if (resolveDone !== null) resolveDone({ type: 'create', difficulty: pick.difficulty, cls: pick.cls, weapon: pick.weapon, shield: pick.shield, first: pick.first, epithet: pick.epithet });
  }

  function onClick(event) {
    const target = event.target instanceof Element ? event.target.closest('button') : null;
    if (target === null) return;
    if (target.dataset.choice !== undefined) select(target.dataset.choice);
    else if (target.dataset.action === 'next') go(1);
    else if (target.dataset.action === 'back') go(-1);
    else if (target.dataset.action === 'roll') roll();
  }

  function cleanup() {
    setDoom(false);
    content.removeEventListener('click', onClick);
    if (onKey !== null) window.removeEventListener('keydown', onKey);
    onKey = null;
  }

  return {
    open() {
      root.hidden = false;
      root.scrollTop = 0;
      render();
      content.addEventListener('click', onClick);
      onKey = (event) => {
        if (event.repeat === true) return;
        if (event.key === 'Enter' && event.target instanceof Element && event.target.closest('.pick-card') !== null) {
          event.preventDefault();
          select(event.target.closest('.pick-card').dataset.choice);
          go(1);
          return;
        }
        const cards = [...content.querySelectorAll('.pick-card')];
        const byKey = cards.find((candidate) => candidate.dataset.key === event.key);
        if (byKey !== undefined) {
          event.preventDefault();
          select(byKey.dataset.choice);
          return;
        }
        if (event.key === 'Escape' || event.key === 'Backspace') {
          if (event.target instanceof HTMLElement && event.target.tagName === 'INPUT') return;
          go(-1);
        } else if ((event.key === 'r' || event.key === 'R') && step === LAST) roll();
        else if (event.key === 'ArrowRight' && step < LAST) go(1);
        else if (event.key === 'ArrowLeft') go(-1);
      };
      window.addEventListener('keydown', onKey);
      return new Promise((resolve) => {
        resolveDone = resolve;
      });
    },
    cancel() {
      cleanup();
      root.hidden = true;
      content.replaceChildren();
    },
  };
}

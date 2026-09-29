import { t, heroName, itemName } from '../../i18n.js';
import { el, append } from '../dom.js';
import { applyIcon } from '../icons.js';

export function waitForKeyedChoice(root, { guardMs = 400 } = {}) {
  const buttons = [...root.querySelectorAll('[data-choice]')];
  for (const button of buttons) button.disabled = true;
  let armedAt = null;
  let settled = false;
  let resolvePromise;
  const promise = new Promise((resolve) => {
    resolvePromise = resolve;
  });
  const onKey = (event) => {
    if (event.repeat === true || armedAt === null) return;
    const button = buttons.find((candidate) => candidate.dataset.key === event.key);
    if (button === undefined) return;
    event.preventDefault();
    finish(button.dataset.choice);
  };
  const armTimer = setTimeout(() => {
    armedAt = performance.now();
    for (const button of buttons) button.disabled = false;
    const primary = root.querySelector('.btn-primary');
    if (primary !== null && primary.isConnected === true) primary.focus({ preventScroll: true });
  }, guardMs);
  function cleanup() {
    clearTimeout(armTimer);
    window.removeEventListener('keydown', onKey);
  }
  function finish(choice) {
    if (settled === true || armedAt === null) return;
    settled = true;
    cleanup();
    resolvePromise({ choice, at: performance.now(), armedAt });
  }
  for (const button of buttons) button.addEventListener('click', () => finish(button.dataset.choice));
  window.addEventListener('keydown', onKey);
  return {
    promise,
    cancel() {
      settled = true;
      cleanup();
    },
  };
}

function keyedButton(label, choice, key, { primary = false, detail = null } = {}) {
  const button = el('button', primary === true ? 'btn btn-primary' : 'btn');
  button.type = 'button';
  button.dataset.choice = choice;
  button.dataset.key = String(key);
  append(button, el('span', '', label), detail === null ? null : el('small', '', detail));
  return button;
}

function iconScale() {
  return window.innerHeight <= 500 ? 2 : 3;
}

export function heroChoicePanel(easyHero) {
  const card = el('div', 'panel-card hero-pick');
  const potions = easyHero.potion === null || easyHero.potion === undefined ? 0 : 1;
  const detail = t('real.continueDetail', {
    cls: t(`class.${easyHero.cls}`),
    item: itemName(easyHero.item),
    potions: t(potions === 0 ? 'real.potionsNone' : potions === 1 ? 'real.potionsOne' : 'real.potionsCount', { n: potions }),
  });
  append(
    card,
    el('p', 'eyebrow', t('real.heroEyebrow')),
    append(
      el('div', 'hero-choice'),
      keyedButton(t('real.continue', { name: heroName(easyHero) }), 'continue', 1, { primary: true, detail }),
      keyedButton(t('real.newHero'), 'new', 2, { detail: t('real.newHeroDetail') }),
    ),
  );
  return card;
}

export function potionPanel({ options, hp, maxHp }) {
  const card = el('div', 'panel-card potion-pick');
  const actions = el('div', 'potion-actions');
  append(actions, keyedButton(t('real.drink'), 'drink', 1, { primary: true }), keyedButton(t('real.save'), 'save', 2));
  if (options.includes('double') === true) append(actions, keyedButton(t('real.double'), 'double', 3));
  append(card, el('p', 'eyebrow', t('real.potionEyebrow')), el('h2', 'panel-title', t('real.potionQuestion')), el('p', 'panel-subtitle', t('hud.hp', { hp, maxHp, max: maxHp })), actions);
  return card;
}

export function choiceLabel(question, choice) {
  if (question.id === 'skills') return choice.label;
  return t(`q.${question.id}.${choice.id}`);
}

export function geniePanel(question) {
  const card = el('div', 'panel-card genie-bubble');
  const grid = el('div', question.choices.length === 3 ? 'choice-grid is-three' : 'choice-grid');
  if (question.choices.length === 2) grid.classList.add('is-two');
  question.choices.forEach((choice, index) => {
    const button = el('button', 'choice-card');
    button.type = 'button';
    button.dataset.choice = choice.id;
    button.dataset.key = String(index + 1);
    const icon = el('span', 'px-icon');
    applyIcon(icon, `icon:${choice.icon}`, iconScale());
    append(button, icon, el('span', 'choice-label', choiceLabel(question, choice)), el('kbd', '', String(index + 1)));
    grid.append(button);
  });
  const result = el('p', 'genie-result');
  result.setAttribute('aria-live', 'polite');
  append(card, el('p', 'eyebrow', t('real.genieEyebrow')), el('h2', 'panel-title genie-question', t(`q.${question.id}.text`)), grid, result);
  return {
    el: card,
    mark(correctIds, pickedId) {
      for (const button of grid.querySelectorAll('.choice-card')) {
        button.disabled = true;
        if (correctIds.includes(button.dataset.choice) === true) button.classList.add('is-right');
        else if (button.dataset.choice === pickedId) button.classList.add('is-wrong');
      }
    },
    say(lines) {
      result.replaceChildren(...lines.map((line) => el('span', 'genie-line', line)));
    },
  };
}

export function doubleShotScene(hero) {
  const root = el('div', 'cutscene');
  root.setAttribute('aria-hidden', 'true');
  const stage = el('div', 'cutscene-stage');
  const face = el('div', 'cutscene-face');
  const head = el('span', 'px-icon');
  applyIcon(head, `tile:${hero.cls === 'warrior' ? 97 : 84}`, 14);
  face.append(head);
  const left = el('span', 'px-icon cutscene-potion is-left');
  const right = el('span', 'px-icon cutscene-potion is-right');
  applyIcon(left, 'icon:largePotion', 6);
  applyIcon(right, 'icon:largePotion', 6);
  append(stage, face, left, right, el('p', 'cutscene-title', t('real.doubleShot')));
  root.append(stage);
  return root;
}

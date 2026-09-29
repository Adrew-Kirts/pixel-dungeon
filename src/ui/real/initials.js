import { t } from '../../i18n.js';
import { el, append } from '../dom.js';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const HOLD_DELAY_MS = 360;
const FIRST_REPEAT_MS = 170;
const MIN_REPEAT_MS = 40;
const ACCELERATION = 0.84;

function shift(letter, step) {
  const index = LETTERS.indexOf(letter);
  return LETTERS[(index + step + LETTERS.length * 4) % LETTERS.length];
}

export function normalizeInitials(value) {
  if (typeof value !== 'string') return 'AAA';
  const clean = value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
  return clean.padEnd(3, 'A');
}

export function createInitialsEntry({ initial = 'AAA', onChange = () => {}, onSubmit = () => {}, onTick = () => {} } = {}) {
  const letters = normalizeInitials(initial).split('');
  let active = 0;
  let busy = false;
  const root = el('div', 'initials-entry');
  const row = el('div', 'initials');
  const error = el('p', 'initials-error');
  error.hidden = true;
  const save = el('button', 'btn btn-primary', t('real.initialsSave'));
  save.type = 'button';
  const slots = [];

  function render() {
    slots.forEach((slot, index) => {
      slot.letter.textContent = letters[index];
      slot.letter.classList.toggle('is-active', index === active);
      slot.letter.setAttribute('aria-label', `${index + 1}: ${letters[index]}`);
    });
  }

  function change(index, step) {
    if (busy === true) return;
    active = index;
    letters[index] = shift(letters[index], step);
    error.hidden = true;
    onTick();
    onChange(letters.join(''));
    render();
  }

  function holdable(element, index, step, { tapStep = step } = {}) {
    let holdTimer = 0;
    let repeatTimer = 0;
    let repeated = false;
    let pressed = false;
    const stop = () => {
      clearTimeout(holdTimer);
      clearTimeout(repeatTimer);
      pressed = false;
    };
    const repeat = (delay) => {
      repeated = true;
      change(index, step);
      repeatTimer = setTimeout(() => repeat(Math.max(MIN_REPEAT_MS, delay * ACCELERATION)), delay);
    };
    element.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;
      event.preventDefault();
      element.setPointerCapture?.(event.pointerId);
      pressed = true;
      repeated = false;
      holdTimer = setTimeout(() => repeat(FIRST_REPEAT_MS), HOLD_DELAY_MS);
    });
    element.addEventListener('pointerup', () => {
      if (pressed === true && repeated === false) change(index, tapStep);
      stop();
    });
    element.addEventListener('pointercancel', stop);
    element.addEventListener('lostpointercapture', stop);
    element.addEventListener('click', (event) => {
      if (event.detail === 0) change(index, tapStep);
    });
    element.addEventListener('contextmenu', (event) => event.preventDefault());
  }

  for (let index = 0; index < 3; index++) {
    const slot = el('div', 'initials-slot');
    const letter = el('button', 'initials-letter');
    letter.type = 'button';
    const up = el('button', 'initials-arrow', '▲');
    up.type = 'button';
    up.setAttribute('aria-label', t('real.initialsUp'));
    const down = el('button', 'initials-arrow', '▼');
    down.type = 'button';
    down.setAttribute('aria-label', t('real.initialsDown'));
    holdable(letter, index, 1);
    letter.addEventListener('focus', () => {
      active = index;
      render();
    });
    holdable(up, index, 1);
    holdable(down, index, -1);
    append(slot, letter, append(el('div', 'initials-arrows'), up, down));
    row.append(slot);
    slots.push({ letter });
  }

  const onKey = (event) => {
    if (busy === true || root.isConnected === false) return;
    if (event.metaKey === true || event.ctrlKey === true || event.altKey === true) return;
    const key = event.key;
    if (/^[a-zA-Z]$/.test(key) === true) {
      event.preventDefault();
      letters[active] = key.toUpperCase();
      active = Math.min(2, active + 1);
      error.hidden = true;
      onTick();
      render();
      return;
    }
    if (key === 'ArrowUp' || key === 'ArrowDown') {
      event.preventDefault();
      change(active, key === 'ArrowUp' ? 1 : -1);
    } else if (key === 'ArrowLeft' || key === 'Backspace') {
      event.preventDefault();
      active = Math.max(0, active - 1);
      render();
    } else if (key === 'ArrowRight') {
      event.preventDefault();
      active = Math.min(2, active + 1);
      render();
    } else if (key === 'Enter') {
      event.preventDefault();
      submit();
    }
  };

  function submit() {
    if (busy === true) return;
    onSubmit(letters.join(''));
  }

  save.addEventListener('click', submit);
  window.addEventListener('keydown', onKey);
  append(root, row, el('p', 'initials-hint', t('real.initialsHint')), error, save);
  render();

  return {
    el: root,
    value: () => letters.join(''),
    setBusy(value) {
      busy = value;
      save.disabled = value;
    },
    showError(text) {
      error.textContent = text;
      error.hidden = false;
    },
    destroy() {
      window.removeEventListener('keydown', onKey);
    },
  };
}

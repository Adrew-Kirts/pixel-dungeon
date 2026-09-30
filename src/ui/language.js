import { applyIcon } from './icons.js';

const PICK_MS = 3200;

export function pickLanguage(preselected) {
  const root = document.getElementById('lang-picker');
  const options = [...root.querySelectorAll('[data-lang]')];
  const fill = root.querySelector('.auto-bar-fill');
  for (const option of options) applyIcon(option.querySelector('.px-icon'), `icon:${option.dataset.flag}`, window.innerHeight <= 500 ? 3 : 4);
  let selected = preselected;
  function render() {
    for (const option of options) {
      const active = option.dataset.lang === selected;
      option.classList.toggle('is-selected', active);
      option.setAttribute('aria-pressed', String(active));
    }
  }
  render();
  root.hidden = false;
  fill.style.transition = 'none';
  fill.style.transform = 'scaleX(1)';
  void fill.offsetWidth;
  fill.style.transition = `transform ${PICK_MS}ms linear`;
  fill.style.transform = 'scaleX(0)';
  return new Promise((resolve) => {
    let done = false;
    const finish = (lang) => {
      if (done === true) return;
      done = true;
      clearTimeout(timer);
      window.removeEventListener('keydown', onKey);
      selected = lang;
      render();
      setTimeout(() => {
        root.hidden = true;
        resolve(lang);
      }, 180);
    };
    const timer = setTimeout(() => finish(selected), PICK_MS);
    const onKey = (event) => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        selected = selected === 'en' ? 'fr' : 'en';
        render();
      } else if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        finish(selected);
      }
    };
    window.addEventListener('keydown', onKey);
    for (const option of options) option.addEventListener('click', () => finish(option.dataset.lang));
  });
}

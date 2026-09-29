import { toScreen } from '../engine/view.js';
import { applyIcon, clearIcon } from './icons.js';
import { clampCenter } from './layout.js';
import { t, heroName, foeName, dragonTitle, formatNumber } from '../i18n.js';

const LOW_HP_RATIO = 0.35;

export function createHud({ getView }) {
  const $ = (selector) => document.querySelector(selector);
  const heroCard = $('#hero-card');
  const foeCard = $('#foe-card');
  const bossBar = $('#boss-bar');
  const progress = $('#progress');
  const meterElement = $('#meter');
  const meterTrack = meterElement.querySelector('.meter-track');
  const meterHit = meterElement.querySelector('.meter-hit');
  const meterCrit = meterElement.querySelector('.meter-crit');
  const meterMarker = meterElement.querySelector('.meter-marker');
  const meterLabel = meterElement.querySelector('.meter-label');
  const banner = $('#banner');
  const panel = $('#panel');
  const hint = $('#hint');
  const fx = $('#fx');
  const announcer = $('#announcer');
  const caption = $('#caption');
  let captionTimer = 0;
  const scoreHud = $('#score-hud');
  const scoreValue = scoreHud.querySelector('[data-role="value"]');
  const scoreRoom = scoreHud.querySelector('[data-role="room"]');
  let meterState = null;
  let panelTimer = 0;
  let bannerTimer = 0;

  for (const icon of progress.querySelectorAll('[data-icon]')) applyIcon(icon, icon.dataset.icon, 2);

  function setBar(bar, hp, max) {
    const percent = Math.max(0, Math.min(100, (hp / max) * 100));
    bar.querySelector('.bar-fill').style.width = `${percent}%`;
    bar.querySelector('.bar-trail').style.width = `${percent}%`;
    bar.classList.toggle('is-low', hp > 0 && hp / max <= LOW_HP_RATIO);
  }

  function setBarInstant(bar, hp, max) {
    const fill = bar.querySelector('.bar-fill');
    const trail = bar.querySelector('.bar-trail');
    fill.style.transition = 'none';
    trail.style.transition = 'none';
    setBar(bar, hp, max);
    void bar.offsetWidth;
    fill.style.transition = '';
    trail.style.transition = '';
  }

  function slot(role, iconKey) {
    const container = heroCard.querySelector(`[data-role="${role}"]`);
    const icon = container.querySelector('.px-icon');
    if (iconKey === null) {
      clearIcon(icon);
      container.title = role === 'item' ? 'Item' : 'No potion';
      return;
    }
    applyIcon(icon, iconKey, 1.5);
    container.classList.remove('is-new');
    void container.offsetWidth;
    container.classList.add('is-new');
  }

  function heroIconKey(hero) {
    return `tile:${hero.cls === 'warrior' ? 97 : 84}`;
  }

  function updateMeter(now) {
    if (meterState === null) return;
    const position = meterState.frozen ?? positionAt(now);
    meterMarker.style.transform = `translate3d(${position * meterState.width}px, 0, 0)`;
  }

  function positionAt(now) {
    const cycle = ((now - meterState.startedAt) / meterState.sweepMs) % 2;
    return cycle < 1 ? cycle : 2 - cycle;
  }

  return {
    update(now) {
      updateMeter(now);
    },
    showHero(hero) {
      const portrait = heroCard.querySelector('[data-role="portrait"]');
      applyIcon(portrait, heroIconKey(hero), window.innerWidth <= 620 ? 2 : 3);
      portrait.classList.toggle('is-legendary', hero.legendary === true);
      heroCard.querySelector('[data-role="name"]').textContent = heroName(hero);
      applyIcon(progress.querySelector('[data-role="marker-icon"]'), heroIconKey(hero), 1.5);
      this.setHeroHp(hero.hp, hero.maxHp, true);
      slot('item', `icon:${hero.item.icon}`);
      slot('potion', null);
      heroCard.hidden = false;
    },
    setHeroHp(hp, max, instant = false) {
      const bar = heroCard.querySelector('[data-role="bar"]');
      if (instant === true) setBarInstant(bar, hp, max);
      else setBar(bar, hp, max);
      heroCard.querySelector('[data-role="hp"]').textContent = t('hud.hp', { hp, max });
    },
    setItem(item) {
      slot('item', `icon:${item.icon}`);
    },
    setPotion(potion) {
      slot('potion', potion === null ? null : `icon:${potion.icon}`);
    },
    setPotions(potions) {
      slot('potion', potions.length === 0 ? null : `icon:${potions[0].icon}`);
      heroCard.querySelector('[data-role="potion"]').dataset.count = potions.length > 1 ? `×${potions.length}` : '';
    },
    score: {
      show(value) {
        scoreValue.textContent = formatNumber(value);
        scoreHud.hidden = false;
      },
      set(value) {
        scoreValue.textContent = formatNumber(value);
        scoreValue.classList.remove('is-bumped');
        void scoreValue.offsetWidth;
        scoreValue.classList.add('is-bumped');
      },
      room(text) {
        scoreRoom.textContent = text;
      },
    },
    showFoe(foe) {
      foeCard.querySelector('[data-role="name"]').textContent = foeName(foe);
      applyIcon(foeCard.querySelector('[data-role="portrait"]'), `tile:${foe.tile}`, window.innerWidth <= 620 ? 2 : 3);
      this.setFoeHp(foe.hp, foe.maxHp, true);
      foeCard.hidden = false;
    },
    setFoeHp(hp, max, instant = false) {
      const bar = foeCard.querySelector('[data-role="bar"]');
      if (instant === true) setBarInstant(bar, hp, max);
      else setBar(bar, hp, max);
      foeCard.querySelector('[data-role="hp"]').textContent = t('hud.hp', { hp, max });
    },
    hideFoe() {
      foeCard.hidden = true;
    },
    showBoss(dragon) {
      bossBar.querySelector('[data-role="name"]').textContent = dragon.name.toUpperCase();
      bossBar.querySelector('[data-role="title"]').textContent = dragon.titleIndex === undefined ? dragon.title ?? '' : dragonTitle(dragon);
      const bar = bossBar.querySelector('[data-role="bar"]');
      bar.style.setProperty('--segments', String(Math.round(dragon.maxHp / dragon.segment)));
      setBarInstant(bar, dragon.hp, dragon.maxHp);
      bossBar.classList.remove('is-enraged');
      bossBar.hidden = false;
    },
    setBossHp(hp, max) {
      setBar(bossBar.querySelector('[data-role="bar"]'), hp, max);
    },
    setEnraged(value) {
      bossBar.classList.toggle('is-enraged', value);
    },
    hideBoss() {
      bossBar.hidden = true;
    },
    progress(step) {
      progress.hidden = false;
      const steps = [...progress.querySelectorAll('.progress-step')];
      steps.forEach((element, index) => {
        element.classList.toggle('is-done', index < step);
        element.classList.toggle('is-current', index === step);
      });
      const target = steps[Math.min(step, steps.length - 1)];
      const offset = target.offsetLeft + target.offsetWidth / 2 - 12 + (step >= steps.length ? 22 : 0);
      progress.querySelector('.progress-marker').style.setProperty('--marker-x', `${offset}px`);
    },
    meter: {
      open({ zones, sweepMs, offset = 0 }, { label = true } = {}) {
        meterHit.style.setProperty('--width', `${(zones.crit + zones.hit) * 100}%`);
        meterCrit.style.setProperty('--width', `${zones.crit * 100}%`);
        meterHit.style.setProperty('--center', `${(0.5 + offset) * 100}%`);
        meterCrit.style.setProperty('--center', `${(0.5 + offset) * 100}%`);
        meterElement.classList.remove('is-stopped', 'zone-crit', 'zone-hit', 'zone-glance');
        meterLabel.hidden = label === false;
        meterElement.hidden = false;
        meterState = { startedAt: performance.now(), sweepMs, frozen: null, width: meterTrack.clientWidth };
        updateMeter(performance.now());
      },
      position() {
        if (meterState === null) return 0.5;
        return meterState.frozen ?? positionAt(performance.now());
      },
      elapsed(at) {
        if (meterState === null) return 0;
        return Math.max(0, at - meterState.startedAt);
      },
      stop(position, zone) {
        if (meterState === null) return;
        meterState.frozen = position;
        meterElement.classList.add('is-stopped', `zone-${zone}`);
        updateMeter(performance.now());
      },
      close() {
        meterElement.hidden = true;
        meterState = null;
      },
      resize() {
        if (meterState !== null) meterState.width = meterTrack.clientWidth;
      },
    },
    floatText(x, y, text, kind) {
      const view = getView();
      const point = toScreen(view, x, y);
      const element = document.createElement('div');
      element.className = `float float-${kind}`;
      element.textContent = text;
      element.style.top = `${point.top}px`;
      fx.append(element);
      const center = point.left + (Math.random() * 10 - 5);
      element.style.left = `${clampCenter(center, element.offsetWidth, fx.clientWidth)}px`;
      const remove = () => element.remove();
      element.addEventListener('animationend', remove, { once: true });
      setTimeout(remove, 2400);
    },
    banner(title, subtitle) {
      clearTimeout(bannerTimer);
      banner.classList.remove('is-leaving');
      banner.querySelector('[data-role="title"]').textContent = title;
      banner.querySelector('[data-role="subtitle"]').textContent = subtitle;
      banner.hidden = false;
    },
    hideBanner() {
      banner.classList.add('is-leaving');
      bannerTimer = setTimeout(() => {
        banner.hidden = true;
        banner.classList.remove('is-leaving');
      }, 320);
    },
    hint(text) {
      hint.hidden = text === null;
      if (text !== null) hint.textContent = text;
    },
    panel(content) {
      clearTimeout(panelTimer);
      panel.classList.remove('is-leaving');
      panel.replaceChildren(content);
      panel.hidden = false;
    },
    closePanel() {
      panel.classList.add('is-leaving');
      return new Promise((resolve) => {
        panelTimer = setTimeout(() => {
          panel.hidden = true;
          panel.replaceChildren();
          panel.classList.remove('is-leaving');
          resolve();
        }, 170);
      });
    },
    announce(text) {
      announcer.textContent = text;
    },
    caption(text, ms = 2400) {
      clearTimeout(captionTimer);
      caption.textContent = text;
      caption.hidden = false;
      caption.classList.remove('is-typing');
      void caption.offsetWidth;
      caption.classList.add('is-typing');
      caption.style.setProperty('--chars', String(text.length));
      captionTimer = setTimeout(() => {
        caption.hidden = true;
      }, ms);
    },
    reset() {
      clearTimeout(panelTimer);
      clearTimeout(bannerTimer);
      clearTimeout(captionTimer);
      caption.hidden = true;
      for (const element of [heroCard, foeCard, bossBar, progress, meterElement, banner, panel, hint, scoreHud]) element.hidden = true;
      heroCard.querySelector('[data-role="potion"]').dataset.count = '';
      panel.replaceChildren();
      fx.replaceChildren();
      bossBar.classList.remove('is-enraged');
      meterState = null;
    },
  };
}

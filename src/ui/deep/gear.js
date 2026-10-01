import { applyIcon, clearIcon } from '../icons.js';
import { WEAPONS, SHIELDS, POTIONS, CLASSES } from '../../deep/content.js';
import { t } from '../../i18n.js';

function slot(role) {
  return document.querySelector(`#hero-card [data-role="${role}"]`);
}

function pop(element) {
  element.classList.remove('is-new');
  void element.offsetWidth;
  element.classList.add('is-new');
}

function setDurability(element, item, def) {
  const bar = element.querySelector('.slot-dur');
  if (item.dur === null || def.durability === null) {
    bar.hidden = true;
    element.classList.remove('is-worn', 'is-critical');
    return;
  }
  const ratio = Math.max(0, item.dur / def.durability);
  bar.hidden = false;
  bar.querySelector('i').style.width = `${Math.round(ratio * 100)}%`;
  element.classList.toggle('is-worn', ratio <= 0.5 && ratio > 0.25);
  element.classList.toggle('is-critical', ratio <= 0.25);
  element.title = `${t(`deep.item.${def.id}`)} · ${item.dur}/${def.durability}`;
}

export function showDeepHero(hud, hero, name) {
  const card = document.getElementById('hero-card');
  const portrait = card.querySelector('[data-role="portrait"]');
  applyIcon(portrait, CLASSES[hero.cls].key, window.innerWidth <= 620 ? 2 : 3);
  portrait.classList.remove('is-legendary');
  card.querySelector('[data-role="name"]').textContent = name;
  hud.setHeroHp(hero.hp, hero.maxHp, true);
  showDeepGear(hero);
  card.hidden = false;
}

function showDeepGear(hero) {
  for (const role of ['shield', 'key']) slot(role).hidden = false;
  updateWeapon(hero.weapon, false);
  updateShield(hero.shield, false);
  updatePotions(hero.potions, false);
  updateKeycard(hero.keycard);
}

export function hideDeepGear() {
  for (const role of ['shield', 'key']) slot(role).hidden = true;
  for (const role of ['item', 'shield']) {
    const element = slot(role);
    element.querySelector('.slot-dur').hidden = true;
    element.classList.remove('is-worn', 'is-critical');
  }
  slot('potion').dataset.count = '';
}

export function updateWeapon(item, animate = true) {
  const element = slot('item');
  const def = WEAPONS[item.id];
  applyIcon(element.querySelector('.px-icon'), def.key, 1.5);
  setDurability(element, item, def);
  if (animate === true) pop(element);
}

export function updateShield(item, animate = true) {
  const element = slot('shield');
  const def = SHIELDS[item.id];
  applyIcon(element.querySelector('.px-icon'), def.key, 1.5);
  setDurability(element, item, def);
  if (animate === true) pop(element);
}

export function updatePotions(potions, animate = true) {
  const element = slot('potion');
  const icon = element.querySelector('.px-icon');
  if (potions.length === 0) clearIcon(icon);
  else applyIcon(icon, POTIONS[['cola', 'large', 'small'].find((id) => potions.includes(id) === true)].key, 1.5);
  element.dataset.count = potions.length > 1 ? `×${potions.length}` : '';
  element.title = potions.length === 0 ? t('deep.noPotion') : potions.map((id) => t(`deep.item.${id}`)).join(', ');
  if (animate === true) pop(element);
}

export function updateKeycard(keycard) {
  const element = slot('key');
  const icon = element.querySelector('.px-icon');
  if (keycard === true) {
    applyIcon(icon, 'icon:keycard', 1.5);
    element.classList.add('has-key');
    pop(element);
  } else {
    clearIcon(icon);
    element.classList.remove('has-key');
  }
}

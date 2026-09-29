import { STRINGS, FEMININE_NAMES, EPITHETS_FR } from './strings.js';

const SUPPORTED = ['en', 'fr'];
let language = 'en';
let storageRef = null;
const listeners = new Set();

export function detectLanguage(storage, navigatorLike = globalThis.navigator) {
  const stored = storage === null ? null : storage.get('lang');
  if (SUPPORTED.includes(stored) === true) return stored;
  const preferred = navigatorLike?.languages ?? [navigatorLike?.language ?? 'en'];
  return preferred.some((tag) => typeof tag === 'string' && tag.toLowerCase().startsWith('fr')) === true ? 'fr' : 'en';
}

export function initLanguage(storage) {
  storageRef = storage;
  language = detectLanguage(storage);
  return language;
}

export function getLanguage() {
  return language;
}

export function setLanguage(next) {
  if (SUPPORTED.includes(next) === false) return;
  if (storageRef !== null) storageRef.set('lang', next);
  if (next === language) return;
  language = next;
  for (const listener of listeners) listener(language);
}

export function onLanguageChange(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function t(key, params = {}) {
  const table = STRINGS[language] ?? STRINGS.en;
  const template = table[key] ?? STRINGS.en[key] ?? key;
  return template.replace(/\{(\w+)\}/g, (match, name) => (Object.hasOwn(params, name) === true ? String(params[name]) : match));
}

export function has(key) {
  return Object.hasOwn(STRINGS[language] ?? {}, key) === true || Object.hasOwn(STRINGS.en, key) === true;
}

export function formatNumber(value) {
  return Math.round(value).toLocaleString(language === 'fr' ? 'fr-FR' : 'en-US');
}

export function heroName(hero) {
  if (language === 'en' || hero.firstName === undefined || hero.epithetIndex === undefined) return hero.name;
  const forms = EPITHETS_FR[hero.epithetIndex];
  if (forms === undefined) return hero.name;
  return `${hero.firstName} ${FEMININE_NAMES.includes(hero.firstName) === true ? forms[1] : forms[0]}`;
}

export function itemName(item) {
  return t(`item.${item.id}.name`);
}

export function itemLine(item) {
  return t(`item.${item.id}.line`);
}

export function potionName(potion) {
  return t(`potion.${potion.id}.name`);
}

export function foeName(foe) {
  const key = `foe.${foe.id}.name`;
  return has(key) === true ? t(key) : foe.name;
}

export function foeLine(foe) {
  const key = `foe.${foe.id}.line`;
  return has(key) === true ? t(key) : foe.line ?? '';
}

export function dragonTitle(dragon) {
  const key = `dragon.title.${dragon.titleIndex}`;
  return has(key) === true ? t(key) : dragon.title;
}

export function applyStaticTranslations(root = document) {
  document.documentElement.lang = language;
  for (const element of root.querySelectorAll('[data-i18n]')) element.textContent = t(element.dataset.i18n);
  for (const element of root.querySelectorAll('[data-i18n-html]')) element.innerHTML = t(element.dataset.i18nHtml);
  for (const element of root.querySelectorAll('[data-i18n-attr]')) {
    for (const pair of element.dataset.i18nAttr.split(';')) {
      const [attribute, key] = pair.split(':');
      element.setAttribute(attribute.trim(), t(key.trim()));
    }
  }
}

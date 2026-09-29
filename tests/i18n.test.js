import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STRINGS, EPITHETS_FR, FEMININE_NAMES } from '../src/strings.js';
import { EPITHETS, FIRST_NAMES, DRAGON_TITLES, EPITAPHS } from '../src/content.js';
import { HARD_MONSTERS, QUESTIONS } from '../src/real/content.js';
import { detectLanguage, initLanguage, setLanguage, t, heroName } from '../src/i18n.js';

const memory = (value = null) => ({ store: new Map(value === null ? [] : [['lang', value]]), get(key) { return this.store.get(key) ?? null; }, set(key, v) { this.store.set(key, v); return true; } });

test('every English string has a French translation and the same placeholders', () => {
  for (const [key, english] of Object.entries(STRINGS.en)) {
    assert.equal(Object.hasOwn(STRINGS.fr, key), true, `missing fr: ${key}`);
    const placeholders = (text) => [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
    assert.deepEqual(placeholders(STRINGS.fr[key]), placeholders(english), `placeholders differ: ${key}`);
  }
});

test('game content has translations for every entry', () => {
  assert.equal(EPITHETS_FR.length, EPITHETS.length);
  for (const name of FEMININE_NAMES) assert.equal(FIRST_NAMES.includes(name), true);
  DRAGON_TITLES.forEach((title, index) => assert.equal(STRINGS.en[`dragon.title.${index}`], title));
  EPITAPHS.forEach((_, index) => assert.equal(Object.hasOwn(STRINGS.fr, `epitaph.${index}`), true));
  for (const monster of HARD_MONSTERS) assert.equal(Object.hasOwn(STRINGS.fr, `foe.${monster.id}.name`), true);
  for (const question of Object.values(QUESTIONS)) {
    assert.equal(Object.hasOwn(STRINGS.fr, `q.${question.id}.text`), true);
    for (const choice of question.choices) assert.equal(Object.hasOwn(STRINGS.fr, `q.${question.id}.${choice.id}`), true, `${question.id}.${choice.id}`);
  }
});

test('language comes from storage, then the browser, then English', () => {
  assert.equal(detectLanguage(memory('fr'), { languages: ['en-US'] }), 'fr');
  assert.equal(detectLanguage(memory(), { languages: ['fr-FR', 'en'] }), 'fr');
  assert.equal(detectLanguage(memory(), { languages: ['nl-NL'] }), 'en');
  assert.equal(detectLanguage(memory('xx'), { language: 'fr-CA' }), 'fr');
});

test('t fills placeholders and switching language is remembered', () => {
  const storage = memory('en');
  initLanguage(storage);
  setLanguage('fr');
  assert.equal(t('float.combo', { n: 3 }), 'COMBO ×3 !');
  assert.equal(storage.get('lang'), 'fr');
  setLanguage('en');
  assert.equal(t('float.combo', { n: 3 }), 'COMBO ×3!');
});

test('french hero names follow the hero gender', () => {
  initLanguage(memory('fr'));
  const index = EPITHETS.indexOf('the Overcaffeinated');
  assert.equal(heroName({ name: 'Brunhilda the Overcaffeinated', firstName: 'Brunhilda', epithetIndex: index }), 'Brunhilda la Surcaféinée');
  assert.equal(heroName({ name: 'Gerald the Overcaffeinated', firstName: 'Gerald', epithetIndex: index }), 'Gerald le Surcaféiné');
  setLanguage('en');
  assert.equal(heroName({ name: 'Gerald the Overcaffeinated', firstName: 'Gerald', epithetIndex: index }), 'Gerald the Overcaffeinated');
});

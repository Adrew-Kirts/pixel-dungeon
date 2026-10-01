import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { STRINGS } from '../src/strings.js';
import { CLASSES, WEAPONS, SHIELDS, POTIONS, NODES, MONSTERS } from '../src/deep/content.js';

function files(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() === true ? files(path) : path.endsWith('.js') === true ? [path] : [];
  });
}

test('every literal deep and fairy key used in the code exists in both languages', () => {
  const sources = [...files('src/deep'), ...files('src/ui/deep')].map((path) => readFileSync(path, 'utf8')).join('\n');
  const keys = new Set([...sources.matchAll(/(?<![A-Za-z.])t\('((?:deep|fairy)\.[A-Za-z0-9.]+)'/g)].map((match) => match[1]));
  assert.ok(keys.size > 50, `found ${keys.size}`);
  for (const key of keys) {
    assert.equal(Object.hasOwn(STRINGS.en, key), true, `missing en ${key}`);
    assert.equal(Object.hasOwn(STRINGS.fr, key), true, `missing fr ${key}`);
  }
});

test('every class, item, room and foe has its names', () => {
  const needed = [];
  for (const id of Object.keys(CLASSES)) needed.push(`deep.class.${id}`, `deep.class.${id}.perk`);
  for (const id of [...Object.keys(WEAPONS), ...Object.keys(SHIELDS), ...Object.keys(POTIONS), 'keycard']) needed.push(`deep.item.${id}`, `deep.item.${id}.perk`);
  for (const id of Object.keys(NODES)) needed.push(`deep.room.${id}`, `deep.room.${id}.line`);
  for (const id of [...Object.keys(MONSTERS), 'manager', 'moth']) needed.push(`deep.foe.${id}`, `deep.killer.${id}`);
  for (const id of ['strikes', 'combos', 'defense', 'dodges', 'horde', 'kills', 'flawless', 'explore', 'hp', 'time']) needed.push(`deep.line.${id}`);
  for (const id of ['nav', 'strike', 'defend', 'armor', 'ghost', 'arrows', 'horde']) for (const part of ['eyebrow', 'title', 'text', 'short']) needed.push(`deep.tip.${id}.${part}`);
  for (const id of ['lock', 'lastpass', 'meeting', 'seeds', 'melon']) needed.push(`deep.manager.${id}`);
  for (const id of ['basic', 'common', 'rare', 'epic', 'legendary']) needed.push(`deep.tier.${id}`);
  for (const key of needed) {
    assert.equal(Object.hasOwn(STRINGS.en, key), true, `missing en ${key}`);
    assert.equal(Object.hasOwn(STRINGS.fr, key), true, `missing fr ${key}`);
  }
});

test('the manager speaks the original French lines', () => {
  const plain = (text) => text.replaceAll('\u202f', ' ');
  assert.equal(plain(STRINGS.fr['deep.manager.lock']), 'Verrouille ton ordi !');
  assert.equal(plain(STRINGS.fr['deep.manager.lastpass']), 'Tous les mots de passe dans LastPass !');
  assert.equal(plain(STRINGS.fr['deep.manager.meeting']), 'Pas mal en réunion avec tout le monde.');
  assert.equal(plain(STRINGS.fr['deep.manager.melon']), "J'ai une tête comme une pastèque !");
  assert.equal(STRINGS.fr['deep.manager.lock'].includes(' !'), false);
});

test('every difficulty has its names and try hard stays in English', async () => {
  const { DIFFICULTIES } = await import('../src/deep/content.js');
  for (const id of Object.keys(DIFFICULTIES)) {
    for (const key of [`deep.difficulty.${id}`, `deep.difficulty.${id}.perk`, `deep.difficulty.${id}.short`]) {
      assert.equal(Object.hasOwn(STRINGS.en, key), true, `missing en ${key}`);
      assert.equal(Object.hasOwn(STRINGS.fr, key), true, `missing fr ${key}`);
    }
  }
  assert.equal(STRINGS.fr['deep.difficulty.tryhard'], 'Try Hard');
  assert.equal(STRINGS.en['deep.difficulty.tryhard'], 'Try Hard');
  assert.equal(STRINGS.fr['deep.difficulty.hard'], 'Difficile');
});

test('in try hard Lumi only has short cryptic lines', () => {
  const cryptic = Object.keys(STRINGS.en).filter((key) => key.startsWith('deep.fairy.') && key.endsWith('.cryptic'));
  assert.ok(cryptic.length >= 8, `found ${cryptic.length}`);
  for (const key of cryptic) {
    assert.equal(Object.hasOwn(STRINGS.fr, key), true, `missing fr ${key}`);
    assert.ok(STRINGS.en[key].length <= 40, `${key} too long`);
  }
});

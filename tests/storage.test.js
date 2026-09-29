import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStorage } from '../src/engine/storage.js';

function memoryBackend() {
  const data = new Map();
  return {
    data,
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
  };
}

test('storage round-trips values under the sw prefix', () => {
  const backend = memoryBackend();
  const storage = createStorage(() => backend);
  assert.equal(storage.set('muted', '1'), true);
  assert.equal(storage.get('muted'), '1');
  assert.equal(backend.data.get('sw:muted'), '1');
});

test('storage returns null for missing keys', () => {
  assert.equal(createStorage(() => memoryBackend()).get('nothing'), null);
});

test('storage never throws when the backend throws', () => {
  const broken = {
    getItem: () => {
      throw new Error('SecurityError');
    },
    setItem: () => {
      throw new Error('QuotaExceededError');
    },
  };
  const storage = createStorage(() => broken);
  assert.equal(storage.get('muted'), null);
  assert.equal(storage.set('muted', '1'), false);
});

test('storage never throws when reaching the backend throws', () => {
  const storage = createStorage(() => {
    throw new Error('SecurityError');
  });
  assert.equal(storage.get('muted'), null);
  assert.equal(storage.set('muted', '1'), false);
  assert.equal(storage.getJson('record'), null);
});

test('storage json helpers round-trip and ignore corrupt data', () => {
  const backend = memoryBackend();
  const storage = createStorage(() => backend);
  storage.setJson('record', { rank: 'A', timeMs: 12000 });
  assert.deepEqual(storage.getJson('record'), { rank: 'A', timeMs: 12000 });
  backend.data.set('sw:record', '{broken');
  assert.equal(storage.getJson('record'), null);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clampCenter } from '../src/ui/layout.js';

test('clampCenter keeps a centred element inside the viewport margin', () => {
  assert.equal(clampCenter(259, 257, 360, 8), 360 - 8 - 257 / 2);
  assert.equal(clampCenter(20, 100, 360, 8), 8 + 50);
  assert.equal(clampCenter(180, 100, 360, 8), 180);
});

test('clampCenter centres elements wider than the viewport', () => {
  assert.equal(clampCenter(300, 400, 360, 8), 180);
});

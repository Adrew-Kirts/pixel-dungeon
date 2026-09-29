import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeView, toScreen } from '../src/engine/view.js';

const cases = [
  { vw: 390, vh: 844, dpr: 3, portrait: true },
  { vw: 1366, vh: 768, dpr: 1, portrait: false },
  { vw: 1920, vh: 1080, dpr: 1, portrait: false },
  { vw: 1512, vh: 982, dpr: 2, portrait: false },
  { vw: 360, vh: 740, dpr: 2.625, portrait: true },
];

for (const { vw, vh, dpr, portrait } of cases) {
  test(`view ${vw}x${vh}@${dpr} uses an integer physical scale and covers the viewport`, () => {
    const view = computeView(vw, vh, dpr);
    assert.equal(view.portrait, portrait);
    assert.ok(Number.isInteger(view.k) && view.k >= 2);
    assert.equal(view.css, view.k / dpr);
    assert.ok(view.W * view.css >= vw);
    assert.ok(view.H * view.css >= vh);
    assert.ok(view.offsetX <= 0 && view.offsetY <= 0);
  });

  test(`view ${vw}x${vh}@${dpr} keeps the logical scene near its target size`, () => {
    const view = computeView(vw, vh, dpr);
    const shortSide = Math.min(view.W, view.H);
    const target = portrait === true ? 100 : 140;
    assert.ok(shortSide >= target * 0.85 && shortSide <= target * 1.2, `short side ${shortSide}`);
    assert.ok(view.groundY > view.H * 0.5 && view.groundY < view.H * 0.75);
  });
}

test('toScreen converts logical coordinates to css pixels', () => {
  const view = computeView(1366, 768, 1);
  const point = toScreen(view, 10, 20);
  assert.equal(point.left, view.offsetX + 10 * view.css);
  assert.equal(point.top, view.offsetY + 20 * view.css);
});

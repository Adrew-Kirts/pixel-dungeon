import { test } from 'node:test';
import assert from 'node:assert/strict';
import { judgeBeats, createLiveJudge } from '../src/deep/judge.js';

const WINDOWS = { perfect: 50, good: 140 };

test('a tap on the beat is perfect, a little off is good, far off is a miss', () => {
  const results = judgeBeats([1000], [1020], WINDOWS);
  assert.equal(results[0].grade, 'perfect');
  assert.equal(judgeBeats([1000], [1100], WINDOWS)[0].grade, 'good');
  assert.equal(judgeBeats([1000], [1300], WINDOWS)[0].grade, 'miss');
});

test('no tap is a miss with no error', () => {
  const [result] = judgeBeats([1000], [], WINDOWS);
  assert.equal(result.grade, 'miss');
  assert.equal(result.error, null);
});

test('an early tap is the only attempt: tapping again on time does not save you', () => {
  const [result] = judgeBeats([1000], [500, 1000], WINDOWS);
  assert.equal(result.grade, 'miss');
  assert.equal(result.tap, 500);
});

test('mashing fails: the first tap is judged', () => {
  const taps = Array.from({ length: 40 }, (_, index) => index * 50);
  const results = judgeBeats([1000, 1400, 1800], taps, WINDOWS);
  assert.deepEqual(results.map((result) => result.grade), ['miss', 'miss', 'miss']);
});

test('extra taps inside a beat window are ignored, the next beat gets its own attempt', () => {
  const results = judgeBeats([1000, 1400], [1000, 1010, 1400], WINDOWS);
  assert.deepEqual(results.map((result) => result.grade), ['perfect', 'perfect']);
});

test('tap order in the input does not matter', () => {
  const a = judgeBeats([1000, 1400], [1400, 1000], WINDOWS);
  const b = judgeBeats([1000, 1400], [1000, 1400], WINDOWS);
  assert.deepEqual(a, b);
});

test('the live judge matches the batch judge tap by tap', () => {
  const beats = [900, 1300, 1700, 2000, 2500];
  const taps = [400, 905, 1250, 1260, 1760, 1790, 2600];
  const live = createLiveJudge(beats, WINDOWS);
  for (const tap of taps) {
    live.expire(tap);
    live.tap(tap);
  }
  live.expire(Number.POSITIVE_INFINITY);
  assert.deepEqual(live.results(), judgeBeats(beats, taps, WINDOWS));
});

test('the live judge reports which beat a tap resolved', () => {
  const live = createLiveJudge([1000, 1400], WINDOWS);
  assert.deepEqual(live.tap(1010), { index: 0, grade: 'perfect', error: 10 });
  assert.equal(live.tap(1020), null);
  assert.deepEqual(live.expire(1600), [{ index: 1, grade: 'miss', error: null }]);
});

test('taps beyond the budget are flails and cannot resolve beats', () => {
  const taps = Array.from({ length: 30 }, (_, index) => index * 40);
  const results = judgeBeats([900, 1240], taps, WINDOWS, 2);
  assert.deepEqual(results.map((result) => result.grade), ['miss', 'miss']);
  const honest = judgeBeats([900, 1240], [905, 950, 1245], WINDOWS, 2);
  assert.deepEqual(honest.map((result) => result.grade), ['perfect', 'perfect']);
});

test('the live judge flails at the same tap as the batch budget', () => {
  const beats = [900, 1240];
  const taps = [100, 200, 300, 400, 905, 1245];
  const live = createLiveJudge(beats, WINDOWS, 2);
  const seen = taps.map((tap) => live.tap(tap));
  live.expire(Number.POSITIVE_INFINITY);
  assert.equal(seen[4].grade, 'flail');
  assert.deepEqual(live.results(), judgeBeats(beats, taps, WINDOWS, 2));
});

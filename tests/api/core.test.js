import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sign, verify } from '../../api/tokens.js';
import { createStore } from '../../api/store.js';
import { validateRealRun, botCheck, ValidationError } from '../../api/validate.js';
import { createRateLimiter } from '../../api/ratelimit.js';
import { isAllowedInitials } from '../../api/blocklist.js';
import { renderSharePage } from '../../api/share.js';
import { jitteredPolicy, perfectBotPolicy, nearPerfectHumanPolicy, playReal, playEasy } from './helpers.js';

const SECRET = 'test-secret';

test('tokens verify only for the run they were signed for', () => {
  const token = sign(SECRET, 'run-1');
  assert.equal(verify(SECRET, 'run-1', token), true);
  assert.equal(verify(SECRET, 'run-2', token), false);
  assert.equal(verify('other', 'run-1', token), false);
  assert.equal(verify(SECRET, 'run-1', `${token}x`), false);
  assert.equal(verify(SECRET, 'run-1', 42), false);
});

test('store keeps runs and results and ranks the top five with initials', () => {
  const store = createStore(':memory:');
  store.createRun({ id: 'r1', mode: 'real', seed: 7, issuedAt: 1000 });
  assert.deepEqual(store.getRun('r1'), { id: 'r1', mode: 'real', seed: 7, issuedAt: 1000, finishedAt: null, continuedBy: null });
  store.finishRun('r1', 5000);
  assert.equal(store.getRun('r1').finishedAt, 5000);
  const scores = [500, 900, 300, 1200, 800, 1000];
  scores.forEach((score, index) => {
    store.insertResult({ shareId: `s${index}`, runId: `run${index}`, score, breakdown: '[]', outcome: 'victory', heroClass: 'warrior', heroName: 'Hero', foeName: 'Boss', qualifies: true, createdAt: index });
    store.setInitials(`s${index}`, 'ABC');
  });
  const board = store.leaderboard(5);
  assert.deepEqual(board.map((row) => row.score), [1200, 1000, 900, 800, 500]);
  assert.equal(Object.hasOwn(board[0], 'createdAt'), false);
  assert.equal(store.fifthBestScore(), 500);
});

test('store prunes stale unfinished runs only', () => {
  const store = createStore(':memory:');
  store.createRun({ id: 'old', mode: 'easy', seed: 1, issuedAt: 0 });
  store.createRun({ id: 'done', mode: 'real', seed: 1, issuedAt: 0 });
  store.finishRun('done', 10);
  store.createRun({ id: 'new', mode: 'easy', seed: 1, issuedAt: 90000 });
  store.pruneRuns(50000);
  assert.equal(store.getRun('old'), null);
  assert.notEqual(store.getRun('done'), null);
  assert.notEqual(store.getRun('new'), null);
});

test('a replayed real run gives the same score as the client', () => {
  const { inputs, score, state } = playReal(424242, jitteredPolicy(1));
  const result = validateRealRun({ realSeed: 424242, easy: null, inputs, elapsedMs: state.gameMs });
  assert.equal(result.human, true);
  assert.equal(result.score.total, score.total);
  assert.deepEqual(result.score.lines, score.lines);
});

test('continuing an easy hero is rebuilt from the easy replay', () => {
  const easy = playEasy(99);
  assert.equal(easy.outcome, 'won');
  const { inputs, score, state } = playReal(555, jitteredPolicy(2), easy.run.hero);
  const result = validateRealRun({ realSeed: 555, easy: { seed: 99, strikes: easy.strikes }, inputs, elapsedMs: state.gameMs });
  assert.equal(result.score.total, score.total);
  assert.equal(result.state.hero.name, easy.run.hero.name);
});

test('continuing requires a won easy run', () => {
  const { inputs, state } = playReal(555, jitteredPolicy(2), playEasy(99).run.hero);
  assert.throws(() => validateRealRun({ realSeed: 555, easy: { seed: 99, strikes: [5] }, inputs, elapsedMs: state.gameMs }), ValidationError);
});

test('a run finished faster than its game time is rejected', () => {
  const { inputs, state } = playReal(777, jitteredPolicy(3));
  assert.throws(() => validateRealRun({ realSeed: 777, easy: null, inputs, elapsedMs: state.gameMs * 0.5 }), (error) => error instanceof ValidationError && error.code === 'too_fast');
});

test('an unfinished or tampered run is rejected', () => {
  const { inputs, state } = playReal(777, jitteredPolicy(3));
  assert.throws(() => validateRealRun({ realSeed: 777, easy: null, inputs: inputs.slice(0, 5), elapsedMs: state.gameMs }), (error) => error.code === 'unfinished');
  const tampered = inputs.map((input) => (input.type === 'answer' ? { ...input, choice: 'hacked' } : input));
  assert.throws(() => validateRealRun({ realSeed: 777, easy: null, inputs: tampered, elapsedMs: state.gameMs }), (error) => error.code === 'inputs');
  assert.throws(() => validateRealRun({ realSeed: 777, easy: null, inputs: 'nope', elapsedMs: state.gameMs }), (error) => error.code === 'inputs');
});

test('a fast but human-like run is not flagged', () => {
  const { inputs, state } = playReal(8080, jitteredPolicy(4, { perfectRatio: 0.95, jitterMs: 12 }));
  const result = validateRealRun({ realSeed: 8080, easy: null, inputs, elapsedMs: state.gameMs });
  assert.equal(result.human, true);
});

test('a perfect zero-variance run is flagged as a bot', () => {
  const { inputs, state } = playReal(8080, perfectBotPolicy());
  const result = validateRealRun({ realSeed: 8080, easy: null, inputs, elapsedMs: state.gameMs });
  assert.equal(result.human, false);
});

const human = { dodges: [210, 260, 330], answers: [1800, 2600, 3100] };
const robotic = { dodges: [150, 150, 151], answers: [400, 401, 400] };

test('consistent strikes alone flag only with ten or more strikes', () => {
  assert.equal(botCheck({ timing: Array(12).fill(1), counts: { strikes: 12, perfects: 12 }, reactions: human }), true);
  assert.equal(botCheck({ timing: Array(7).fill(1), counts: { strikes: 7, perfects: 7 }, reactions: human }), false);
});

test('a short consistent run flags only with a second robotic signal', () => {
  assert.equal(botCheck({ timing: Array(7).fill(1), counts: { strikes: 7, perfects: 7 }, reactions: robotic }), true);
  assert.equal(botCheck({ timing: Array(5).fill(1), counts: { strikes: 5, perfects: 5 }, reactions: robotic }), false);
});

test('varied or imperfect strikes are never flagged', () => {
  assert.equal(botCheck({ timing: [...Array(6).fill(0), ...Array(6).fill(20)], counts: { strikes: 12, perfects: 12 }, reactions: robotic }), false);
  assert.equal(botCheck({ timing: Array(12).fill(1), counts: { strikes: 12, perfects: 10 }, reactions: robotic }), false);
});

test('rate limiter allows the limit per window per key', () => {
  let time = 0;
  const limiter = createRateLimiter({ limit: 2, windowMs: 1000, now: () => time });
  assert.equal(limiter.allow('a'), true);
  assert.equal(limiter.allow('a'), true);
  assert.equal(limiter.allow('a'), false);
  assert.equal(limiter.allow('b'), true);
  time = 1500;
  assert.equal(limiter.allow('a'), true);
});

test('initials must be three capital letters and not blocklisted', () => {
  assert.equal(isAllowedInitials('EST'), true);
  assert.equal(isAllowedInitials('est'), false);
  assert.equal(isAllowedInitials('ES'), false);
  assert.equal(isAllowedInitials('ES1'), false);
  assert.equal(isAllowedInitials('ASS'), false);
  assert.equal(isAllowedInitials(null), false);
});

test('share page escapes content and redirects to the challenge', () => {
  const html = renderSharePage({ shareId: 'AbC123xy', score: 12480, outcome: 'victory', initials: 'EST', heroName: '<script>', foeName: 'THE LEGACY MONOLITH' });
  assert.ok(html.includes('EST scored 12,480 pts'));
  assert.ok(html.includes('/?challenge=AbC123xy'));
  assert.equal(html.includes('<script>'), false);
});

test('near-perfect human players are never flagged as bots', () => {
  for (const profile of [{ strikeSpreadMs: 10, dodgeSpreadMs: 20 }, { strikeSpreadMs: 12, dodgeSpreadMs: 30 }]) {
    let flagged = 0;
    for (let seed = 1; seed <= 400; seed++) {
      const played = playReal(seed, nearPerfectHumanPolicy(seed * 7919, profile));
      const result = validateRealRun({ realSeed: seed, easy: null, inputs: played.inputs, elapsedMs: played.state.gameMs });
      if (result.human === false) flagged += 1;
    }
    assert.equal(flagged, 0, `${JSON.stringify(profile)} flagged ${flagged}/400`);
  }
});

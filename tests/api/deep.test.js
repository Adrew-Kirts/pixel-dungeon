import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { rmSync } from 'node:fs';
import { createServer } from '../../api/server.js';
import { createStore } from '../../api/store.js';
import { validateDeepRun, ValidationError } from '../../api/validate.js';
import { createDeepRun, expected, apply, finalScore } from '../../src/deep/engine.js';
import { createRng } from '../../src/rules.js';
import { msForPosition } from '../../src/meter.js';
import { FULL_ROUTE, PERFECT, routeNav, isBetter } from '../deep-helpers.js';

let server;
let base;
const clock = { time: 5_000_000 };
const store = createStore(':memory:');
const STATS_KEY = 'stats-key-for-the-deep-tests-0123456789';

before(async () => {
  server = createServer({
    store,
    secret: 'deep-test-secret-that-is-long-enough',
    now: () => clock.time,
    config: { statsKey: STATS_KEY, rateLimits: { start: { limit: 200, windowMs: 3_600_000 }, finish: { limit: 200, windowMs: 3_600_000 } } },
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => new Promise((resolve) => server.close(resolve)));

async function post(path, body) {
  const response = await fetch(`${base}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const text = await response.text();
  return { status: response.status, body: text.startsWith('{') ? JSON.parse(text) : text };
}

async function get(path, headers = {}) {
  const response = await fetch(`${base}${path}`, { headers });
  const text = await response.text();
  return { status: response.status, body: text.startsWith('{') ? JSON.parse(text) : text };
}

function humanPolicy(seed, { strikeMs = 45, reactMs = 55 } = {}) {
  const rng = createRng(seed);
  const gauss = (deviation) => {
    const u = Math.max(1e-9, rng.next());
    return deviation * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng.next());
  };
  const taps = (beats) => beats.map((beat) => Math.max(0, Math.round(beat + gauss(reactMs))));
  return {
    create: () => ({ type: 'create', difficulty: 'normal', cls: 'knight', weapon: 'sword', shield: 'kite', first: 3, epithet: 4 }),
    strike: (need) => ({ type: 'strike', ms: Math.max(0, Math.round(msForPosition(0.5 + need.meter.offset, need.meter.sweepMs) + gauss(strikeMs))) }),
    defend: (need) => ({ type: 'defend', taps: taps(need.attack.beats) }),
    dodge: (need) => ({ type: 'dodge', taps: taps(need.beats) }),
    horde: (need) => ({ type: 'horde', taps: taps(need.beats) }),
    potion: (need) => ({ type: 'potion', choice: need.options[0] }),
    loot: (need, state) => ({ type: 'loot', choice: need.canTake === true && isBetter(state, need.item) === true ? 'take' : 'leave' }),
    nav: routeNav(FULL_ROUTE),
  };
}

function playDeep(seed, policy) {
  const state = createDeepRun({ seed });
  const inputs = [];
  for (let step = 0; step < 3000; step++) {
    const need = expected(state);
    if (need.type === 'done') break;
    const input = policy[need.type](need, state);
    inputs.push(input);
    apply(state, input);
  }
  return { state, inputs, score: finalScore(state) };
}

async function playAndFinishDeep(policySeed = 3, { advance = true, policy = null } = {}) {
  const start = await post('/api/runs', { mode: 'deep' });
  assert.equal(start.status, 200);
  const played = playDeep(start.body.seed, policy ?? humanPolicy(policySeed));
  if (advance === true) clock.time += played.state.gameMs;
  const finish = await post(`/api/runs/${start.body.runId}/finish`, { token: start.body.token, inputs: played.inputs });
  return { start, played, finish };
}

test('a deep run is replayed and scored by the server on its own board', async () => {
  const { played, finish } = await playAndFinishDeep(3);
  assert.equal(finish.status, 200);
  assert.equal(finish.body.human, true);
  assert.equal(finish.body.score, played.score.total);
  assert.equal(finish.body.mode, 'deep');
  assert.equal(finish.body.qualifies, true);
  const saved = await post(`/api/scores/${finish.body.shareId}/initials`, { initials: 'DEP' });
  assert.equal(saved.status, 200);
  assert.deepEqual(saved.body.leaderboard.map((row) => row.initials), ['DEP']);
  const deepBoard = await get('/api/leaderboard?mode=deep');
  assert.deepEqual(deepBoard.body.entries.map((row) => row.initials), ['DEP']);
  const realBoard = await get('/api/leaderboard');
  assert.equal(realBoard.body.entries.some((row) => row.initials === 'DEP'), false);
});

test('an unknown leaderboard mode falls back to the real board', async () => {
  const response = await get('/api/leaderboard?mode=__proto__');
  assert.equal(response.status, 200);
  assert.equal(response.body.entries.some((row) => row.initials === 'DEP'), false);
});

test('a deep run finished too fast is rejected', async () => {
  const { finish } = await playAndFinishDeep(4, { advance: false });
  assert.equal(finish.status, 422);
  assert.equal(finish.body.error, 'too_fast');
});

test('tampered deep inputs are rejected without a 500', async () => {
  const start = await post('/api/runs', { mode: 'deep' });
  const played = playDeep(start.body.seed, humanPolicy(5));
  clock.time += played.state.gameMs;
  const inputs = played.inputs.map((input) => (input.type === 'defend' ? { ...input, taps: 'lol' } : input));
  const finish = await post(`/api/runs/${start.body.runId}/finish`, { token: start.body.token, inputs });
  assert.equal(finish.status, 422);
  const constructor = await post(`/api/runs/${start.body.runId}/finish`, { token: start.body.token, inputs: [{ type: 'constructor' }] });
  assert.equal(constructor.status, 422);
});

test('a real token cannot finish a deep run', async () => {
  const real = await post('/api/runs', { mode: 'real' });
  const deep = await post('/api/runs', { mode: 'deep' });
  const finish = await post(`/api/runs/${deep.body.runId}/finish`, { token: real.body.token, inputs: [{ type: 'create' }] });
  assert.equal(finish.status, 403);
});

test('a frame-perfect deep bot is not put on the wall', async () => {
  const bot = { ...PERFECT, nav: routeNav(FULL_ROUTE) };
  const { finish } = await playAndFinishDeep(0, { policy: bot });
  assert.equal(finish.status, 200);
  assert.equal(finish.body.human, false);
});

test('validateDeepRun refuses unfinished runs', () => {
  const state = createDeepRun({ seed: 9 });
  const input = PERFECT.create();
  apply(state, input);
  assert.throws(() => validateDeepRun({ seed: 9, inputs: [input], elapsedMs: 999999 }), (error) => error instanceof ValidationError && error.code === 'unfinished');
});

test('deep runs feed their own stats', async () => {
  const response = await get('/api/stats', { authorization: `Bearer ${STATS_KEY}` });
  assert.equal(response.status, 200);
  assert.ok(response.body.counters['deep.started'] >= 1);
  assert.ok(response.body.counters['deep.finished'] >= 1);
  assert.ok(response.body.counters['deep.class.knight'] >= 1);
  assert.equal(typeof response.body.deepBest, 'object');
});

test('deep funnel events are accepted, made-up ones refused', async () => {
  for (const type of ['fairy.open', 'fairy.yes', 'fairy.no', 'deep.quit', 'deep.room.mb', 'deep.room.lair']) assert.equal((await post('/api/events', { type })).status, 200, type);
  for (const type of ['deep.room.zz', 'fairy.maybe', 'deep.room.']) assert.equal((await post('/api/events', { type })).status, 422, type);
});

test('an old results table gains the mode column and keeps its rows as real', () => {
  const path = `/tmp/strikwerda-migrate-${process.pid}.db`;
  rmSync(path, { force: true });
  const legacy = new DatabaseSync(path);
  legacy.exec(`CREATE TABLE results (share_id TEXT PRIMARY KEY, run_id TEXT NOT NULL UNIQUE, score INTEGER NOT NULL, breakdown TEXT NOT NULL, outcome TEXT NOT NULL, hero_class TEXT NOT NULL, hero_name TEXT NOT NULL, foe_name TEXT NOT NULL, initials TEXT, qualifies INTEGER NOT NULL, created_at INTEGER NOT NULL);`);
  legacy.exec(`INSERT INTO results VALUES ('old1', 'run1', 1234, '[]', 'victory', 'warrior', 'Hero', 'Boss', 'OLD', 1, 1);`);
  legacy.close();
  const migrated = createStore(path);
  assert.deepEqual(migrated.leaderboard(5, 'real').map((row) => row.initials), ['OLD']);
  assert.deepEqual(migrated.leaderboard(5, 'deep'), []);
  migrated.close();
  const again = createStore(path);
  assert.equal(again.getResult('old1').mode, 'real');
  assert.equal(again.getResult('old1').secret, false);
  again.close();
  rmSync(path, { force: true });
});

test('a solver with a little noise is still caught by its success rate', () => {
  const rng = createRng(99);
  const gauss = (deviation) => deviation * Math.sqrt(-2 * Math.log(Math.max(1e-9, rng.next()))) * Math.cos(2 * Math.PI * rng.next());
  const solver = {
    ...PERFECT,
    nav: routeNav(FULL_ROUTE),
    strike: (need) => ({ type: 'strike', ms: Math.max(0, Math.round(msForPosition(0.5 + need.meter.offset, need.meter.sweepMs) + gauss(8))) }),
    defend: (need) => ({ type: 'defend', taps: need.attack.beats.map((beat) => Math.round(beat + gauss(12))) }),
  };
  const played = playDeep(9, solver);
  const outcome = validateDeepRun({ seed: 9, inputs: played.inputs, elapsedMs: played.state.gameMs * 2 });
  assert.equal(outcome.human, false);
});

test('a strong human is not flagged', () => {
  for (const seed of [3, 4, 5]) {
    const played = playDeep(seed, humanPolicy(seed, { strikeMs: 30, reactMs: 38 }));
    const outcome = validateDeepRun({ seed, inputs: played.inputs, elapsedMs: played.state.gameMs * 2 });
    assert.equal(outcome.human, true, `seed ${seed}`);
  }
});

test('the wall of legends keeps ten names while the wall of fame keeps five', () => {
  const local = createStore(':memory:');
  for (let index = 0; index < 12; index++) {
    for (const mode of ['real', 'deep']) {
      local.insertResult({ shareId: `${mode}${index}`, runId: `${mode}run${index}`, mode, score: 1000 + index, breakdown: '[]', outcome: 'victory', heroClass: 'knight', heroName: 'Hero', foeName: 'Boss', qualifies: true, createdAt: index });
      local.setInitials(`${mode}${index}`, 'ABC');
    }
  }
  const server = createServer({ store: local, secret: 'x'.repeat(40), config: {} });
  assert.equal(local.leaderboard(10, 'deep').length, 10);
  assert.equal(local.nthBestScore(10, 'deep'), 1002);
  assert.equal(local.nthBestScore(5, 'real'), 1007);
  server.close();
});

test('the deep leaderboard endpoint lists up to ten rows', async () => {
  for (let index = 0; index < 11; index++) {
    store.insertResult({ shareId: `ten${index}`, runId: `tenrun${index}`, mode: 'deep', score: 500 + index, breakdown: '[]', outcome: 'victory', heroClass: 'rogue', heroName: 'Hero', foeName: 'Boss', qualifies: true, createdAt: index });
    store.setInitials(`ten${index}`, 'TEN');
  }
  const deepBoard = await get('/api/leaderboard?mode=deep');
  assert.equal(deepBoard.body.entries.length, 10);
  const realBoard = await get('/api/leaderboard');
  assert.ok(realBoard.body.entries.length <= 5);
});

test('the wall of legends marks runs that found the secret passage', () => {
  const local = createStore(':memory:');
  local.insertResult({ shareId: 'sec1', runId: 'secrun1', mode: 'deep', secret: true, score: 900, breakdown: '[]', outcome: 'victory', heroClass: 'knight', heroName: 'Hero', foeName: 'Boss', qualifies: true, createdAt: 1 });
  local.insertResult({ shareId: 'sec2', runId: 'secrun2', mode: 'deep', score: 800, breakdown: '[]', outcome: 'victory', heroClass: 'rogue', heroName: 'Hero', foeName: 'Boss', qualifies: true, createdAt: 2 });
  local.setInitials('sec1', 'DEN');
  local.setInitials('sec2', 'NOP');
  assert.deepEqual(local.leaderboard(10, 'deep').map((row) => [row.initials, row.secret]), [['DEN', true], ['NOP', false]]);
});

test('a deep run through the den is stored with the secret mark', async () => {
  const policy = { ...humanPolicy(77), nav: routeNav(['h1', 'a1', 'a2', 'mb', 'a2', 'a1', 'den', 'h4', 'h3', 'c1', 'h3', 'h4', 'd1', 'd2', 'd3', 'lair']) };
  const { finish, played } = await playAndFinishDeep(77, { policy });
  assert.equal(played.state.visited.includes('den'), true);
  assert.equal(finish.status, 200);
  assert.equal(store.getResult(finish.body.shareId).secret, true);
});

test('the wall of legends shows the difficulty of each run', () => {
  const local = createStore(':memory:');
  local.insertResult({ shareId: 'dif1', runId: 'difrun1', mode: 'deep', difficulty: 'tryhard', score: 900, breakdown: '[]', outcome: 'victory', heroClass: 'knight', heroName: 'Hero', foeName: 'Boss', qualifies: true, createdAt: 1 });
  local.insertResult({ shareId: 'dif2', runId: 'difrun2', mode: 'deep', score: 800, breakdown: '[]', outcome: 'victory', heroClass: 'rogue', heroName: 'Hero', foeName: 'Boss', qualifies: true, createdAt: 2 });
  local.setInitials('dif1', 'TRY');
  local.setInitials('dif2', 'NRM');
  assert.deepEqual(local.leaderboard(10, 'deep').map((row) => [row.initials, row.difficulty]), [['TRY', 'tryhard'], ['NRM', 'normal']]);
});

test('a try hard deep run is stored with its difficulty and counted', async () => {
  const base = humanPolicy(91, { strikeMs: 25, reactMs: 22 });
  const policy = { ...base, create: () => ({ ...base.create(), difficulty: 'tryhard' }) };
  const { finish } = await playAndFinishDeep(91, { policy });
  assert.equal(finish.status, 200);
  assert.equal(store.getResult(finish.body.shareId).difficulty, 'tryhard');
  const stats = await get('/api/stats', { authorization: `Bearer ${STATS_KEY}` });
  assert.ok(stats.body.counters['deep.difficulty.tryhard'] >= 1);
});

test('the wall of legends tells who beat the final boss', () => {
  const local = createStore(':memory:');
  local.insertResult({ shareId: 'won1', runId: 'wonrun1', mode: 'deep', score: 900, breakdown: '[]', outcome: 'victory', heroClass: 'knight', heroName: 'Hero', foeName: 'Boss', qualifies: true, createdAt: 1 });
  local.insertResult({ shareId: 'lost1', runId: 'lostrun1', mode: 'deep', score: 800, breakdown: '[]', outcome: 'gameover', heroClass: 'rogue', heroName: 'Hero', foeName: 'a Rat', qualifies: true, createdAt: 2 });
  local.setInitials('won1', 'WIN');
  local.setInitials('lost1', 'RIP');
  assert.deepEqual(local.leaderboard(10, 'deep').map((row) => [row.initials, row.won]), [['WIN', true], ['RIP', false]]);
});

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import { createServer } from '../../api/server.js';
import { createStore } from '../../api/store.js';
import { jitteredPolicy, perfectBotPolicy, playReal, playEasy } from './helpers.js';

let server;
let base;
let clock = { time: 1_000_000 };
const store = createStore(':memory:');
const STATS_KEY = 'stats-key-for-the-tests-0123456789';

before(async () => {
  server = createServer({
    store,
    secret: 'server-test-secret-that-is-long-enough',
    now: () => clock.time,
    config: { statsKey: STATS_KEY, rateLimits: { start: { limit: 60, windowMs: 3_600_000 }, finish: { limit: 60, windowMs: 3_600_000 } } },
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => new Promise((resolve) => server.close(resolve)));

async function post(path, body, headers = {}) {
  const response = await fetch(`${base}${path}`, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body) });
  const text = await response.text();
  return { status: response.status, body: text.startsWith('{') ? JSON.parse(text) : text, headers: response.headers };
}

async function get(path) {
  const response = await fetch(`${base}${path}`);
  const text = await response.text();
  return { status: response.status, body: text.startsWith('{') ? JSON.parse(text) : text, headers: response.headers };
}

async function playAndFinish({ policy = jitteredPolicy(7), advance = true, easy = null } = {}) {
  const start = await post('/api/runs', { mode: 'real' });
  assert.equal(start.status, 200);
  const played = playReal(start.body.seed, policy, easy === null ? null : easy.hero);
  if (advance === true) clock.time += played.state.gameMs;
  const body = { token: start.body.token, inputs: played.inputs };
  if (easy !== null) body.easy = { runId: easy.runId, token: easy.token, strikes: easy.strikes };
  const finish = await post(`/api/runs/${start.body.runId}/finish`, body);
  return { start, played, finish };
}

async function wonEasyRun() {
  for (let attempt = 0; attempt < 50; attempt++) {
    const start = await post('/api/runs', { mode: 'easy' });
    const easy = playEasy(start.body.seed);
    if (easy.outcome === 'won') return { runId: start.body.runId, token: start.body.token, strikes: easy.strikes, hero: easy.run.hero };
  }
  throw new Error('no won easy run');
}

test('starting a run returns an id, a seed and a token', async () => {
  const response = await post('/api/runs', { mode: 'real' });
  assert.equal(response.status, 200);
  assert.equal(typeof response.body.runId, 'string');
  assert.equal(Number.isInteger(response.body.seed), true);
  assert.equal(typeof response.body.token, 'string');
  assert.equal(response.headers.get('cache-control'), 'no-store');
});

test('starting a run with an unknown mode is a bad request', async () => {
  assert.equal((await post('/api/runs', { mode: 'god' })).status, 400);
});

test('a finished run is scored by the server and qualifies for the empty board', async () => {
  const { played, finish } = await playAndFinish();
  assert.equal(finish.status, 200);
  assert.equal(finish.body.score, played.score.total);
  assert.equal(finish.body.qualifies, true);
  assert.equal(typeof finish.body.shareId, 'string');
  assert.equal(finish.body.outcome, played.state.outcome);
});

test('a token cannot be used twice', async () => {
  const { start, played } = await playAndFinish();
  const again = await post(`/api/runs/${start.body.runId}/finish`, { token: start.body.token, inputs: played.inputs });
  assert.equal(again.status, 409);
});

test('a wrong token or unknown run is refused', async () => {
  const start = await post('/api/runs', { mode: 'real' });
  assert.equal((await post(`/api/runs/${start.body.runId}/finish`, { token: 'forged', inputs: [] })).status, 403);
  assert.equal((await post('/api/runs/doesNotExist123/finish', { token: 'x', inputs: [] })).status, 404);
});

test('finishing faster than the game allows is rejected', async () => {
  const { finish } = await playAndFinish({ advance: false });
  assert.equal(finish.status, 422);
  assert.equal(finish.body.error, 'too_fast');
});

test('an expired run is refused', async () => {
  const start = await post('/api/runs', { mode: 'real' });
  const played = playReal(start.body.seed, jitteredPolicy(9));
  clock.time += 31 * 60 * 1000;
  const finish = await post(`/api/runs/${start.body.runId}/finish`, { token: start.body.token, inputs: played.inputs });
  assert.equal(finish.status, 410);
});

test('initials go on the board once and must be three allowed letters', async () => {
  const { finish } = await playAndFinish();
  const shareId = finish.body.shareId;
  assert.equal((await post(`/api/scores/${shareId}/initials`, { initials: 'est' })).status, 422);
  assert.equal((await post(`/api/scores/${shareId}/initials`, { initials: 'ASS' })).status, 422);
  const saved = await post(`/api/scores/${shareId}/initials`, { initials: 'EST' });
  assert.equal(saved.status, 200);
  assert.ok(saved.body.leaderboard.some((row) => row.initials === 'EST'));
  assert.equal((await post(`/api/scores/${shareId}/initials`, { initials: 'ABC' })).status, 409);
});

test('initials are refused after the entry window', async () => {
  const { finish } = await playAndFinish();
  clock.time += 11 * 60 * 1000;
  assert.equal((await post(`/api/scores/${finish.body.shareId}/initials`, { initials: 'LAT' })).status, 410);
});

test('the leaderboard lists at most five rows without dates', async () => {
  for (let index = 0; index < 6; index++) {
    const { finish } = await playAndFinish({ policy: jitteredPolicy(100 + index) });
    if (finish.body.qualifies === true) await post(`/api/scores/${finish.body.shareId}/initials`, { initials: 'TOP' });
  }
  const board = await get('/api/leaderboard');
  assert.equal(board.status, 200);
  assert.ok(board.body.entries.length <= 5);
  for (const row of board.body.entries) assert.deepEqual(Object.keys(row).sort(), ['heroClass', 'initials', 'rank', 'score']);
  const scores = board.body.entries.map((row) => row.score);
  assert.deepEqual(scores, [...scores].sort((a, b) => b - a));
});

test('a result that does not beat the fifth score cannot enter initials', async () => {
  const board = (await get('/api/leaderboard')).body.entries;
  if (board.length < 5) return;
  const weakPolicy = { ...jitteredPolicy(5), strike: () => ({ type: 'strike', ms: 0 }), dodge: () => ({ type: 'dodge', ms: null }) };
  const { finish } = await playAndFinish({ policy: weakPolicy });
  assert.equal(finish.body.qualifies, false);
  assert.equal((await post(`/api/scores/${finish.body.shareId}/initials`, { initials: 'LOW' })).status, 403);
});

test('results and share pages are public, unknown ones are 404', async () => {
  const { finish } = await playAndFinish();
  const result = await get(`/api/results/${finish.body.shareId}`);
  assert.equal(result.status, 200);
  assert.equal(result.body.score, finish.body.score);
  const page = await get(`/r/${finish.body.shareId}`);
  assert.equal(page.status, 200);
  assert.ok(page.headers.get('content-type').startsWith('text/html'));
  assert.ok(page.body.includes('og:title'));
  assert.equal((await get('/r/unknown00')).status, 404);
  assert.equal((await get('/api/results/unknown00')).status, 404);
});

test('an easy hero can continue into one real run only', async () => {
  const easy = await wonEasyRun();
  const policy = { ...jitteredPolicy(11), hero: () => ({ type: 'hero', choice: 'continue' }) };
  const { finish } = await playAndFinish({ policy, easy });
  assert.equal(finish.status, 200);
  const second = await playAndFinish({ policy, easy });
  assert.equal(second.finish.status, 409);
});

test('a bot run is answered with only humans and not stored', async () => {
  const { finish } = await playAndFinish({ policy: perfectBotPolicy() });
  assert.equal(finish.status, 200);
  assert.equal(finish.body.human, false);
  assert.equal(finish.body.shareId, undefined);
});

test('bad bodies and routes are client errors', async () => {
  assert.equal((await post('/api/runs', '{not json')).status, 400);
  assert.equal((await post('/api/runs', { mode: 'real', pad: 'x'.repeat(70000) })).status, 413);
  assert.equal((await get('/api/nothing')).status, 404);
  assert.equal((await get('/api/runs')).status, 405);
});

test('starting too many runs from one address is rate limited', async () => {
  const limited = createServer({ store: createStore(':memory:'), secret: 'another-secret-that-is-long-enough', now: () => clock.time, config: { rateLimits: { start: { limit: 2, windowMs: 3_600_000 }, finish: { limit: 2, windowMs: 3_600_000 } } } });
  await new Promise((resolve) => limited.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${limited.address().port}/api/runs`;
  const hit = () => fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"mode":"real"}' }).then((response) => response.status);
  assert.deepEqual([await hit(), await hit(), await hit()], [200, 200, 429]);
  await new Promise((resolve) => limited.close(resolve));
});

function rawRequest(target) {
  return new Promise((resolve) => {
    const socket = net.connect(server.address().port, '127.0.0.1', () => {
      socket.write(`GET ${target} HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n`);
    });
    let data = '';
    socket.on('data', (chunk) => {
      data += chunk;
    });
    socket.setTimeout(2000, () => socket.destroy());
    socket.on('close', () => resolve(data));
    socket.on('error', () => resolve(data));
  });
}

test('an unparseable request target gets a 4xx and the server keeps running', async () => {
  const reply = await rawRequest('//x:99999/');
  assert.match(reply, /^HTTP\/1\.1 4\d\d/);
  const board = await get('/api/leaderboard');
  assert.equal(board.status, 200);
});

test('input types named after object prototype members are rejected with 422', async () => {
  for (const type of ['constructor', '__proto__', 'toString', 'hasOwnProperty', 'valueOf']) {
    const start = await post('/api/runs', { mode: 'real' });
    const finish = await post(`/api/runs/${start.body.runId}/finish`, { token: start.body.token, inputs: [{ type }] });
    assert.equal(finish.status, 422, type);
  }
});

test('malformed easy blocks and tokens are rejected with 4xx, never 500', async () => {
  for (const easy of [[], {}, { runId: true, token: 'x', strikes: [] }, { runId: 'abcdefgh', token: 5, strikes: [] }, 'nope']) {
    const start = await post('/api/runs', { mode: 'real' });
    const finish = await post(`/api/runs/${start.body.runId}/finish`, { token: start.body.token, inputs: [{ type: 'strike', ms: 100 }], easy });
    assert.ok(finish.status >= 400 && finish.status < 500, `${JSON.stringify(easy)} → ${finish.status}`);
  }
  const start = await post('/api/runs', { mode: 'real' });
  for (const token of [123, null, ['a'], { a: 1 }]) {
    const finish = await post(`/api/runs/${start.body.runId}/finish`, { token, inputs: [{ type: 'strike', ms: 100 }] });
    assert.ok(finish.status >= 400 && finish.status < 500, `${JSON.stringify(token)} → ${finish.status}`);
  }
});

async function stats(key = STATS_KEY) {
  const response = await fetch(`${base}/api/stats`, { headers: key === null ? {} : { authorization: `Bearer ${key}` } });
  const text = await response.text();
  return { status: response.status, body: text.startsWith('{') ? JSON.parse(text) : text };
}

test('stats stay hidden without the right key', async () => {
  assert.equal((await stats(null)).status, 401);
  assert.equal((await stats('wrong-key-wrong-key-wrong-key')).status, 401);
  const allowed = await stats();
  assert.equal(allowed.status, 200);
  assert.equal(typeof allowed.body.counters, 'object');
});

test('game events are counted and unknown events are refused', async () => {
  const before = (await stats()).body.counters['easy.start'] ?? 0;
  assert.equal((await post('/api/events', { type: 'easy.start' })).status, 200);
  assert.equal((await post('/api/events', { type: 'easy.start' })).status, 200);
  assert.equal((await post('/api/events', { type: 'lang.fr' })).status, 200);
  assert.equal((await post('/api/events', { type: 'hack.the.planet' })).status, 422);
  assert.equal((await post('/api/events', { type: 'constructor' })).status, 422);
  const after = (await stats()).body.counters;
  assert.equal(after['easy.start'], before + 2);
  assert.equal(after['lang.fr'] >= 1, true);
});

test('a finished real run feeds the fun stats', async () => {
  const before = (await stats()).body;
  const { finish, played } = await playAndFinish({ policy: jitteredPolicy(41) });
  assert.equal(finish.status, 200);
  const after = (await stats()).body;
  const count = (body, key) => body.counters[key] ?? 0;
  assert.equal(count(after, 'real.finished'), count(before, 'real.finished') + 1);
  assert.equal(count(after, 'real.score'), count(before, 'real.score') + finish.body.score);
  assert.equal(count(after, 'real.perfects'), count(before, 'real.perfects') + played.state.counts.perfects);
  assert.equal(count(after, 'real.hire.yes') + count(after, 'real.hire.no'), count(before, 'real.hire.yes') + count(before, 'real.hire.no') + 1);
  assert.equal(typeof after.best, 'object');
});

test('guessing the stats key is rate limited', async () => {
  let last = 0;
  for (let attempt = 0; attempt < 15; attempt++) last = (await stats(`guess-${attempt}-guess-guess-guess-guess`)).status;
  assert.equal(last, 429);
});

test('a run outside the top 5 learns its rank among all finished runs', async () => {
  const rankedStore = createStore(':memory:');
  const rankedServer = createServer({ store: rankedStore, secret: 'server-test-secret-that-is-long-enough', now: () => clock.time });
  await new Promise((resolve) => rankedServer.listen(0, '127.0.0.1', resolve));
  const rankedBase = `http://127.0.0.1:${rankedServer.address().port}`;
  const send = async (path, body) => {
    const response = await fetch(`${rankedBase}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    return { status: response.status, body: await response.json() };
  };
  for (let index = 0; index < 9; index++) {
    const big = index < 6;
    rankedStore.insertResult({ shareId: `seed0${index}`, runId: `seeded-${index}`, score: big === true ? 900000 + index : 1 + index, breakdown: '[]', outcome: 'victory', heroClass: 'warrior', heroName: 'X', foeName: 'THE LEGACY MONOLITH', qualifies: true, createdAt: index });
    if (big === true) rankedStore.setInitials(`seed0${index}`, 'AAA');
  }
  const start = await send('/api/runs', { mode: 'real' });
  const played = playReal(start.body.seed, jitteredPolicy(77));
  clock.time += played.state.gameMs;
  const finish = await send(`/api/runs/${start.body.runId}/finish`, { token: start.body.token, inputs: played.inputs });
  await new Promise((resolve) => rankedServer.close(resolve));
  assert.equal(finish.status, 200);
  assert.equal(finish.body.qualifies, false);
  assert.equal(finish.body.rank, 7);
});

test('funnel and click events are counted, made-up ones are refused', async () => {
  for (const type of ['visit.first', 'easy.chest', 'easy.boss', 'easy.skip', 'treasure.view', 'click.picto', 'click.github', 'click.linkedin', 'click.repo', 'click.original', 'real.room.1', 'real.room.11', 'real.quit']) {
    assert.equal((await post('/api/events', { type })).status, 200, type);
  }
  for (const type of ['real.room.0', 'real.room.12', 'real.room.1a', 'click.evil']) {
    assert.equal((await post('/api/events', { type })).status, 422, type);
  }
  const counters = store.counters();
  assert.equal(counters['real.room.11'] >= 1, true);
  assert.equal(counters['click.github'] >= 1, true);
});

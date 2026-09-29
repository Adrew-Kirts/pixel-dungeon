import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEasySeeds } from '../src/net/seeds.js';

function fakeApi() {
  let issued = 0;
  return {
    calls: () => issued,
    startRun: async () => {
      issued += 1;
      return { runId: `run${issued}`, seed: issued, token: `token${issued}` };
    },
  };
}

test('a prefetched easy seed older than 15 minutes is replaced by a fresh one', async () => {
  const api = fakeApi();
  const clock = { time: 0 };
  const seeds = createEasySeeds({ api, now: () => clock.time });
  seeds.warm();
  await new Promise((resolve) => setTimeout(resolve, 0));
  clock.time = 16 * 60 * 1000;
  const next = await seeds.next();
  assert.equal(next.server.runId, 'run2');
  assert.equal(next.server.issuedAt, clock.time);
});

test('a recent prefetched seed is used as is and remembers when it was issued', async () => {
  const api = fakeApi();
  const clock = { time: 1000 };
  const seeds = createEasySeeds({ api, now: () => clock.time });
  seeds.warm();
  await new Promise((resolve) => setTimeout(resolve, 0));
  clock.time = 5 * 60 * 1000;
  const next = await seeds.next();
  assert.equal(next.server.runId, 'run1');
  assert.equal(next.server.issuedAt, 1000);
});

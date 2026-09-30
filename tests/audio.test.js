import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAudio } from '../src/engine/audio.js';

function fakeEnvironment(initialState = 'suspended', { resumes = true } = {}) {
  const calls = { resume: 0, sourcesStarted: 0, oscillators: 0, created: 0, closed: 0, gains: [] };
  class FakeAudioContext {
    constructor() {
      calls.created += 1;
      this.state = initialState;
      this.currentTime = 0;
      this.sampleRate = 8000;
      this.destination = {};
    }
    resume() {
      calls.resume += 1;
      if (resumes === true) this.state = 'running';
      return Promise.resolve();
    }
    close() {
      calls.closed += 1;
      this.state = 'closed';
      return Promise.resolve();
    }
    createGain() {
      const node = { gain: { value: 1, setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect: (target) => target };
      calls.gains.push(node);
      return node;
    }
    createBuffer(channels, length) {
      return { getChannelData: () => new Float32Array(length) };
    }
    createBufferSource() {
      return { buffer: null, loop: false, connect: (node) => node, start: () => { calls.sourcesStarted += 1; }, stop() {} };
    }
    createOscillator() {
      calls.oscillators += 1;
      return { type: 'square', frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect: (node) => node, start() {}, stop() {} };
    }
    createBiquadFilter() {
      return { type: 'lowpass', Q: { value: 1 }, frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect: (node) => node };
    }
  }
  return { calls, env: { AudioContext: FakeAudioContext } };
}

const storage = { get: () => null, set: () => true };

test('unlock resumes a suspended context and plays a silent sample inside the gesture', () => {
  const { calls, env } = fakeEnvironment('suspended');
  const audio = createAudio(storage, env);
  audio.unlock();
  assert.equal(calls.created, 1);
  assert.equal(calls.resume, 1);
  assert.equal(calls.sourcesStarted, 1);
});

test('unlock resumes an interrupted context on the next gesture', () => {
  const { calls, env } = fakeEnvironment('running');
  const audio = createAudio(storage, env);
  audio.unlock();
  audio.context().state = 'interrupted';
  audio.unlock();
  assert.equal(calls.resume >= 1, true);
  assert.equal(audio.context().state, 'running');
});

test('sounds play once the context is running', () => {
  const { calls, env } = fakeEnvironment('running');
  const audio = createAudio(storage, env);
  audio.unlock();
  audio.sfx.hit();
  assert.equal(calls.oscillators > 0, true);
});

test('missing Web Audio support is silently ignored', () => {
  const audio = createAudio(storage, {});
  audio.unlock();
  audio.sfx.hit();
  assert.equal(audio.context(), null);
});

test('muting only stops new sounds and never touches the master gain', () => {
  const { calls, env } = fakeEnvironment('running');
  const audio = createAudio(storage, env);
  audio.unlock();
  const master = calls.gains[0];
  const volume = master.gain.value;
  audio.toggleMute();
  assert.equal(master.gain.value, volume);
  const before = calls.oscillators;
  audio.sfx.hit();
  assert.equal(calls.oscillators, before);
  audio.toggleMute();
  assert.equal(master.gain.value, volume);
  audio.sfx.hit();
  assert.equal(calls.oscillators > before, true);
});

test('resuming a stopped context plays a silent sample inside the gesture', () => {
  const { calls, env } = fakeEnvironment('running');
  const audio = createAudio(storage, env);
  audio.unlock();
  const started = calls.sourcesStarted;
  audio.context().state = 'interrupted';
  audio.unlock();
  assert.equal(calls.sourcesStarted, started + 1);
});

test('a context still stuck a second after resuming is replaced on the next gesture', () => {
  const { calls, env } = fakeEnvironment('interrupted', { resumes: false });
  const clock = { time: 0 };
  const audio = createAudio(storage, { ...env, now: () => clock.time });
  audio.unlock();
  clock.time = 1500;
  audio.unlock();
  assert.equal(calls.created, 2);
  assert.equal(calls.closed, 1);
});

test('the several events of one tap never replace the context', () => {
  const { calls, env } = fakeEnvironment('interrupted', { resumes: false });
  const clock = { time: 0 };
  const audio = createAudio(storage, { ...env, now: () => clock.time });
  for (let event = 0; event < 4; event++) {
    audio.unlock();
    clock.time += 20;
  }
  assert.equal(calls.created, 1);
});

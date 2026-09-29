import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAudio } from '../src/engine/audio.js';

function fakeEnvironment(initialState = 'suspended') {
  const calls = { resume: 0, sourcesStarted: 0, oscillators: 0, created: 0 };
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
      this.state = 'running';
      return Promise.resolve();
    }
    createGain() {
      return { gain: { value: 1, setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect: (node) => node };
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

import { createRng } from '../rules.js';

const STREAM_KEYS = {
  rooms: 0x9e3779b1,
  combat: 0x85ebca77,
  meter: 0xc2b2ae3d,
  genie: 0x27d4eb2f,
  dodge: 0x165667b1,
  aim: 0xd3a2646c,
};

export function deriveStreams(seed) {
  const streams = {};
  for (const [name, key] of Object.entries(STREAM_KEYS)) streams[name] = createRng((seed ^ key) >>> 0);
  return streams;
}

export function shuffle(rng, list) {
  const copy = [...list];
  for (let index = copy.length - 1; index > 0; index--) {
    const swap = Math.floor(rng.next() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

import { zoneAt } from './rules.js';

export const MAX_TAP_MS = 600000;

export function positionAt(ms, sweepMs) {
  const cycle = (Math.max(0, ms) / sweepMs) % 2;
  return cycle < 1 ? cycle : 2 - cycle;
}

export function zoneForMs(ms, meter) {
  return zoneAt(positionAt(ms, meter.sweepMs) - (meter.offset ?? 0), meter.zones);
}

export function msForPosition(position, sweepMs) {
  return position * sweepMs;
}

export function isValidTapMs(ms) {
  return typeof ms === 'number' && Number.isFinite(ms) === true && ms >= 0 && ms <= MAX_TAP_MS;
}

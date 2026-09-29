import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export function sign(secret, runId) {
  return createHmac('sha256', secret).update(runId).digest('base64url');
}

export function verify(secret, runId, token) {
  if (typeof token !== 'string' || typeof runId !== 'string') return false;
  const expectedToken = Buffer.from(sign(secret, runId));
  const given = Buffer.from(token);
  if (expectedToken.length !== given.length) return false;
  return timingSafeEqual(expectedToken, given);
}

export function randomId(bytes) {
  return randomBytes(bytes).toString('base64url');
}

export function randomSeed() {
  return randomBytes(4).readUInt32BE(0);
}

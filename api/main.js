import { createServer } from './server.js';
import { createStore } from './store.js';
import { DEFAULT_BOT_THRESHOLDS } from './validate.js';

const secret = process.env.HMAC_SECRET ?? '';
if (secret.length < 32) {
  console.error('HMAC_SECRET must be set (at least 32 characters)');
  process.exit(1);
}

function numberFromEnv(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) === true ? value : fallback;
}

const thresholds = {
  minStrikes: numberFromEnv('BOT_MIN_STRIKES', DEFAULT_BOT_THRESHOLDS.minStrikes),
  strikesAloneMin: numberFromEnv('BOT_STRIKES_ALONE_MIN', DEFAULT_BOT_THRESHOLDS.strikesAloneMin),
  minPerfectRatio: numberFromEnv('BOT_MIN_PERFECT_RATIO', DEFAULT_BOT_THRESHOLDS.minPerfectRatio),
  maxDeviationMs: numberFromEnv('BOT_MAX_DEVIATION_MS', DEFAULT_BOT_THRESHOLDS.maxDeviationMs),
  maxDodgeDeviationMs: numberFromEnv('BOT_MAX_DODGE_DEVIATION_MS', DEFAULT_BOT_THRESHOLDS.maxDodgeDeviationMs),
  maxAnswerDeviationMs: numberFromEnv('BOT_MAX_ANSWER_DEVIATION_MS', DEFAULT_BOT_THRESHOLDS.maxAnswerDeviationMs),
};

const store = createStore(process.env.DB_PATH ?? '/data/strikwerda.db');
const server = createServer({ store, secret, config: { thresholds, origin: process.env.ORIGIN ?? 'https://strikwerda.fr', statsKey: process.env.STATS_KEY ?? null } });
const port = numberFromEnv('PORT', 8080);

server.requestTimeout = 15000;
server.headersTimeout = 10000;
server.listen(port, '0.0.0.0', () => console.log(`strikwerda api listening on ${port}`));

setInterval(() => store.pruneRuns(Date.now() - 2 * 60 * 60 * 1000), 60 * 60 * 1000).unref();

function shutdown() {
  server.close(() => {
    store.close();
    process.exit(0);
  });
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

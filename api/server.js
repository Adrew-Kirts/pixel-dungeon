import http from 'node:http';
import { sign, verify, randomId, randomSeed } from './tokens.js';
import { validateRealRun, ValidationError, DEFAULT_BOT_THRESHOLDS } from './validate.js';
import { createRateLimiter } from './ratelimit.js';
import { isAllowedInitials } from './blocklist.js';
import { renderSharePage } from './share.js';
import { isEventType, funFacts } from './stats.js';
import { createHash, timingSafeEqual } from 'node:crypto';

class HttpError extends Error {
  constructor(status, code) {
    super(code);
    this.status = status;
    this.code = code;
  }
}

const DEFAULT_CONFIG = {
  rateLimits: { start: { limit: 60, windowMs: 3_600_000 }, finish: { limit: 30, windowMs: 3_600_000 }, events: { limit: 300, windowMs: 3_600_000 }, statsFailures: { limit: 10, windowMs: 3_600_000 } },
  statsKey: null,
  runTtlMs: 30 * 60 * 1000,
  easyTtlMs: 60 * 60 * 1000,
  initialsWindowMs: 10 * 60 * 1000,
  bodyLimit: 64 * 1024,
  boardSize: 5,
  thresholds: DEFAULT_BOT_THRESHOLDS,
  origin: 'https://strikwerda.fr',
};

const ID_PATTERN = '([A-Za-z0-9_-]{6,32})';
const ROUTES = [
  { method: 'POST', pattern: /^\/api\/runs$/, handler: 'startRun' },
  { method: 'POST', pattern: new RegExp(`^/api/runs/${ID_PATTERN}/finish$`), handler: 'finishRun' },
  { method: 'POST', pattern: new RegExp(`^/api/scores/${ID_PATTERN}/initials$`), handler: 'saveInitials' },
  { method: 'GET', pattern: /^\/api\/leaderboard$/, handler: 'leaderboard' },
  { method: 'POST', pattern: /^\/api\/events$/, handler: 'event' },
  { method: 'GET', pattern: /^\/api\/stats$/, handler: 'stats' },
  { method: 'GET', pattern: new RegExp(`^/api/results/${ID_PATTERN}$`), handler: 'result' },
  { method: 'GET', pattern: new RegExp(`^/r/${ID_PATTERN}$`), handler: 'sharePage' },
];

function readJson(request, limit) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    request.on('data', (chunk) => {
      size += chunk.length;
      if (size <= limit) chunks.push(chunk);
    });
    request.on('end', () => {
      if (size > limit) {
        reject(new HttpError(413, 'too_large'));
        return;
      }
      if (size === 0) {
        resolve({});
        return;
      }
      try {
        const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed) === true) throw new Error('shape');
        resolve(parsed);
      } catch {
        reject(new HttpError(400, 'json'));
      }
    });
    request.on('error', () => reject(new HttpError(400, 'body')));
  });
}

function clientAddress(request) {
  const forwarded = request.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) return forwarded.split(',')[0].trim();
  return request.socket.remoteAddress ?? 'unknown';
}

function sendJson(response, status, payload) {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
  response.end(JSON.stringify(payload));
}

function sendHtml(response, status, html) {
  response.writeHead(status, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-cache', 'x-content-type-options': 'nosniff' });
  response.end(html);
}

export function createServer({ store, secret, now = Date.now, config = {} }) {
  const settings = { ...DEFAULT_CONFIG, ...config, rateLimits: { ...DEFAULT_CONFIG.rateLimits, ...(config.rateLimits ?? {}) } };
  const limiters = {
    start: createRateLimiter({ ...settings.rateLimits.start, now }),
    finish: createRateLimiter({ ...settings.rateLimits.finish, now }),
    events: createRateLimiter({ ...settings.rateLimits.events, now }),
    statsFailures: createRateLimiter({ ...settings.rateLimits.statsFailures, now }),
  };
  const statsDigest = typeof settings.statsKey === 'string' && settings.statsKey.length >= 16 ? createHash('sha256').update(settings.statsKey).digest() : null;

  function hasStatsKey(request) {
    const header = request.headers.authorization;
    if (typeof header !== 'string' || header.startsWith('Bearer ') === false) return false;
    const given = createHash('sha256').update(header.slice(7)).digest();
    return timingSafeEqual(given, statsDigest);
  }

  function qualifies(score) {
    if (store.boardSize() < settings.boardSize) return true;
    const fifth = store.fifthBestScore();
    return fifth === null || score > fifth;
  }

  function requireRun(runId, token, mode, ttlMs) {
    if (typeof runId !== 'string' || typeof token !== 'string') throw new HttpError(422, 'token');
    const run = store.getRun(runId);
    if (run === null || run.mode !== mode) throw new HttpError(404, 'run');
    if (verify(secret, runId, token) === false) throw new HttpError(403, 'token');
    if (now() - run.issuedAt > ttlMs) throw new HttpError(410, 'expired');
    return run;
  }

  const handlers = {
    async startRun(request) {
      const body = await readJson(request, settings.bodyLimit);
      if (body.mode !== 'easy' && body.mode !== 'real') throw new HttpError(400, 'mode');
      if (limiters.start.allow(clientAddress(request)) === false) throw new HttpError(429, 'rate');
      const runId = randomId(12);
      const seed = randomSeed();
      store.createRun({ id: runId, mode: body.mode, seed, issuedAt: now() });
      if (body.mode === 'real') store.incrementCounters({ 'real.started': 1 });
      return [200, { runId, seed, token: sign(secret, runId) }];
    },
    async finishRun(request, [runId]) {
      const body = await readJson(request, settings.bodyLimit);
      if (limiters.finish.allow(clientAddress(request)) === false) throw new HttpError(429, 'rate');
      const run = requireRun(runId, body.token, 'real', settings.runTtlMs);
      if (run.finishedAt !== null) throw new HttpError(409, 'used');
      let easy = null;
      let easyRun = null;
      if (body.easy !== undefined && body.easy !== null) {
        if (typeof body.easy !== 'object' || Array.isArray(body.easy) === true) throw new HttpError(422, 'easy');
        if (typeof body.easy.runId !== 'string' || typeof body.easy.token !== 'string' || Array.isArray(body.easy.strikes) === false) throw new HttpError(422, 'easy');
        easyRun = requireRun(body.easy.runId, body.easy.token, 'easy', settings.easyTtlMs);
        if (easyRun.continuedBy !== null) throw new HttpError(409, 'easy_used');
        easy = { seed: easyRun.seed, strikes: body.easy.strikes };
      }
      let outcome;
      try {
        outcome = validateRealRun({ realSeed: run.seed, easy, inputs: body.inputs, elapsedMs: now() - run.issuedAt, thresholds: settings.thresholds });
      } catch (error) {
        if (error instanceof ValidationError) throw new HttpError(422, error.code);
        throw error;
      }
      if (store.finishRun(runId, now()) === false) throw new HttpError(409, 'used');
      if (easyRun !== null && store.continueRun(easyRun.id, runId) === false) throw new HttpError(409, 'easy_used');
      if (outcome.human === false) {
        store.incrementCounters({ 'real.bots': 1 });
        return [200, { human: false }];
      }
      const { state, score } = outcome;
      store.incrementCounters(funFacts(outcome.events, state, score));
      const shareId = randomId(6);
      const qualified = qualifies(score.total);
      store.insertResult({
        shareId,
        runId,
        score: score.total,
        breakdown: JSON.stringify(score.lines),
        outcome: state.outcome,
        heroClass: state.hero.cls,
        heroName: state.hero.name,
        foeName: state.outcome === 'victory' ? 'THE LEGACY MONOLITH' : state.killer ?? state.lastFoe ?? 'the dungeon',
        qualifies: qualified,
        createdAt: now(),
      });
      return [200, { human: true, score: score.total, breakdown: score.lines, seconds: score.seconds, outcome: state.outcome, qualifies: qualified, rank: store.rankOf(score.total), shareId }];
    },
    async saveInitials(request, [shareId]) {
      const body = await readJson(request, settings.bodyLimit);
      if (isAllowedInitials(body.initials) === false) throw new HttpError(422, 'initials');
      const result = store.getResult(shareId);
      if (result === null) throw new HttpError(404, 'result');
      if (result.qualifies === false) throw new HttpError(403, 'not_top5');
      if (result.initials !== null) throw new HttpError(409, 'already_set');
      if (now() - result.createdAt > settings.initialsWindowMs) throw new HttpError(410, 'expired');
      if (qualifies(result.score) === false) throw new HttpError(409, 'not_top5_anymore');
      if (store.setInitials(shareId, body.initials) === false) throw new HttpError(409, 'already_set');
      return [200, { leaderboard: store.leaderboard(settings.boardSize) }];
    },
    async leaderboard() {
      return [200, { entries: store.leaderboard(settings.boardSize) }];
    },
    async event(request) {
      const body = await readJson(request, 1024);
      if (isEventType(body.type) === false) throw new HttpError(422, 'event');
      if (limiters.events.allow(clientAddress(request)) === false) throw new HttpError(429, 'rate');
      store.incrementCounters({ [body.type]: 1 });
      return [200, { ok: true }];
    },
    async stats(request) {
      if (statsDigest === null) throw new HttpError(404, 'route');
      const address = clientAddress(request);
      if (limiters.statsFailures.blocked(address) === true) throw new HttpError(429, 'rate');
      if (hasStatsKey(request) === false) {
        limiters.statsFailures.allow(address);
        throw new HttpError(401, 'key');
      }
      return [200, { counters: store.counters(), best: store.bestResult(), wall: store.boardSize() }];
    },
    async result(request, [shareId]) {
      const result = store.getResult(shareId);
      if (result === null) throw new HttpError(404, 'result');
      return [200, { score: result.score, outcome: result.outcome, heroName: result.heroName, heroClass: result.heroClass, foeName: result.foeName, initials: result.initials }];
    },
    async sharePage(request, [shareId]) {
      const result = store.getResult(shareId);
      if (result === null) throw new HttpError(404, 'result');
      return ['html', renderSharePage({ shareId, score: result.score, outcome: result.outcome, initials: result.initials, heroName: result.heroName, foeName: result.foeName, origin: settings.origin })];
    },
  };

  async function handle(request, response) {
    let url;
    try {
      url = new URL(request.url ?? '/', 'http://localhost');
    } catch {
      sendJson(response, 400, { error: 'url' });
      return;
    }
    const matches = ROUTES.filter((route) => route.pattern.test(url.pathname));
    try {
      if (matches.length === 0) throw new HttpError(404, 'route');
      const route = matches.find((candidate) => candidate.method === request.method);
      if (route === undefined) throw new HttpError(405, 'method');
      const params = route.pattern.exec(url.pathname).slice(1);
      const [status, payload] = await handlers[route.handler](request, params);
      if (status === 'html') sendHtml(response, 200, payload);
      else sendJson(response, status, payload);
    } catch (error) {
      if (error instanceof HttpError) {
        if (url.pathname.startsWith('/r/') && error.status === 404) sendHtml(response, 404, '<!doctype html><title>Not found</title><p>This result does not exist. <a href="/">Play the game</a></p>');
        else sendJson(response, error.status, { error: error.code });
        return;
      }
      console.error(error);
      sendJson(response, 500, { error: 'server' });
    }
  }

  return http.createServer((request, response) => {
    handle(request, response).catch((error) => {
      console.error(error);
      if (response.headersSent === false) sendJson(response, 500, { error: 'server' });
      else response.destroy();
    });
  });
}

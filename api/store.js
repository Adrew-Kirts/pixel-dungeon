import { DatabaseSync } from 'node:sqlite';

export function createStore(path) {
  const db = new DatabaseSync(path);
  db.exec(`
    CREATE TABLE IF NOT EXISTS runs (
      id TEXT PRIMARY KEY,
      mode TEXT NOT NULL,
      seed INTEGER NOT NULL,
      issued_at INTEGER NOT NULL,
      finished_at INTEGER,
      continued_by TEXT
    );
    CREATE TABLE IF NOT EXISTS results (
      share_id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL UNIQUE,
      score INTEGER NOT NULL,
      breakdown TEXT NOT NULL,
      outcome TEXT NOT NULL,
      hero_class TEXT NOT NULL,
      hero_name TEXT NOT NULL,
      foe_name TEXT NOT NULL,
      initials TEXT,
      qualifies INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS results_board ON results (score DESC) WHERE initials IS NOT NULL;
    CREATE TABLE IF NOT EXISTS counters (
      name TEXT PRIMARY KEY,
      value INTEGER NOT NULL
    );
  `);
  const statements = {
    createRun: db.prepare('INSERT INTO runs (id, mode, seed, issued_at) VALUES (?, ?, ?, ?)'),
    getRun: db.prepare('SELECT id, mode, seed, issued_at, finished_at, continued_by FROM runs WHERE id = ?'),
    finishRun: db.prepare('UPDATE runs SET finished_at = ? WHERE id = ? AND finished_at IS NULL'),
    continueRun: db.prepare('UPDATE runs SET continued_by = ? WHERE id = ? AND continued_by IS NULL'),
    pruneRuns: db.prepare('DELETE FROM runs WHERE finished_at IS NULL AND continued_by IS NULL AND issued_at < ?'),
    insertResult: db.prepare(
      'INSERT INTO results (share_id, run_id, score, breakdown, outcome, hero_class, hero_name, foe_name, initials, qualifies, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)',
    ),
    getResult: db.prepare('SELECT * FROM results WHERE share_id = ?'),
    setInitials: db.prepare('UPDATE results SET initials = ? WHERE share_id = ? AND initials IS NULL'),
    leaderboard: db.prepare('SELECT initials, score, hero_class FROM results WHERE initials IS NOT NULL ORDER BY score DESC, created_at ASC LIMIT ?'),
    boardCount: db.prepare('SELECT COUNT(*) AS count FROM results WHERE initials IS NOT NULL'),
    fifth: db.prepare('SELECT score FROM results WHERE initials IS NOT NULL ORDER BY score DESC, created_at ASC LIMIT 1 OFFSET 4'),
    deleteResult: db.prepare('DELETE FROM results WHERE share_id = ?'),
    increment: db.prepare('INSERT INTO counters (name, value) VALUES (?, ?) ON CONFLICT (name) DO UPDATE SET value = value + excluded.value'),
    counters: db.prepare('SELECT name, value FROM counters'),
    best: db.prepare('SELECT score, initials, outcome FROM results ORDER BY score DESC, created_at ASC LIMIT 1'),
    above: db.prepare('SELECT COUNT(*) AS count FROM results WHERE score > ?'),
    listResults: db.prepare('SELECT share_id, initials, score, outcome, hero_name, created_at FROM results WHERE initials IS NOT NULL ORDER BY score DESC LIMIT ?'),
  };
  if (db.prepare("SELECT value FROM counters WHERE name = 'meta.backfilled'").get() === undefined) {
    const totals = db.prepare("SELECT COUNT(*) AS finished, COALESCE(SUM(CASE WHEN outcome = 'victory' THEN 1 ELSE 0 END), 0) AS victories, COALESCE(SUM(score), 0) AS score FROM results").get();
    const finished = Number(totals.finished);
    const victories = Number(totals.victories);
    statements.increment.run('meta.backfilled', 1);
    if (finished > 0) {
      statements.increment.run('real.finished', finished);
      if (victories > 0) statements.increment.run('real.victory', victories);
      if (finished - victories > 0) statements.increment.run('real.gameover', finished - victories);
      statements.increment.run('real.score', Number(totals.score));
    }
  }
  const toRun = (row) =>
    row === undefined
      ? null
      : { id: row.id, mode: row.mode, seed: Number(row.seed), issuedAt: Number(row.issued_at), finishedAt: row.finished_at === null ? null : Number(row.finished_at), continuedBy: row.continued_by };
  const toResult = (row) =>
    row === undefined
      ? null
      : {
          shareId: row.share_id,
          runId: row.run_id,
          score: Number(row.score),
          breakdown: JSON.parse(row.breakdown),
          outcome: row.outcome,
          heroClass: row.hero_class,
          heroName: row.hero_name,
          foeName: row.foe_name,
          initials: row.initials,
          qualifies: Number(row.qualifies) === 1,
          createdAt: Number(row.created_at),
        };
  return {
    createRun({ id, mode, seed, issuedAt }) {
      statements.createRun.run(id, mode, seed, issuedAt);
    },
    getRun(id) {
      return toRun(statements.getRun.get(id));
    },
    finishRun(id, at) {
      return Number(statements.finishRun.run(at, id).changes) === 1;
    },
    continueRun(easyId, realId) {
      return Number(statements.continueRun.run(realId, easyId).changes) === 1;
    },
    pruneRuns(olderThan) {
      statements.pruneRuns.run(olderThan);
    },
    insertResult({ shareId, runId, score, breakdown, outcome, heroClass, heroName, foeName, qualifies, createdAt }) {
      statements.insertResult.run(shareId, runId, score, breakdown, outcome, heroClass, heroName, foeName, qualifies === true ? 1 : 0, createdAt);
    },
    getResult(shareId) {
      return toResult(statements.getResult.get(shareId));
    },
    setInitials(shareId, initials) {
      return Number(statements.setInitials.run(initials, shareId).changes) === 1;
    },
    leaderboard(limit) {
      return statements.leaderboard.all(limit).map((row, index) => ({ rank: index + 1, initials: row.initials, score: Number(row.score), heroClass: row.hero_class }));
    },
    boardSize() {
      return Number(statements.boardCount.get().count);
    },
    fifthBestScore() {
      const row = statements.fifth.get();
      return row === undefined ? null : Number(row.score);
    },
    deleteResult(shareId) {
      return Number(statements.deleteResult.run(shareId).changes) === 1;
    },
    listResults(limit) {
      return statements.listResults.all(limit);
    },
    incrementCounters(increments) {
      for (const [name, value] of Object.entries(increments)) {
        if (Number.isFinite(value) === true && value !== 0) statements.increment.run(name, Math.round(value));
      }
    },
    counters() {
      return Object.fromEntries(statements.counters.all().filter((row) => row.name.startsWith('meta.') === false).map((row) => [row.name, Number(row.value)]));
    },
    rankOf(score) {
      return Number(statements.above.get(score).count) + 1;
    },
    bestResult() {
      const row = statements.best.get();
      return row === undefined ? null : { score: Number(row.score), initials: row.initials, outcome: row.outcome };
    },
    close() {
      db.close();
    },
  };
}

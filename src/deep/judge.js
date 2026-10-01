function grade(error, windows) {
  if (error === null) return 'miss';
  const distance = Math.abs(error);
  if (distance <= windows.perfect) return 'perfect';
  if (distance <= windows.good) return 'good';
  return 'miss';
}

function tapBudget(beats, extra) {
  return beats.length + extra;
}

export function judgeBeats(beats, taps, windows, extra = Number.POSITIVE_INFINITY) {
  const sorted = taps
    .filter((tap) => typeof tap === 'number' && Number.isFinite(tap) === true)
    .sort((a, b) => a - b)
    .slice(0, tapBudget(beats, extra));
  const results = [];
  let cursor = 0;
  let open = Number.NEGATIVE_INFINITY;
  for (const beat of beats) {
    const close = beat + windows.good;
    while (cursor < sorted.length && sorted[cursor] <= open) cursor++;
    let attempt = null;
    if (cursor < sorted.length && sorted[cursor] <= close) {
      attempt = sorted[cursor];
      cursor++;
    }
    while (cursor < sorted.length && sorted[cursor] <= close) cursor++;
    open = close;
    const error = attempt === null ? null : attempt - beat;
    results.push({ beat, tap: attempt, error, grade: grade(error, windows) });
  }
  return results;
}

export function createLiveJudge(beats, windows, extra = Number.POSITIVE_INFINITY) {
  const results = beats.map((beat) => ({ beat, tap: null, error: null, grade: 'miss' }));
  const attempted = beats.map(() => false);
  const budget = tapBudget(beats, extra);
  let current = 0;
  let count = 0;

  function expire(now) {
    const missed = [];
    while (current < beats.length && beats[current] + windows.good < now) {
      if (attempted[current] === false) missed.push({ index: current, grade: 'miss', error: null });
      current++;
    }
    return missed;
  }

  return {
    tap(at) {
      count += 1;
      expire(at);
      if (count > budget) return { index: null, grade: 'flail', error: null };
      if (current >= beats.length || attempted[current] === true) return null;
      attempted[current] = true;
      const error = at - beats[current];
      const result = results[current];
      result.tap = at;
      result.error = error;
      result.grade = grade(error, windows);
      return { index: current, grade: result.grade, error };
    },
    expire,
    flailed() {
      return count > budget;
    },
    done(now) {
      return current >= beats.length || (current === beats.length - 1 && attempted[current] === true) || beats[beats.length - 1] + windows.good < now;
    },
    results() {
      return results.map((result) => ({ ...result }));
    },
  };
}

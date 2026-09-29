const MAX_SEED_AGE_MS = 15 * 60 * 1000;

export function createEasySeeds({ api, fixedSeed = null, timeoutMs = 1500, onAvailability = () => {}, now = Date.now, maxAgeMs = MAX_SEED_AGE_MS }) {
  let runs = 0;
  let prefetch = null;

  function localSeed() {
    runs += 1;
    if (Number.isFinite(fixedSeed) === true) return { seed: (fixedSeed + runs - 1) >>> 0, server: null };
    return { seed: crypto.getRandomValues(new Uint32Array(1))[0], server: null };
  }

  function fetchSeed() {
    const issuedAt = now();
    const request = api
      .startRun('easy', timeoutMs)
      .then((session) => {
        onAvailability(true);
        return { seed: session.seed, server: { runId: session.runId, token: session.token, issuedAt } };
      })
      .catch(() => {
        onAvailability(false);
        return null;
      });
    return { issuedAt, request };
  }

  return {
    warm() {
      if (Number.isFinite(fixedSeed) === true) return;
      if (prefetch === null) prefetch = fetchSeed();
    },
    async next() {
      if (Number.isFinite(fixedSeed) === true) return localSeed();
      let pending = prefetch;
      if (pending === null || now() - pending.issuedAt > maxAgeMs) pending = fetchSeed();
      prefetch = null;
      const result = await pending.request;
      prefetch = fetchSeed();
      return result ?? localSeed();
    },
  };
}

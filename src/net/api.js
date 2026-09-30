export class ApiError extends Error {
  constructor(status, code) {
    super(code);
    this.status = status;
    this.code = code;
  }
}

async function request(path, { method = 'GET', body = undefined, timeoutMs = 5000, headers = {} } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(path, {
      method,
      headers: body === undefined ? headers : { 'content-type': 'application/json', ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
      credentials: 'omit',
    });
    const payload = await response.json().catch(() => ({}));
    if (response.ok === false) throw new ApiError(response.status, payload.error ?? 'error');
    return payload;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(0, 'network');
  } finally {
    clearTimeout(timer);
  }
}

export function createApi(base = '') {
  return {
    startRun: (mode, timeoutMs = 3000) => request(`${base}/api/runs`, { method: 'POST', body: { mode }, timeoutMs }),
    finishRun: (runId, body) => request(`${base}/api/runs/${encodeURIComponent(runId)}/finish`, { method: 'POST', body, timeoutMs: 10000 }),
    submitInitials: (shareId, initials) => request(`${base}/api/scores/${encodeURIComponent(shareId)}/initials`, { method: 'POST', body: { initials } }),
    leaderboard: () => request(`${base}/api/leaderboard`),
    result: (shareId) => request(`${base}/api/results/${encodeURIComponent(shareId)}`),
    event: (type) => request(`${base}/api/events`, { method: 'POST', body: { type }, timeoutMs: 4000 }).catch(() => null),
    stats: (key) => request(`${base}/api/stats`, { headers: { authorization: `Bearer ${key}` } }),
  };
}

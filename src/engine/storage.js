const PREFIX = 'sw:';

export function createStorage(getBackend = () => globalThis.localStorage) {
  const get = (key) => {
    try {
      return getBackend().getItem(PREFIX + key);
    } catch {
      return null;
    }
  };
  const set = (key, value) => {
    try {
      getBackend().setItem(PREFIX + key, String(value));
      return true;
    } catch {
      return false;
    }
  };
  return {
    get,
    set,
    getJson(key) {
      const raw = get(key);
      if (raw === null) return null;
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    },
    setJson(key, value) {
      return set(key, JSON.stringify(value));
    },
  };
}

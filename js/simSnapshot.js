export const SIM_SNAPSHOT_KEY = "hpInvSimSnapshot";

export function saveSimSnapshot(data) {
  try {
    sessionStorage.setItem(SIM_SNAPSHOT_KEY, JSON.stringify(data));
  } catch {
    /* ignore quota / private mode */
  }
}

export function loadSimSnapshot() {
  try {
    const raw = sessionStorage.getItem(SIM_SNAPSHOT_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

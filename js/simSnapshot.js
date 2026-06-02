export const SIM_SNAPSHOT_KEY = "hpInvSimSnapshot";

/** Guarda el resumen de la última corrida en sessionStorage. */
export function saveSimSnapshot(data) {
  try {
    sessionStorage.setItem(SIM_SNAPSHOT_KEY, JSON.stringify(data));
  } catch {
    /* ignore quota / private mode */
  }
}

/** Lee el resumen guardado o null si no hay corrida. */
export function loadSimSnapshot() {
  try {
    const raw = sessionStorage.getItem(SIM_SNAPSHOT_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

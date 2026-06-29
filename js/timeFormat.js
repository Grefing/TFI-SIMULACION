/** Convierte segundos de jornada a texto legible (s o h). */
export function formatJornada(sec) {
  const n = Number(sec);
  if (!Number.isFinite(n) || n < 0) return "—";
  if (n < 60) return `${Math.round(n)} s`;
  const h = n / 3600;
  if (h < 1) return `${h.toFixed(2)} h`;
  if (h < 10) return `${h.toFixed(1)} h`;
  return `${h.toFixed(1)} h`;
}

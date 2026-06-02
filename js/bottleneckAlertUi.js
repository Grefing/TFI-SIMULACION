import { formatJornada } from "./timeFormat.js";

export const JORNADA_LIMITE_HORAS = 8;
export const JORNADA_LIMITE_SEC = JORNADA_LIMITE_HORAS * 60 * 60;

/** Muestra alerta si la jornada supera 8 h (cuello de botella). */
export function syncBottleneckAlert(makespanSec, workers) {
  const alert = document.getElementById("bottleneck-alert");
  const textEl = document.getElementById("bottleneck-alert-text");
  const kpiTime = document.getElementById("kpi-time");
  if (!alert) return;

  const sec = Number(makespanSec);
  if (!Number.isFinite(sec) || sec <= JORNADA_LIMITE_SEC) {
    hideBottleneckAlert();
    return;
  }

  const w = Math.max(1, Number(workers) || 1);
  const jornada = formatJornada(sec);
  if (textEl) {
    textEl.textContent = `La jornada (${jornada}) superó las ${JORNADA_LIMITE_HORAS} horas con ${w} operario(s). Se generó un cuello de botella en la etapa de clasificación; se recomienda incorporar más operarios.`;
  }
  alert.hidden = false;
  kpiTime?.classList.add("kpi__value--warn");
}

/** Oculta el banner y quita el estilo de advertencia del KPI tiempo. */
export function hideBottleneckAlert() {
  const alert = document.getElementById("bottleneck-alert");
  if (alert) alert.hidden = true;
  document.getElementById("kpi-time")?.classList.remove("kpi__value--warn");
}

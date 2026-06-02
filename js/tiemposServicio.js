/**
 * Tiempos de clasificación por pieza.
 * Base: exponencial (tinta μ=20 s, tóner μ=25 s).
 * HP original dañado: + Uniforme(5, 10) s.
 */

/** Medias de la exponencial base por tipo (segundos). */
export const SERVICE_MEAN_SEC = { Tinta: 20, Tóner: 25 };

const DAMAGE_EXTRA_MIN_SEC = 5;
const DAMAGE_EXTRA_SPAN_SEC = 5;

/** Muestra tiempo exponencial en segundos (−μ·ln U). */
function sampleExponentialSec(rng, meanSec) {
  const u = Math.max(rng.nextU01(), 1e-12);
  return -meanSec * Math.log(u);
}

/** Segundos extra uniformes [5, 10] si el original está dañado. */
function sampleDamageExtraSec(rng) {
  return DAMAGE_EXTRA_MIN_SEC + DAMAGE_EXTRA_SPAN_SEC * rng.nextU01();
}

/** Tiempo total de clasificación de una pieza (s). */
export function sampleServiceSec(rng, tipo, isOriginal, isDamaged) {
  const mean = tipo === "Tóner" ? SERVICE_MEAN_SEC.Tóner : SERVICE_MEAN_SEC.Tinta;
  let t = sampleExponentialSec(rng, mean);
  if (isOriginal && isDamaged) {
    t += sampleDamageExtraSec(rng);
  }
  return Math.max(1, Math.round(t));
}

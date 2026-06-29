/**
 * Pruebas estadísticas sobre muestras U(0,1) del método congruencial mixto.
 * Fórmulas según material del curso: promedios (Z) y frecuencia (χ²).
 */

import { MetodoCongruencialMixto } from "./lcgMixto.js";

/** χ² crítico, α = 0,05 (cola superior). Índice = grados de libertad (x − 1). */
const CHI2_CRITICO_005 = [
  0,
  3.841, 5.991, 7.815, 9.488, 11.07, 12.592, 14.067, 15.507, 16.919, 18.307,
  19.675, 21.026, 22.362, 23.685, 24.996, 26.296, 27.587, 28.869, 30.144, 31.41,
  32.671, 33.924, 35.172, 36.415, 37.652, 38.885, 40.113, 41.337, 42.557, 43.773,
  44.985, 46.194, 47.4, 48.602, 49.802, 50.998, 52.192, 53.384, 54.572, 55.758,
  56.942, 58.124, 59.304, 60.481, 61.656, 62.83, 64.001, 65.171, 66.339, 67.505,
];

const MU_UNIFORME = 0.5;
const VAR_UNIFORME = 1 / 12;
/** Bilateral α = 0,05: no se rechaza H₀ si |Z₀| < Zα. */
const Z_CRITICO_005 = 1.96;

/** Genera n uniformes U(0,1) con el MCM y la semilla dada. */
export function generarMuestraU01(seed, n) {
  const size = Math.max(1, Math.floor(Number(n)) || 1);
  const rng = new MetodoCongruencialMixto(seed);
  const muestra = new Array(size);
  for (let i = 0; i < size; i += 1) {
    muestra[i] = rng.nextU01();
  }
  return muestra;
}

/** Prueba de promedios: comprueba si la media ≈ 0,5 (estadístico Z₀). */
export function pruebaPromedios(muestra, opts = {}) {
  const n = muestra.length;
  const zCritico = opts.zCritico ?? Z_CRITICO_005;

  if (n === 0) {
    return {
      n: 0,
      media: null,
      z0: null,
      zCritico,
      pasa: false,
      mensaje: "Muestra vacía.",
    };
  }

  let sum = 0;
  for (let i = 0; i < n; i += 1) sum += muestra[i];
  const media = sum / n;
  const z0 = ((media - MU_UNIFORME) * Math.sqrt(n)) / Math.sqrt(VAR_UNIFORME);
  const pasa = Math.abs(z0) < zCritico;

  return {
    n,
    media,
    esperado: MU_UNIFORME,
    varianzaTeorica: VAR_UNIFORME,
    z0,
    zCritico,
    pasa,
    mensaje: pasa
      ? `|Z₀| = ${Math.abs(z0).toFixed(4)} < ${zCritico}: no se rechaza H₀ (media compatible con U(0,1)).`
      : `|Z₀| = ${Math.abs(z0).toFixed(4)} ≥ ${zCritico}: se rechaza H₀ (media alejada de 0,5).`,
  };
}

/** Prueba de frecuencia: uniformidad por intervalos en (0,1) (χ²). */
export function pruebaFrecuencia(muestra, opts = {}) {
  const n = muestra.length;
  const x = Math.max(2, Math.floor(opts.intervalos ?? 10));
  const gl = x - 1;
  const fe = n / x;

  if (n === 0) {
    return {
      n: 0,
      intervalos: x,
      chi2: null,
      chi2Critico: null,
      gl,
      frecuenciasObservadas: [],
      frecuenciaEsperada: fe,
      pasa: false,
      mensaje: "Muestra vacía.",
    };
  }

  const foj = new Array(x).fill(0);
  for (let i = 0; i < n; i += 1) {
    const u = muestra[i];
    let j = Math.floor(u * x);
    if (j >= x) j = x - 1;
    if (j < 0) j = 0;
    foj[j] += 1;
  }

  let chi2 = 0;
  for (let j = 0; j < x; j += 1) {
    const diff = foj[j] - fe;
    chi2 += diff * diff;
  }
  chi2 = (x / n) * chi2;

  let chi2Critico = opts.chi2Critico;
  if (chi2Critico == null && gl < CHI2_CRITICO_005.length) {
    chi2Critico = CHI2_CRITICO_005[gl];
  }

  const pasa = chi2Critico != null && chi2 < chi2Critico;
  const mensaje =
    chi2Critico == null
      ? `χ² = ${chi2.toFixed(4)} (sin χ²α tabulado para gl = ${gl}).`
      : pasa
        ? `χ² = ${chi2.toFixed(4)} < ${chi2Critico} (gl = ${gl}): no se rechaza H₀.`
        : `χ² = ${chi2.toFixed(4)} ≥ ${chi2Critico} (gl = ${gl}): se rechaza H₀.`;

  return {
    n,
    intervalos: x,
    gl,
    frecuenciaEsperada: fe,
    frecuenciasObservadas: foj,
    chi2,
    chi2Critico: chi2Critico ?? null,
    pasa: chi2Critico != null ? pasa : null,
    mensaje,
  };
}

/** Ejecuta promedios y frecuencia sobre una muestra del MCM. */
export function validarGeneradorU01(seed, n = 10000, opts = {}) {
  const muestra = generarMuestraU01(seed, n);
  const promedios = pruebaPromedios(muestra, opts);
  const frecuencia = pruebaFrecuencia(muestra, opts);
  const pasaAmbas = Boolean(promedios.pasa && frecuencia.pasa);

  return {
    seed,
    n: muestra.length,
    promedios,
    frecuencia,
    pasaAmbas,
    resumen: pasaAmbas
      ? "No se rechazó H₀ de uniformidad U(0,1) en promedios ni frecuencia (α = 0,05)."
      : "Al menos una prueba rechazó H₀ de uniformidad U(0,1) (α = 0,05).",
  };
}

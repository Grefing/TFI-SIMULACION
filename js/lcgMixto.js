/**
 * Método congruencial mixto (LCG mixto).
 *
 * Recurrencia: X_{n+1} = (a · X_n + c) mod m
 * - m = 2³² (4294967296)
 * - a = 1664525, c = 1013904223 (parámetros clásicos, p. ej. Numerical Recipes)
 *
 * La semilla inicial se normaliza a entero sin signo en [1, 2³²−1].
 * nextU01() devuelve X_n / m ~ U(0, 1) para simulación (sin Math.random()).
 */

const M = 4294967296;
const A = 1664525;
const C = 1013904223;

export class MetodoCongruencialMixto {
  /** Inicializa el estado interno con la semilla del usuario. */
  constructor(seed) {
    let s = Number(seed);
    if (!Number.isFinite(s)) s = 1;
    s = Math.trunc(s);
    this.state = (s >>> 0) || 1;
  }

  /** Un uniforme en (0, 1]: avanza el LCG y divide por m. */
  nextU01() {
    this.state = (A * this.state + C) >>> 0;
    return this.state / M;
  }

  /** Entero aleatorio equiprobable entre min y max (inclusive). */
  nextIntInclusive(min, max) {
    const lo = Math.ceil(min);
    const hi = Math.floor(max);
    if (hi < lo) return lo;
    const span = hi - lo + 1;
    const t = Math.floor(this.nextU01() * span);
    return lo + t;
  }

  /** true/false con probabilidad p (ensayo de Bernoulli). */
  nextBernoulli(p) {
    const clamped = Math.min(1, Math.max(0, p));
    return this.nextU01() < clamped;
  }
}

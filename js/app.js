import { saveSimSnapshot } from "./simSnapshot.js";
import { initRecoveryInfoModal, syncRecoveryInfoBtn } from "./recoveryInfoUi.js";
import { syncBottleneckAlert, hideBottleneckAlert } from "./bottleneckAlertUi.js";
import { formatJornada } from "./timeFormat.js";
import { MetodoCongruencialMixto } from "./lcgMixto.js";
import { validarGeneradorU01 } from "./pruebasEstadisticas.js";
import { sampleServiceSec } from "./tiemposServicio.js";

const BATCH_N_MIN = 150;
const RNG_VALIDATION_N = 10000;
const BATCH_N_MAX = 3000;
const MAX_WORKERS = 8;

/** Acota un valor de slider al rango 0–100 %. */
function clampPct(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, n));
}

/** Clasifica la pieza en apto, dañado o genérico. */
function classifyItem(isOriginal, isDamaged) {
  if (!isOriginal) return { apto: false, bucket: "generico" };
  if (isDamaged) return { apto: false, bucket: "original_danado" };
  return { apto: true, bucket: "original_apto" };
}

/** Asigna piezas a operarios (máquina más libre); devuelve makespan. */
function scheduleParallel(items, workers) {
  const w = Math.max(1, Math.min(MAX_WORKERS, Math.floor(workers) || 1));
  const free = new Array(w).fill(0);
  for (const it of items) {
    let wi = 0;
    for (let j = 1; j < w; j += 1) {
      if (free[j] < free[wi]) wi = j;
    }
    it.worker = wi;
    it.startSec = free[wi];
    it.endSec = free[wi] + it.tiempoSec;
    free[wi] = it.endSec;
  }
  return Math.max(...free, 0);
}

/** Formatea segundos para la UI (s o m). */
function formatSec(s) {
  const n = Math.round(Number(s));
  if (!Number.isFinite(n) || n <= 0) return "0 s";
  if (n < 60) return `${n} s`;
  const m = Math.floor(n / 60);
  const r = n % 60;
  return r ? `${m}m ${r}s` : `${m} m`;
}

/** Sortea tipo (tinta/tóner) y si es HP original o genérico. */
function samplePieceKind(rng, pInk, pOrigInk, pOrigToner) {
  const u = rng.nextU01();
  if (u < pOrigInk) {
    return { tipo: "Tinta", isOriginal: true };
  }
  if (u < pOrigInk + pOrigToner) {
    return { tipo: "Tóner", isOriginal: true };
  }
  const pGen = Math.max(0, 1 - pOrigInk - pOrigToner);
  let pInkIfGeneric = 0.5;
  if (pGen > 0) {
    pInkIfGeneric = Math.min(1, Math.max(0, (pInk - pOrigInk) / pGen));
  }
  const isInk = rng.nextBernoulli(pInkIfGeneric);
  return { tipo: isInk ? "Tinta" : "Tóner", isOriginal: false };
}

/** Genera el lote completo, tiempos, KPIs y planificación paralela. */
function simulateBatch(params) {
  const {
    seed,
    pctInk,
    pctOrigInk,
    pctOrigToner,
    pctDmgInk,
    pctDmgToner,
    workers: workersRaw,
  } = params;

  const rng = new MetodoCongruencialMixto(seed);
  const n = rng.nextIntInclusive(BATCH_N_MIN, BATCH_N_MAX);

  const workers = Math.min(MAX_WORKERS, Math.max(1, Math.floor(Number(workersRaw)) || 1));

  const pInk = clampPct(pctInk) / 100;
  const pOrigInk = clampPct(pctOrigInk) / 100;
  const pOrigToner = clampPct(pctOrigToner) / 100;
  const pDmgInk = clampPct(pctDmgInk) / 100;
  const pDmgToner = clampPct(pctDmgToner) / 100;

  const items = [];

  const counts = {
    original_apto: 0,
    generico: 0,
    original_danado: 0,
  };

  let aptosTinta = 0;
  let aptosToner = 0;
  let danadoTinta = 0;
  let danadoToner = 0;
  let genericoTinta = 0;
  let genericoToner = 0;

  for (let i = 1; i <= n; i += 1) {
    const { tipo, isOriginal } = samplePieceKind(rng, pInk, pOrigInk, pOrigToner);
    const originalidad = isOriginal ? "HP Original" : "Genérico";
    let isDamaged = false;
    if (isOriginal) {
      isDamaged = rng.nextBernoulli(tipo === "Tinta" ? pDmgInk : pDmgToner);
    }
    const integridad = isDamaged ? "Dañado" : "Sano";

    const { apto, bucket } = classifyItem(isOriginal, isDamaged);
    counts[bucket] += 1;
    if (bucket === "original_apto") {
      if (tipo === "Tinta") aptosTinta += 1;
      else aptosToner += 1;
    } else if (bucket === "original_danado") {
      if (tipo === "Tinta") danadoTinta += 1;
      else danadoToner += 1;
    } else if (bucket === "generico") {
      if (tipo === "Tinta") genericoTinta += 1;
      else genericoToner += 1;
    }
    const tiempoSec = sampleServiceSec(rng, tipo, isOriginal, isDamaged);

    items.push({
      id: i,
      tipo,
      originalidad,
      integridad,
      estado: apto ? "Apto" : "No apto",
      tiempoSec,
      bucket,
    });
  }

  const makespanSec = scheduleParallel(items, workers);
  const sumServiceSec = items.reduce((s, it) => s + it.tiempoSec, 0);
  const recoveryPct = n > 0 ? (counts.original_apto / n) * 100 : 0;
  const recoveryInkPct = n > 0 ? (aptosTinta / n) * 100 : 0;
  const recoveryTonerPct = n > 0 ? (aptosToner / n) * 100 : 0;

  return {
    items,
    totalMinutes: makespanSec / 60,
    makespanSec,
    sumServiceSec,
    counts,
    recoveryPct,
    recoveryInkPct,
    recoveryTonerPct,
    aptosTinta,
    aptosToner,
    danadoTinta,
    danadoToner,
    genericoTinta,
    genericoToner,
    n,
    seed: Number(params.seed),
    workers,
  };
}

/** Velocidad de la animación: ×1 (base) … ×8. Se aplica al tiempo entre piezas. */
const SPEED_STEPS = [1, 2, 4, 8];
let simSpeedIndex = 0;
let simAbortController = null;

/** Deshabilita enlaces mientras corre la animación. */
function setNavLinkDisabled(el, disabled) {
  if (!el) return;
  if (disabled) {
    if (!el.dataset.href) el.dataset.href = el.getAttribute("href") || "";
    el.removeAttribute("href");
    el.setAttribute("aria-disabled", "true");
    el.classList.add("btn--disabled");
  } else {
    if (el.dataset.href) el.setAttribute("href", el.dataset.href);
    el.removeAttribute("aria-disabled");
    el.classList.remove("btn--disabled");
  }
}

/** Habilita/deshabilita botones según simulación en curso. */
function setSimControlsRunning(running) {
  const runBtn = document.getElementById("btn-run");
  const skipBtn = document.getElementById("btn-skip");
  const resetBtn = document.getElementById("btn-reset");
  if (runBtn) runBtn.disabled = running;
  if (skipBtn) skipBtn.disabled = !running;
  if (resetBtn) resetBtn.disabled = running;
  setNavLinkDisabled(document.getElementById("btn-aptitud-nav"), running);
  setNavLinkDisabled(document.getElementById("btn-aptitud-detail"), running);
}

/** Espera ms respetando AbortSignal (completar ahora). */
function waitMs(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const id = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(id);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });
}

/** Factor de velocidad actual (×1, ×2, ×4, ×8). */
function getSimSpeedFactor() {
  return SPEED_STEPS[simSpeedIndex];
}

/** Actualiza la etiqueta de velocidad en pantalla. */
function syncSpeedUi() {
  const el = document.getElementById("speed-factor-label");
  if (el) el.textContent = `×${getSimSpeedFactor()}`;
}

/** Cicla al siguiente factor de velocidad de animación. */
function cycleSimSpeed() {
  simSpeedIndex = (simSpeedIndex + 1) % SPEED_STEPS.length;
  syncSpeedUi();
}

/** Aplica el factor de velocidad al delay entre eventos. */
function effectiveStepDelayMs(baseDelayMs) {
  return Math.max(40, Math.floor(baseDelayMs / getSimSpeedFactor()));
}

/** Actualiza KPIs de recuperación, N y jornada en la barra lateral. */
function setKpis({ recoveryPct, recoveryInkPct, recoveryTonerPct, n, makespanSec }) {
  document.getElementById("kpi-recovery").textContent = `${recoveryPct.toFixed(1)} %`;
  document.getElementById("kpi-time").textContent = formatJornada(makespanSec);
  document.getElementById("kpi-count").textContent = String(n);
  syncRecoveryInfoBtn({
    recoveryPct,
    recoveryInkPct,
    recoveryTonerPct,
    n,
    active: true,
  });
}

const BELT_COLS = 7;
const BELT_CENTER = 3;

/** Resetea tabla, cinta, KPIs y progreso a estado inicial. */
function clearResultsUi() {
  document.getElementById("results-body").innerHTML = "";
  document.getElementById("belt-cells").innerHTML = "";
  document.getElementById("progress-bar").style.width = "0%";
  document.getElementById("progress-text").textContent = "Configure parámetros y ejecute la simulación.";
  document.getElementById("progress-aria").setAttribute("aria-valuenow", "0");
  document.getElementById("kpi-recovery").textContent = "—";
  document.getElementById("kpi-time").textContent = "—";
  document.getElementById("kpi-count").textContent = "—";
  syncRecoveryInfoBtn({ active: false });
  hideBottleneckAlert();
  document.getElementById("belt-stat-queue").textContent = "—";
  document.getElementById("belt-stat-wait").textContent = "";
  document.getElementById("belt-stat-processed").textContent = "0";
  document.getElementById("belt-stat-apt").textContent = "0";
  document.getElementById("belt-stat-dmg").textContent = "0";
  document.getElementById("belt-stat-gen").textContent = "0";
  const batchEl = document.getElementById("batch-size");
  if (batchEl) batchEl.value = "";
  setBeltRatioWidths(0, 0, 0);
  const strip = document.getElementById("operators-strip");
  if (strip) strip.innerHTML = "";
  const badge = document.getElementById("progress-badge");
  badge.textContent = "Listo";
  badge.className = "badge";
  const opBadge = document.getElementById("operators-count-badge");
  if (opBadge) {
    const w = Math.max(1, Math.min(MAX_WORKERS, Number(document.getElementById("workers-count")?.value) || 1));
    opBadge.textContent = `${w} op.`;
  }
}

/** Ancho de las barras de proporción en la cinta (apt/dmg/gen). */
function setBeltRatioWidths(pctApt, pctDmg, pctGen) {
  const a = document.getElementById("belt-ratio-apt");
  const d = document.getElementById("belt-ratio-dmg");
  const g = document.getElementById("belt-ratio-gen");
  if (a) a.style.width = `${pctApt}%`;
  if (d) d.style.width = `${pctDmg}%`;
  if (g) g.style.width = `${pctGen}%`;
}

/** Clase CSS de color según bucket (apto/daño/genérico). */
function pieceBucketClass(item) {
  if (!item) return "neutral";
  if (item.bucket === "original_apto") return "ok";
  if (item.bucket === "original_danado") return "warn";
  return "bad";
}

/** SVG de cartucho de tinta para la cinta. */
function svgInk() {
  return `<svg viewBox="0 0 40 52" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect class="belt-piece__ring" x="2.5" y="2.5" width="35" height="47" rx="8" fill="none" />
    <rect x="8" y="10" width="24" height="28" rx="3" fill="#30363d" />
    <rect x="11" y="14" width="18" height="9" rx="2" fill="#0096d6" />
    <path d="M14 40 L26 40 L22 50 L18 50 Z" fill="#484f58" />
  </svg>`;
}

/** SVG de tóner para la cinta. */
function svgToner() {
  return `<svg viewBox="0 0 52 48" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect class="belt-piece__ring" x="2.5" y="2.5" width="47" height="43" rx="7" fill="none" />
    <rect x="8" y="10" width="36" height="22" rx="3" fill="#30363d" />
    <circle cx="26" cy="32" r="10" fill="#21262d" stroke="#484f58" stroke-width="1.5" />
    <circle cx="26" cy="32" r="5" fill="#0096d6" opacity="0.85" />
  </svg>`;
}

/** HTML de una pieza en un slot de la cinta animada. */
function cartridgeHtml(item, variant) {
  if (!item) {
    return '<span class="belt-piece belt-piece--neutral belt-piece--ghost" aria-hidden="true"></span>';
  }
  const pending = variant === "future" || variant === "next";
  const toneClass = pending ? "queue" : pieceBucketClass(item);
  const ink = item.tipo === "Tinta";
  let anim = "";
  if (variant === "center") anim = " belt-piece--enter";
  if (variant === "past") anim = " belt-piece--exit";
  if (variant === "future" || variant === "next") anim = " belt-piece--enter";
  const svg = ink ? svgInk() : svgToner();
  return `<div class="belt-piece belt-piece--${toneClass}${anim}">
    ${svg}
    <span class="belt-piece__id">#${item.id}</span>
  </div>`;
}

/** Crea las 7 celdas de la cinta si aún no existen. */
function ensureBeltGrid() {
  const wrap = document.getElementById("belt-cells");
  if (wrap.children.length === BELT_COLS) return;
  wrap.innerHTML = "";
  for (let j = 0; j < BELT_COLS; j += 1) {
    const cell = document.createElement("div");
    cell.className = `belt-cell${j === BELT_CENTER ? " belt-cell--center" : ""}`;
    cell.dataset.slot = String(j);
    wrap.appendChild(cell);
  }
}

/** Pinta cola, pieza en clasificación y recién procesadas en la cinta. */
function renderBeltParallel({ center, pending, recent }) {
  ensureBeltGrid();
  const cells = document.querySelectorAll("#belt-cells .belt-cell");
  const left = [
    pending.length > 2 ? pending[2] : null,
    pending.length > 1 ? pending[1] : null,
    pending.length > 0 ? pending[0] : null,
  ];
  const right = [recent[0] || null, recent[1] || null, recent[2] || null];
  const slots = [...left, center || null, ...right];

  for (let j = 0; j < BELT_COLS; j += 1) {
    const cell = cells[j];
    const item = slots[j];
    let variant = "future";
    if (j === BELT_CENTER) variant = item ? "center" : "empty";
    else if (j > BELT_CENTER) variant = item ? "past" : "empty";
    else if (j === 2) variant = item ? "next" : "empty";

    cell.classList.toggle("belt-cell--empty", !item);
    cell.classList.toggle("belt-cell--pending", Boolean(item && j < BELT_CENTER));
    cell.innerHTML = cartridgeHtml(item, variant);
  }

  const cEl = cells[BELT_CENTER];
  cEl.classList.remove("belt-cell--pulse");
  void cEl.offsetWidth;
  if (center) cEl.classList.add("belt-cell--pulse");
}

/** Cuenta aptos/dañados/genéricos entre ids completados. */
function countBucketsInSet(items, idSet) {
  let apt = 0;
  let dmg = 0;
  let gen = 0;
  for (const it of items) {
    if (!idSet.has(it.id)) continue;
    if (it.bucket === "original_apto") apt += 1;
    else if (it.bucket === "original_danado") dmg += 1;
    else gen += 1;
  }
  return { apt, dmg, gen };
}

/** Delay base de animación según tamaño del lote N. */
function computeStepDelayMs(n) {
  if (n <= 20) return 1100;
  if (n <= 40) return 900;
  if (n <= 70) return 720;
  if (n <= 120) return 580;
  if (n <= 200) return 480;
  if (n <= 400) return 380;
  return Math.max(300, Math.floor(72000 / n));
}

/** Actualiza contadores y barra de proporción de la cinta. */
function updateBeltStatsFromCompleted(completed, items, n) {
  const proc = completed.size;
  const pend = n - proc;
  const { apt, dmg, gen } = countBucketsInSet(items, completed);

  document.getElementById("belt-stat-queue").textContent = String(pend);
  document.getElementById("belt-stat-wait").textContent =
    pend > 0 ? "Piezas pendientes / en curso" : "Lote vacío";
  document.getElementById("belt-stat-processed").textContent = String(proc);
  document.getElementById("belt-stat-apt").textContent = String(apt);
  document.getElementById("belt-stat-dmg").textContent = String(dmg);
  document.getElementById("belt-stat-gen").textContent = String(gen);

  if (proc <= 0) {
    setBeltRatioWidths(0, 0, 0);
  } else {
    setBeltRatioWidths((apt / proc) * 100, (dmg / proc) * 100, (gen / proc) * 100);
  }
}

/** SVG del icono de operario. */
function workerSvg() {
  return `<svg class="worker-icon" viewBox="0 0 48 56" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <circle cx="24" cy="14" r="9" fill="#30363d" stroke="#484f58" stroke-width="1.2" />
    <path d="M8 52 L8 38 Q8 26 24 24 Q40 26 40 38 L40 52 Z" fill="#21262d" stroke="#484f58" stroke-width="1.2" />
    <rect x="18" y="22" width="12" height="14" rx="2" fill="#0096d6" opacity="0.9" />
  </svg>`;
}

/** Muestra qué operario está clasificando cada pieza en el instante t. */
function renderOperatorsStrip(t, items, workers) {
  const wrap = document.getElementById("operators-strip");
  if (!wrap) return;
  wrap.innerHTML = "";
  for (let w = 0; w < workers; w += 1) {
    const active = items.find(
      (it) => it.worker === w && it.startSec <= t && it.endSec > t,
    );
    const slot = document.createElement("div");
    slot.className = `operator-slot${active ? " operator-slot--busy" : ""}`;
    slot.innerHTML = `
      <div class="operator-slot__fig">${workerSvg()}</div>
      <span class="operator-slot__id">${active ? `#${active.id}` : "—"}</span>
      <span class="operator-slot__op">Puesto ${w + 1}</span>
    `;
    wrap.appendChild(slot);
  }
}

/** Pausa de animación proporcional al salto de tiempo simulado. */
function delayForEventGap(deltaSec, baseDelayMs) {
  const scaled = Math.floor((baseDelayMs / 7) * Math.min(28, Math.max(0.35, deltaSec)));
  return effectiveStepDelayMs(Math.max(45, Math.min(960, scaled)));
}

/** Iconos de operarios en el panel lateral del formulario. */
function renderSidebarWorkerIcons(count) {
  const wrap = document.getElementById("workers-icons");
  if (!wrap) return;
  wrap.innerHTML = "";
  for (let i = 0; i < count; i += 1) {
    const d = document.createElement("span");
    d.className = "workers-ui__icon";
    d.innerHTML = workerSvg();
    d.title = `Operario ${i + 1}`;
    wrap.appendChild(d);
  }
  const lab = document.getElementById("workers-label");
  if (lab) lab.textContent = String(count);
  const hid = document.getElementById("workers-count");
  if (hid) hid.value = String(count);
  const opBadge = document.getElementById("operators-count-badge");
  if (opBadge) opBadge.textContent = `${count} op.`;
}

/** Clase CSS del tag tinta o tóner. */
function tipoClass(tipo) {
  return tipo === "Tinta" ? "tag tag--ink" : "tag tag--toner";
}

/** HTML del badge de aptitud en la tabla de resultados. */
function estadoTagHtml(item) {
  if (item.bucket === "original_apto") {
    return `<span class="tag tag--ok">${item.estado}</span>`;
  }
  if (item.bucket === "original_danado") {
    return `<span class="tag tag--warn">No apto · daño</span>`;
  }
  return `<span class="tag tag--bad">No apto · genérico</span>`;
}

/** Agrega una fila a la tabla de detalle (opcional flash). */
function appendResultRow(item, { flash }) {
  const tbody = document.getElementById("results-body");
  const tr = document.createElement("tr");
  if (flash) tr.classList.add("row--flash");
  tr.innerHTML = `
    <td>${item.id}</td>
    <td><span class="${tipoClass(item.tipo)}">${item.tipo}</span></td>
    <td>${item.originalidad}</td>
    <td>${item.integridad}</td>
    <td>${estadoTagHtml(item)}</td>
    <td>${formatSec(item.tiempoSec)}</td>
    <td class="td-op">${item.worker + 1}</td>
  `;
  tbody.appendChild(tr);
  if (flash) {
    requestAnimationFrame(() => {
      setTimeout(() => tr.classList.remove("row--flash"), 650);
    });
  }
}

/** Estado final: tabla completa, snapshot, KPIs y alerta 8 h. */
function finishSimulationUi(result) {
  const { items, makespanSec, counts, recoveryPct, n, workers } = result;
  const bar = document.getElementById("progress-bar");
  const text = document.getElementById("progress-text");
  const aria = document.getElementById("progress-aria");
  const badge = document.getElementById("progress-badge");
  const tbody = document.getElementById("results-body");

  tbody.innerHTML = "";
  for (const it of [...items].sort((a, b) => a.id - b.id)) {
    appendResultRow(it, { flash: false });
  }

  const completed = new Set(items.map((i) => i.id));
  const center = items.reduce((a, b) =>
    a.endSec > b.endSec || (a.endSec === b.endSec && a.id > b.id) ? a : b,
  );
  const recent = [...items]
    .sort((a, b) => b.endSec - a.endSec || b.id - a.id)
    .slice(0, 3);

  renderBeltParallel({ center, pending: [], recent });
  updateBeltStatsFromCompleted(completed, items, n);
  renderOperatorsStrip(makespanSec, items, workers);

  bar.style.width = "100%";
  aria.setAttribute("aria-valuenow", "100");
  text.textContent = `Completado: ${n} piezas · ${workers} operario(s) · Jornada ${formatJornada(makespanSec)}`;
  badge.textContent = "Finalizado";
  badge.className = "badge badge--done";

  const { recoveryInkPct, recoveryTonerPct, aptosTinta, aptosToner, danadoTinta, danadoToner, genericoTinta, genericoToner } = result;
  setKpis({ recoveryPct, recoveryInkPct, recoveryTonerPct, n, makespanSec });
  syncBottleneckAlert(makespanSec, workers);
  saveSimSnapshot({
    counts,
    recoveryPct,
    recoveryInkPct,
    recoveryTonerPct,
    aptosTinta,
    aptosToner,
    danadoTinta,
    danadoToner,
    genericoTinta,
    genericoToner,
    n,
    totalMinutes: makespanSec / 60,
    makespanSec,
    workers,
    seed: result.seed,
    savedAt: Date.now(),
  });
}

/** Reproduce la corrida en el tiempo simulado (cinta + tabla). */
async function runAnimatedSimulation(result, stepDelayMs, signal) {
  const { items, makespanSec, counts, recoveryPct, n, workers } = result;
  const bar = document.getElementById("progress-bar");
  const text = document.getElementById("progress-text");
  const aria = document.getElementById("progress-aria");
  const badge = document.getElementById("progress-badge");
  const tbody = document.getElementById("results-body");

  tbody.innerHTML = "";
  document.getElementById("belt-cells").innerHTML = "";
  badge.textContent = "En curso";
  badge.className = "badge badge--run";

  const endTimes = [...new Set(items.map((i) => i.endSec))].sort((a, b) => a - b);
  const completed = new Set();
  let prev = 0;

  renderOperatorsStrip(0, items, workers);

  for (const tEnd of endTimes) {
    if (signal?.aborted) break;

    const tView = prev === 0 ? 0 : (prev + tEnd) / 2;
    if (tEnd > prev) {
      renderOperatorsStrip(tView, items, workers);
      try {
        await waitMs(delayForEventGap(tEnd - prev, stepDelayMs), signal);
      } catch (err) {
        if (err?.name === "AbortError") break;
        throw err;
      }
    }

    if (signal?.aborted) break;

    const batch = items.filter((i) => i.endSec === tEnd).sort((a, b) => a.id - b.id);
    for (const it of batch) {
      appendResultRow(it, { flash: true });
      completed.add(it.id);
    }

    const center = batch.reduce((a, b) => (a.id > b.id ? a : b));
    const pending = items
      .filter((i) => !completed.has(i.id))
      .sort((a, b) => a.id - b.id)
      .slice(0, 3);
    const recent = items
      .filter((i) => completed.has(i.id))
      .sort((a, b) => b.endSec - a.endSec || b.id - a.id)
      .slice(0, 3);

    renderBeltParallel({ center, pending, recent });
    updateBeltStatsFromCompleted(completed, items, n);

    const proc = completed.size;
    const pct = Math.round((proc / n) * 100);
    bar.style.width = `${pct}%`;
    aria.setAttribute("aria-valuenow", String(pct));
    text.textContent = `Reloj ${formatSec(tEnd)} · ${proc}/${n} completadas · Jornada ${formatJornada(makespanSec)}`;

    renderOperatorsStrip(tEnd, items, workers);
    prev = tEnd;
  }

  if (signal?.aborted) {
    finishSimulationUi(result);
    return true;
  }

  finishSimulationUi(result);
  return true;
}

/** Imprime en consola las pruebas de promedios y frecuencia del MCM. */
function logPruebasEstadisticasEnConsola(seed) {
  if (!Number.isFinite(seed)) return;
  const validacion = validarGeneradorU01(seed, RNG_VALIDATION_N);
  console.group(`Pruebas estadísticas MCM — semilla ${seed} (n = ${RNG_VALIDATION_N})`);
  console.log("Promedios:", validacion.promedios);
  console.log("Frecuencia:", validacion.frecuencia);
  console.log(validacion.resumen);
  console.groupEnd();
}

document.getElementById("sim-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  simAbortController?.abort();
  simAbortController = new AbortController();
  const { signal } = simAbortController;

  setSimControlsRunning(true);

  const seed = Number(document.getElementById("seed").value);
  logPruebasEstadisticasEnConsola(seed);

  const pctInk = document.getElementById("pct-ink").value;
  const pctOrigInk = document.getElementById("pct-orig-ink").value;
  const pctOrigToner = document.getElementById("pct-orig-toner").value;
  const pctDmgInk = document.getElementById("pct-dmg-ink").value;
  const pctDmgToner = document.getElementById("pct-dmg-toner").value;
  const workers = document.getElementById("workers-count").value;

  const result = simulateBatch({
    seed,
    pctInk,
    pctOrigInk,
    pctOrigToner,
    pctDmgInk,
    pctDmgToner,
    workers,
  });

  const batchEl = document.getElementById("batch-size");
  if (batchEl) batchEl.value = String(result.n);

  setKpis({
    recoveryPct: result.recoveryPct,
    recoveryInkPct: result.recoveryInkPct,
    recoveryTonerPct: result.recoveryTonerPct,
    n: result.n,
    makespanSec: result.makespanSec,
  });

  const stepDelayMs = computeStepDelayMs(result.n);
  try {
    await runAnimatedSimulation(result, stepDelayMs, signal);
  } finally {
    simAbortController = null;
    setSimControlsRunning(false);
  }
});

document.getElementById("btn-skip").addEventListener("click", () => {
  simAbortController?.abort();
});

document.getElementById("btn-reset").addEventListener("click", () => {
  clearResultsUi();
});

document.getElementById("btn-speed-up").addEventListener("click", () => {
  cycleSimSpeed();
});

syncSpeedUi();

/** Sincroniza etiquetas % de los sliders con su valor. */
function bindRangeOutputs() {
  const pairs = [
    ["pct-ink", "pct-ink-out"],
    ["pct-orig-ink", "pct-orig-ink-out"],
    ["pct-orig-toner", "pct-orig-toner-out"],
    ["pct-dmg-ink", "pct-dmg-ink-out"],
    ["pct-dmg-toner", "pct-dmg-toner-out"],
  ];
  for (const [id, outId] of pairs) {
    const inp = document.getElementById(id);
    const out = document.getElementById(outId);
    if (!inp || !out) continue;
    /** Actualiza el output % del slider. */
    const sync = () => {
      out.textContent = `${inp.value}%`;
    };
    inp.addEventListener("input", sync);
    sync();
  }
}

/** Botones +/− de cantidad de operarios en el sidebar. */
function bindWorkersUi() {
  const hid = document.getElementById("workers-count");
  const down = document.getElementById("btn-workers-down");
  const up = document.getElementById("btn-workers-up");
  if (!hid || !down || !up) return;

  /** Lee operarios actuales (1–8). */
  const read = () => Math.min(MAX_WORKERS, Math.max(1, Number(hid.value) || 1));

  /** Aplica cantidad y refresca iconos del sidebar. */
  const apply = (raw) => {
    const v = Math.min(MAX_WORKERS, Math.max(1, Number(raw) || 1));
    hid.value = String(v);
    renderSidebarWorkerIcons(v);
  };

  down.addEventListener("click", () => apply(read() - 1));
  up.addEventListener("click", () => apply(read() + 1));
  apply(read());
}

bindRangeOutputs();
bindWorkersUi();
initRecoveryInfoModal();

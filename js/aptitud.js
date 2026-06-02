import { loadSimSnapshot } from "./simSnapshot.js";
import { initRecoveryInfoModal, syncRecoveryInfoBtn } from "./recoveryInfoUi.js";
import { initAptInfoModal, syncAptInfoBtn, syncDmgInfoBtn, syncGenInfoBtn } from "./aptInfoUi.js";
import { exportAptitudPdf, preloadAptitudPdfLogo } from "./aptitudPdf.js";
import { syncBottleneckAlert, hideBottleneckAlert } from "./bottleneckAlertUi.js";
import { formatJornada } from "./timeFormat.js";

let chartInstance = null;

/** Destruye la instancia anterior del gráfico Chart.js. */
function destroyChart() {
  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }
}

/** Dibuja la torta aptos / dañados / genéricos. */
function renderChart(counts) {
  const el = document.getElementById("chart-pie");
  if (!el || typeof Chart === "undefined") return;

  destroyChart();

  const data = {
    labels: [
      "Originales aptos (Sanos)",
      "Originales dañados (No apto · daño físico)",
      "Genéricos (No apto)",
    ],
    datasets: [
      {
        data: [
          counts.original_apto,
          counts.original_danado,
          counts.generico,
        ],
        backgroundColor: [
          "rgba(63, 185, 80, 0.88)",
          "rgba(227, 179, 65, 0.9)",
          "rgba(248, 81, 73, 0.88)",
        ],
        borderColor: "#161b22",
        borderWidth: 2,
        hoverOffset: 6,
      },
    ],
  };

  chartInstance = new Chart(el, {
    type: "pie",
    data,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            color: "#c9d1d9",
            boxWidth: 12,
            font: { family: "'DM Sans', sans-serif", size: 11 },
          },
        },
      },
    },
  });
}

/** Formatea un número como porcentaje con d decimales. */
function fmtPct(n, d) {
  if (!Number.isFinite(n)) return "—";
  return `${n.toFixed(d)} %`;
}

/** Habilita o deshabilita el botón de descarga PDF. */
function setPdfButtonEnabled(enabled) {
  const btn = document.getElementById("btn-aptitud-pdf");
  if (!btn) return;
  btn.disabled = !enabled;
  btn.setAttribute("aria-disabled", enabled ? "false" : "true");
}

/** Enlaza el clic del botón PDF a exportAptitudPdf. */
function initPdfDownload(snap) {
  const btn = document.getElementById("btn-aptitud-pdf");
  if (!btn) return;
  if (snap?.counts) preloadAptitudPdfLogo();
  btn.addEventListener("click", async () => {
    const current = loadSimSnapshot();
    if (!current?.counts) return;
    const wasEnabled = !btn.disabled;
    btn.disabled = true;
    try {
      await exportAptitudPdf(current);
    } finally {
      if (wasEnabled) setPdfButtonEnabled(true);
    }
  });
  setPdfButtonEnabled(Boolean(snap?.counts));
}

/** Carga el snapshot y pinta KPIs, gráfico y botones ℹ. */
function init() {
  const snap = loadSimSnapshot();
  const empty = document.getElementById("aptitud-empty");
  const content = document.getElementById("aptitud-content");
  const meta = document.getElementById("aptitud-meta");

  if (!snap || !snap.counts) {
    empty.hidden = false;
    content.hidden = true;
    setPdfButtonEnabled(false);
    syncAptInfoBtn({ active: false });
    syncDmgInfoBtn({ active: false });
    syncGenInfoBtn({ active: false });
    hideBottleneckAlert();
    return;
  }

  setPdfButtonEnabled(true);

  empty.hidden = true;
  content.hidden = false;

  const {
    counts,
    recoveryPct,
    recoveryInkPct,
    recoveryTonerPct,
    aptosTinta: snapAptosTinta,
    aptosToner: snapAptosToner,
    danadoTinta: snapDanadoTinta,
    danadoToner: snapDanadoToner,
    genericoTinta: snapGenericoTinta,
    genericoToner: snapGenericoToner,
    n,
    totalMinutes,
    makespanSec,
    workers,
    seed,
  } = snap;
  const ms = Number.isFinite(makespanSec) ? makespanSec : (totalMinutes || 0) * 60;
  const jornada = formatJornada(ms);
  const op = workers != null ? ` · ${workers} op.` : "";
  meta.textContent = `Última corrida · N = ${n} · Recuperación ${fmtPct(recoveryPct, 1)} · Jornada ${jornada}${op} · semilla ${seed ?? "—"}`;

  document.getElementById("kpi-recovery").textContent = fmtPct(recoveryPct, 1);
  const hasRecoveryBreakdown =
    Number.isFinite(recoveryInkPct) && Number.isFinite(recoveryTonerPct) && Number.isFinite(recoveryPct);
  if (hasRecoveryBreakdown) {
    syncRecoveryInfoBtn({
      recoveryPct,
      recoveryInkPct,
      recoveryTonerPct,
      n,
      active: true,
    });
  } else {
    syncRecoveryInfoBtn({ active: false });
  }
  document.getElementById("kpi-time").textContent = jornada;
  syncBottleneckAlert(ms, workers);
  document.getElementById("kpi-count").textContent = String(n);
  document.getElementById("kpi-apt").textContent = String(counts.original_apto);

  const aptosTotal = counts.original_apto;
  let aptosTinta = Number(snapAptosTinta);
  let aptosToner = Number(snapAptosToner);
  if (!Number.isFinite(aptosTinta) && Number.isFinite(recoveryInkPct) && n > 0) {
    aptosTinta = Math.round((recoveryInkPct / 100) * n);
  }
  if (!Number.isFinite(aptosToner) && Number.isFinite(recoveryTonerPct) && n > 0) {
    aptosToner = Math.round((recoveryTonerPct / 100) * n);
  }
  if (aptosTotal > 0 && Number.isFinite(aptosTinta) && Number.isFinite(aptosToner)) {
    syncAptInfoBtn({ aptosTinta, aptosToner, aptosTotal, active: true });
  } else {
    syncAptInfoBtn({ active: false });
  }

  document.getElementById("kpi-dmg").textContent = String(counts.original_danado);
  document.getElementById("kpi-gen").textContent = String(counts.generico);

  const danadoTotal = counts.original_danado;
  const danadoTinta = Number(snapDanadoTinta);
  const danadoToner = Number(snapDanadoToner);
  if (
    danadoTotal > 0 &&
    Number.isFinite(danadoTinta) &&
    Number.isFinite(danadoToner)
  ) {
    syncDmgInfoBtn({ danadoTinta, danadoToner, danadoTotal, active: true });
  } else {
    syncDmgInfoBtn({ active: false });
  }

  const genericoTotal = counts.generico;
  const genericoTinta = Number(snapGenericoTinta);
  const genericoToner = Number(snapGenericoToner);
  if (
    genericoTotal > 0 &&
    Number.isFinite(genericoTinta) &&
    Number.isFinite(genericoToner)
  ) {
    syncGenInfoBtn({ genericoTinta, genericoToner, genericoTotal, active: true });
  } else {
    syncGenInfoBtn({ active: false });
  }

  renderChart(counts);
}

init();
initPdfDownload(loadSimSnapshot());
initRecoveryInfoModal();
initAptInfoModal();

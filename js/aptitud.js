import { loadSimSnapshot } from "./simSnapshot.js";
import { initRecoveryInfoModal, syncRecoveryInfoBtn } from "./recoveryInfoUi.js";
import { initAptInfoModal, syncAptInfoBtn, syncDmgInfoBtn, syncGenInfoBtn } from "./aptInfoUi.js";

let chartInstance = null;

function destroyChart() {
  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }
}

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

function fmtPct(n, d) {
  if (!Number.isFinite(n)) return "—";
  return `${n.toFixed(d)} %`;
}

function init() {
  const snap = loadSimSnapshot();
  const empty = document.getElementById("aptitud-empty");
  const content = document.getElementById("aptitud-content");
  const meta = document.getElementById("aptitud-meta");

  if (!snap || !snap.counts) {
    empty.hidden = false;
    content.hidden = true;
    syncAptInfoBtn({ active: false });
    syncDmgInfoBtn({ active: false });
    syncGenInfoBtn({ active: false });
    return;
  }

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
  const jornada =
    ms < 60 ? `${Math.round(ms)} s` : ms < 600 ? `${(ms / 60).toFixed(1)} min` : `${Math.round(ms / 60)} min`;
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
initRecoveryInfoModal();
initAptInfoModal();

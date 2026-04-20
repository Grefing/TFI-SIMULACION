import { loadSimSnapshot } from "./simSnapshot.js";

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
    return;
  }

  empty.hidden = true;
  content.hidden = false;

  const { counts, recoveryPct, n, totalMinutes, makespanSec, workers, seed } = snap;
  const ms = Number.isFinite(makespanSec) ? makespanSec : (totalMinutes || 0) * 60;
  const jornada =
    ms < 60 ? `${Math.round(ms)} s` : ms < 600 ? `${(ms / 60).toFixed(1)} min` : `${Math.round(ms / 60)} min`;
  const op = workers != null ? ` · ${workers} op.` : "";
  meta.textContent = `Última corrida · N = ${n} · Recuperación ${fmtPct(recoveryPct, 1)} · Jornada ${jornada}${op} · semilla ${seed ?? "—"}`;

  document.getElementById("kpi-recovery").textContent = fmtPct(recoveryPct, 1);
  document.getElementById("kpi-time").textContent = jornada;
  document.getElementById("kpi-count").textContent = String(n);
  document.getElementById("kpi-apt").textContent = String(counts.original_apto);
  document.getElementById("kpi-dmg").textContent = String(counts.original_danado);
  document.getElementById("kpi-gen").textContent = String(counts.generico);

  renderChart(counts);
}

init();

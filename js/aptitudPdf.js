function fmtPct(n, digits = 1) {
  if (!Number.isFinite(n)) return "—";
  return `${n.toFixed(digits)} %`;
}

function fmtJornada(makespanSec, totalMinutes) {
  const ms = Number.isFinite(makespanSec) ? makespanSec : (totalMinutes || 0) * 60;
  if (ms < 60) return `${Math.round(ms)} s`;
  if (ms < 600) return `${(ms / 60).toFixed(1)} min`;
  return `${Math.round(ms / 60)} min`;
}

function pctOf(count, n) {
  if (!n || !Number.isFinite(count)) return "—";
  return fmtPct((count / n) * 100, 1);
}

function resolveAptosCounts(snap) {
  const { n, recoveryInkPct, recoveryTonerPct, aptosTinta, aptosToner, counts } = snap;
  let tinta = Number(aptosTinta);
  let toner = Number(aptosToner);
  if (!Number.isFinite(tinta) && Number.isFinite(recoveryInkPct) && n > 0) {
    tinta = Math.round((recoveryInkPct / 100) * n);
  }
  if (!Number.isFinite(toner) && Number.isFinite(recoveryTonerPct) && n > 0) {
    toner = Math.round((recoveryTonerPct / 100) * n);
  }
  return { tinta, toner, total: counts?.original_apto ?? 0 };
}

const TABLE_THEME = {
  theme: "striped",
  styles: { fontSize: 9, cellPadding: 2.5 },
  headStyles: { fillColor: [0, 102, 204], textColor: 255, fontStyle: "bold" },
  alternateRowStyles: { fillColor: [245, 247, 250] },
  margin: { left: 14, right: 14 },
};

const LOGO_PATH = "assets/logoHP.png";
const LOGO_SIZE_MM = 18;
const MARGIN_LEFT = 14;

let logoDataUrlCache = null;
let logoLoadPromise = null;

function loadLogoDataUrl() {
  if (logoDataUrlCache) return Promise.resolve(logoDataUrlCache);
  if (!logoLoadPromise) {
    logoLoadPromise = fetch(LOGO_PATH)
      .then((res) => {
        if (!res.ok) throw new Error(`Logo no encontrado (${res.status})`);
        return res.blob();
      })
      .then(
        (blob) =>
          new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(blob);
          }),
      )
      .then((url) => {
        logoDataUrlCache = url;
        return url;
      })
      .catch((err) => {
        logoLoadPromise = null;
        throw err;
      });
  }
  return logoLoadPromise;
}

/** Precarga el logo para acelerar la primera descarga. */
export function preloadAptitudPdfLogo() {
  return loadLogoDataUrl().catch(() => null);
}

/** @param {object | null} snap */
export async function exportAptitudPdf(snap) {
  if (!snap?.counts) return false;

  const jspdf = window.jspdf;
  if (!jspdf?.jsPDF) {
    console.error("jsPDF no está disponible.");
    return false;
  }

  const doc = new jspdf.jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  if (typeof doc.autoTable !== "function") {
    console.error("jspdf-autotable no está disponible.");
    return false;
  }

  const {
    counts,
    recoveryPct,
    recoveryInkPct,
    recoveryTonerPct,
    danadoTinta,
    danadoToner,
    genericoTinta,
    genericoToner,
    n,
    makespanSec,
    totalMinutes,
    workers,
    seed,
    savedAt,
  } = snap;

  const jornada = fmtJornada(makespanSec, totalMinutes);
  const when = savedAt
    ? new Date(savedAt).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })
    : new Date().toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
  const { tinta: aptosTinta, toner: aptosToner, total: aptosTotal } = resolveAptosCounts(snap);

  let logoUrl = null;
  try {
    logoUrl = await loadLogoDataUrl();
  } catch (err) {
    console.warn("No se pudo cargar el logo HP para el PDF.", err);
  }

  const headerTop = 10;
  const textX = logoUrl ? MARGIN_LEFT + LOGO_SIZE_MM + 5 : MARGIN_LEFT;

  if (logoUrl) {
    doc.addImage(logoUrl, "PNG", MARGIN_LEFT, headerTop, LOGO_SIZE_MM, LOGO_SIZE_MM);
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.text("HP Brasil — Desglose de aptitud", textX, logoUrl ? 17 : 16);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text("Logística inversa · Simulador de clasificación", textX, 23);

  let y = logoUrl ? headerTop + LOGO_SIZE_MM + 5 : 29;
  doc.setFontSize(9);
  doc.setTextColor(40, 40, 40);
  const meta = `Corrida: ${when} · N = ${n} · Semilla ${seed ?? "—"} · ${workers ?? "—"} operario(s) · Jornada ${jornada}`;
  doc.text(meta, MARGIN_LEFT, y, { maxWidth: 182 });

  y += 8;
  doc.autoTable({
    ...TABLE_THEME,
    startY: y,
    head: [["Indicador", "Valor"]],
    body: [
      ["Tasa de recuperación", fmtPct(recoveryPct, 1)],
      ["Tiempo total de jornada", jornada],
      ["Elementos del lote (N)", String(n)],
      ["Aptos (HP original sano)", String(counts.original_apto)],
      ["No apto · daño (HP original dañado)", String(counts.original_danado)],
      ["No apto · genérico", String(counts.generico)],
    ],
  });

  y = doc.lastAutoTable.finalY + 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text("Distribución por resultado", 14, y);

  y += 2;
  doc.autoTable({
    ...TABLE_THEME,
    startY: y,
    head: [["Categoría", "Unidades", "% del lote"]],
    body: [
      ["Originales aptos (sanos)", String(counts.original_apto), pctOf(counts.original_apto, n)],
      [
        "Originales dañados (no apto · daño)",
        String(counts.original_danado),
        pctOf(counts.original_danado, n),
      ],
      ["Genéricos (no apto)", String(counts.generico), pctOf(counts.generico, n)],
      ["Total", String(n), "100,0 %"],
    ],
  });

  y = doc.lastAutoTable.finalY + 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Desglose tinta / tóner", 14, y);

  y += 2;
  const breakdownRows = [
    [
      "Recuperación (% del lote)",
      Number.isFinite(recoveryInkPct) ? fmtPct(recoveryInkPct, 1) : "—",
      Number.isFinite(recoveryTonerPct) ? fmtPct(recoveryTonerPct, 1) : "—",
      Number.isFinite(recoveryPct) ? fmtPct(recoveryPct, 1) : "—",
    ],
  ];

  if (Number.isFinite(aptosTinta) && Number.isFinite(aptosToner)) {
    breakdownRows.push(
      ["Aptos (unidades)", String(aptosTinta), String(aptosToner), String(aptosTotal)],
      [
        "No apto · daño (unidades)",
        Number.isFinite(danadoTinta) ? String(danadoTinta) : "—",
        Number.isFinite(danadoToner) ? String(danadoToner) : "—",
        String(counts.original_danado),
      ],
      [
        "No apto · genérico (unidades)",
        Number.isFinite(genericoTinta) ? String(genericoTinta) : "—",
        Number.isFinite(genericoToner) ? String(genericoToner) : "—",
        String(counts.generico),
      ],
    );
  }

  doc.autoTable({
    ...TABLE_THEME,
    startY: y,
    head: [["Concepto", "Tinta (cartuchos)", "Tóner", "Total"]],
    body: breakdownRows,
  });

  y = doc.lastAutoTable.finalY + 10;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(
    "Generado por el simulador HP Brasil. Los porcentajes de recuperación son sobre el lote (N).",
    14,
    y,
    { maxWidth: 182 },
  );

  const seedPart = seed != null ? String(seed) : "sin-semilla";
  doc.save(`hp-aptitud-N${n}-semilla-${seedPart}.pdf`);
  return true;
}

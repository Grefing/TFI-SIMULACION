/** Botón ℹ + modal con desglose tinta / tóner (aptos, % del lote). */

let recoveryModalListenersBound = false;

function getRecoveryModalEls() {
  const root = document.getElementById("recovery-modal-root");
  if (!root) return null;
  return {
    root,
    lead: document.getElementById("recovery-modal-lead"),
    ink: document.getElementById("recovery-modal-ink"),
    toner: document.getElementById("recovery-modal-toner"),
    total: document.getElementById("recovery-modal-total"),
    nLine: document.getElementById("recovery-modal-n"),
  };
}

function openRecoveryModal({ recoveryPct, recoveryInkPct, recoveryTonerPct, n }) {
  const els = getRecoveryModalEls();
  if (!els) return;

  const inkStr = `${recoveryInkPct.toFixed(1)} %`;
  const tonerStr = `${recoveryTonerPct.toFixed(1)} %`;
  const totalStr = `${recoveryPct.toFixed(1)} %`;

  if (els.lead) {
    els.lead.textContent =
      "La tasa de recuperación son piezas HP originales y sanas (aptas), expresadas como porcentaje del lote. Desglose:";
  }
  if (els.ink) els.ink.textContent = inkStr;
  if (els.toner) els.toner.textContent = tonerStr;
  if (els.total) els.total.textContent = totalStr;
  if (els.nLine) {
    if (Number.isFinite(n) && n > 0) {
      els.nLine.hidden = false;
      els.nLine.textContent = `Lote analizado: N = ${n} unidades. Tinta + tóner (aptos) suman el total de recuperación.`;
    } else {
      els.nLine.hidden = true;
      els.nLine.textContent = "";
    }
  }

  els.root.hidden = false;
  els.root.setAttribute("aria-hidden", "false");
  document.body.classList.add("recovery-modal-open");

  const dialog = els.root.querySelector(".recovery-modal__dialog");
  if (dialog instanceof HTMLElement) {
    dialog.focus();
  }
}

function closeRecoveryModal() {
  const els = getRecoveryModalEls();
  if (!els) return;
  els.root.hidden = true;
  els.root.setAttribute("aria-hidden", "true");
  document.body.classList.remove("recovery-modal-open");
  const btn = document.getElementById("kpi-recovery-info");
  if (btn instanceof HTMLElement) btn.focus();
}

function onDocumentKeydown(e) {
  if (e.key !== "Escape") return;
  const root = document.getElementById("recovery-modal-root");
  if (!root || root.hidden) return;
  closeRecoveryModal();
}

/** Una vez por documento: botón abre modal; backdrop / cerrar / Escape cierran. */
export function initRecoveryInfoModal() {
  if (recoveryModalListenersBound) return;
  recoveryModalListenersBound = true;

  const root = document.getElementById("recovery-modal-root");
  if (!root) return;

  root.addEventListener("click", (e) => {
    const t = e.target;
    if (t instanceof Element && t.closest("[data-recovery-modal-close]")) {
      closeRecoveryModal();
    }
  });

  document.addEventListener("keydown", onDocumentKeydown);

  const btn = document.getElementById("kpi-recovery-info");
  btn?.addEventListener("click", () => {
    if (!btn || btn.classList.contains("kpi__info-btn--inactive")) return;
    const recoveryPct = Number(btn.dataset.recoveryTotalPct);
    const recoveryInkPct = Number(btn.dataset.recoveryInkPct);
    const recoveryTonerPct = Number(btn.dataset.recoveryTonerPct);
    const n = Number(btn.dataset.recoveryN);
    if (!Number.isFinite(recoveryPct)) return;
    openRecoveryModal({
      recoveryPct,
      recoveryInkPct: Number.isFinite(recoveryInkPct) ? recoveryInkPct : 0,
      recoveryTonerPct: Number.isFinite(recoveryTonerPct) ? recoveryTonerPct : 0,
      n: Number.isFinite(n) ? n : 0,
    });
  });
}

export function syncRecoveryInfoBtn({ recoveryPct = 0, recoveryInkPct = 0, recoveryTonerPct = 0, n = 0, active }) {
  const btn = document.getElementById("kpi-recovery-info");
  if (!btn) return;
  if (!active) {
    const root = document.getElementById("recovery-modal-root");
    if (root && !root.hidden) closeRecoveryModal();
    btn.removeAttribute("title");
    delete btn.dataset.recoveryTotalPct;
    delete btn.dataset.recoveryInkPct;
    delete btn.dataset.recoveryTonerPct;
    delete btn.dataset.recoveryN;
    btn.classList.add("kpi__info-btn--inactive");
    btn.setAttribute(
      "aria-label",
      "Desglose por tinta y tóner. Ejecutá una simulación para ver datos.",
    );
    return;
  }
  btn.classList.remove("kpi__info-btn--inactive");
  btn.dataset.recoveryTotalPct = String(recoveryPct);
  btn.dataset.recoveryInkPct = String(recoveryInkPct);
  btn.dataset.recoveryTonerPct = String(recoveryTonerPct);
  btn.dataset.recoveryN = String(n);
  btn.removeAttribute("title");
  btn.setAttribute("aria-label", "Abrir desglose de recuperación por tinta y tóner");
}

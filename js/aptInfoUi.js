let bucketModalListenersBound = false;
let lastBucketModalBtnId = null;

function getBucketModalEls() {
  const root = document.getElementById("bucket-modal-root");
  if (!root) return null;
  return {
    root,
    title: document.getElementById("bucket-modal-title"),
    lead: document.getElementById("bucket-modal-lead"),
    ink: document.getElementById("bucket-modal-ink"),
    toner: document.getElementById("bucket-modal-toner"),
    total: document.getElementById("bucket-modal-total"),
    totalLabel: document.getElementById("bucket-modal-total-label"),
    hint: document.getElementById("bucket-modal-hint"),
  };
}

function openBucketModal({
  title,
  lead,
  tinta,
  toner,
  total,
  totalLabel,
  hint,
  returnFocusId,
}) {
  const els = getBucketModalEls();
  if (!els) return;

  if (els.title) els.title.textContent = title;
  if (els.lead) els.lead.textContent = lead;
  if (els.ink) els.ink.textContent = String(tinta);
  if (els.toner) els.toner.textContent = String(toner);
  if (els.total) els.total.textContent = String(total);
  if (els.totalLabel) els.totalLabel.textContent = totalLabel;
  if (els.hint) els.hint.textContent = hint;

  lastBucketModalBtnId = returnFocusId;

  els.root.hidden = false;
  els.root.setAttribute("aria-hidden", "false");
  document.body.classList.add("recovery-modal-open");

  const dialog = els.root.querySelector(".recovery-modal__dialog");
  if (dialog instanceof HTMLElement) {
    dialog.focus();
  }
}

function closeBucketModal() {
  const els = getBucketModalEls();
  if (!els) return;
  els.root.hidden = true;
  els.root.setAttribute("aria-hidden", "true");
  document.body.classList.remove("recovery-modal-open");
  if (lastBucketModalBtnId) {
    const btn = document.getElementById(lastBucketModalBtnId);
    if (btn instanceof HTMLElement) btn.focus();
  }
}

function onDocumentKeydown(e) {
  if (e.key !== "Escape") return;
  const root = document.getElementById("bucket-modal-root");
  if (!root || root.hidden) return;
  closeBucketModal();
}

function handleBreakdownClick(btn) {
  if (!btn || btn.classList.contains("kpi__info-btn--inactive")) return;
  const total = Number(btn.dataset.bucketTotal);
  if (!Number.isFinite(total) || total <= 0) return;
  openBucketModal({
    title: btn.dataset.bucketTitle || "Desglose",
    lead: btn.dataset.bucketLead || "",
    tinta: Number(btn.dataset.bucketTinta) || 0,
    toner: Number(btn.dataset.bucketToner) || 0,
    total,
    totalLabel: btn.dataset.bucketTotalLabel || "Total",
    hint: btn.dataset.bucketHint || "",
    returnFocusId: btn.id,
  });
}

export function initAptInfoModal() {
  if (bucketModalListenersBound) return;
  bucketModalListenersBound = true;

  const root = document.getElementById("bucket-modal-root");
  if (!root) return;

  root.addEventListener("click", (e) => {
    const t = e.target;
    if (t instanceof Element && t.closest("[data-bucket-modal-close]")) {
      closeBucketModal();
    }
  });

  document.addEventListener("keydown", onDocumentKeydown);

  for (const id of ["kpi-apt-info", "kpi-dmg-info", "kpi-gen-info"]) {
    const btn = document.getElementById(id);
    btn?.addEventListener("click", () => handleBreakdownClick(btn));
  }
}

export function syncBucketBreakdownBtn(
  buttonId,
  {
    active,
    tinta = 0,
    toner = 0,
    total = 0,
    title = "Desglose",
    lead = "",
    totalLabel = "Total",
    hint = "Tinta + tóner suman el total indicado.",
    inactiveAriaLabel = "Desglose por tinta y tóner. Ejecutá una simulación para ver datos.",
    activeAriaLabel = "Abrir desglose por tinta y tóner",
  },
) {
  const btn = document.getElementById(buttonId);
  if (!btn) return;
  if (!active) {
    const root = document.getElementById("bucket-modal-root");
    if (root && !root.hidden && lastBucketModalBtnId === buttonId) {
      closeBucketModal();
    }
    delete btn.dataset.bucketTinta;
    delete btn.dataset.bucketToner;
    delete btn.dataset.bucketTotal;
    delete btn.dataset.bucketTitle;
    delete btn.dataset.bucketLead;
    delete btn.dataset.bucketTotalLabel;
    delete btn.dataset.bucketHint;
    btn.classList.add("kpi__info-btn--inactive");
    btn.setAttribute("aria-label", inactiveAriaLabel);
    return;
  }
  btn.classList.remove("kpi__info-btn--inactive");
  btn.dataset.bucketTinta = String(tinta);
  btn.dataset.bucketToner = String(toner);
  btn.dataset.bucketTotal = String(total);
  btn.dataset.bucketTitle = title;
  btn.dataset.bucketLead = lead;
  btn.dataset.bucketTotalLabel = totalLabel;
  btn.dataset.bucketHint = hint;
  btn.setAttribute("aria-label", activeAriaLabel);
}

export function syncAptInfoBtn({ aptosTinta = 0, aptosToner = 0, aptosTotal = 0, active }) {
  syncBucketBreakdownBtn("kpi-apt-info", {
    active,
    tinta: aptosTinta,
    toner: aptosToner,
    total: aptosTotal,
    title: "Desglose de aptos",
    lead: "Insumos HP originales y sanos (aptos). Desglose por tipo:",
    totalLabel: "Total aptos",
    hint: "Solo piezas HP originales y sanas. Tinta + tóner suman el total de aptos.",
    inactiveAriaLabel:
      "Desglose de aptos por tinta y tóner. Ejecutá una simulación para ver datos.",
    activeAriaLabel: "Abrir desglose de aptos por tinta y tóner",
  });
}

export function syncDmgInfoBtn({ danadoTinta = 0, danadoToner = 0, danadoTotal = 0, active }) {
  syncBucketBreakdownBtn("kpi-dmg-info", {
    active,
    tinta: danadoTinta,
    toner: danadoToner,
    total: danadoTotal,
    title: "Desglose no apto · daño",
    lead: "HP originales con daño físico (no aptos). Desglose por tipo:",
    totalLabel: "Total daño",
    hint: "Solo piezas HP originales dañadas. Tinta + tóner suman el total no apto por daño.",
    inactiveAriaLabel:
      "Desglose por daño: tinta y tóner. Ejecutá una simulación para ver datos.",
    activeAriaLabel: "Abrir desglose no apto por daño (tinta y tóner)",
  });
}

export function syncGenInfoBtn({ genericoTinta = 0, genericoToner = 0, genericoTotal = 0, active }) {
  syncBucketBreakdownBtn("kpi-gen-info", {
    active,
    tinta: genericoTinta,
    toner: genericoToner,
    total: genericoTotal,
    title: "Desglose no apto · genérico",
    lead: "Insumos no originales (genéricos). Desglose por tipo:",
    totalLabel: "Total genéricos",
    hint: "Solo piezas genéricas. Tinta + tóner suman el total no apto genérico.",
    inactiveAriaLabel:
      "Desglose genéricos: tinta y tóner. Ejecutá una simulación para ver datos.",
    activeAriaLabel: "Abrir desglose no apto genérico (tinta y tóner)",
  });
}

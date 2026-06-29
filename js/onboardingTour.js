import { driver } from "https://cdn.jsdelivr.net/npm/driver.js@1.3.1/+esm";

const TOUR_KEY_SIMULATOR = "hp-sim-onboarding-index-v1";
const TOUR_KEY_APTITUD = "hp-sim-onboarding-aptitud-v1";

const DRIVER_UI = {
  showProgress: true,
  progressText: "{{current}} de {{total}}",
  nextBtnText: "Siguiente",
  prevBtnText: "Anterior",
  doneBtnText: "Listo",
  popoverClass: "hp-driver-popover",
  stagePadding: 8,
  overlayColor: "#0d1117",
  overlayOpacity: 0.72,
};

const SIMULATOR_TOUR_STEPS = [
  {
    element: ".sidebar__brand",
    popover: {
      title: "Simulador de logística inversa",
      description:
        "Este panel simula la clasificación de cartuchos devueltos en Brasil. Acá configurás el lote y acá mismo ves el resultado en la cinta.",
      side: "right",
      align: "start",
    },
  },
  {
    element: "#seed",
    popover: {
      title: "Semilla (Seed)",
      description:
        "Entero ≥ 0. La misma semilla reproduce el mismo lote y los mismos resultados (reproducibilidad del generador).",
      side: "right",
    },
  },
  {
    element: ".workers-ui",
    popover: {
      title: "Operarios en paralelo",
      description:
        "Definí cuántos puestos de clasificación hay activos (1 a 8). Más operarios reducen el tiempo total de jornada.",
      side: "right",
    },
  },
  {
    element: "#pct-ink",
    popover: {
      title: "Probabilidades del lote",
      description:
        "Los sliders definen la mezcla tinta/tóner, cuántas piezas son HP originales y qué proporción llega con daño físico.",
      side: "right",
    },
  },
  {
    element: ".form__actions",
    popover: {
      title: "Acciones principales",
      description:
        "Ejecutar simulación inicia el paso a paso. Completar ahora salta la animación (se habilita durante la corrida). Limpiar vista reinicia la pantalla.",
      side: "right",
    },
  },
  {
    element: ".panel--progress",
    popover: {
      title: "Avance de clasificación",
      description:
        "Barra de progreso y estado de la corrida. El badge indica si está listo, en curso o finalizado.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: "#btn-speed-up",
    popover: {
      title: "Acelerar animación",
      description:
        "Multiplica la velocidad del paso a paso (×1 a ×8). Al llegar a ×8 vuelve a ×1.",
      side: "bottom",
    },
  },
  {
    element: "#operators-panel",
    popover: {
      title: "Puestos de clasificación",
      description:
        "Cada operario atiende una pieza a la vez. Con W operarios pueden clasificarse hasta W piezas en paralelo.",
      side: "bottom",
    },
  },
  {
    element: "#conveyor",
    popover: {
      title: "Cinta transportadora",
      description:
        "Visualización del lote: cola, piezas en tránsito y contadores por resultado (apto, daño, genérico). Los colores de la leyenda explican cada estado.",
      side: "top",
      align: "start",
    },
  },
  {
    element: ".panel--kpis",
    popover: {
      title: "Indicadores clave",
      description:
        "Tasa de recuperación, tiempo de jornada y cantidad procesada (N). El botón ℹ en recuperación muestra el desglose tinta/tóner tras ejecutar.",
      side: "top",
    },
  },
  {
    element: ".panel--detail",
    popover: {
      title: "Detalle por elemento",
      description:
        "Tabla con cada pieza del lote: tipo, originalidad, integridad y operario asignado. Desde acá también podés ir al desglose de aptitud.",
      side: "top",
      align: "start",
    },
  },
];

const APTITUD_TOUR_STEPS_EMPTY = [
  {
    element: ".page-aptitud__header",
    popover: {
      title: "Desglose de aptitud",
      description:
        "Esta página resume gráficamente el resultado de la última simulación ejecutada en el panel principal.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: "#aptitud-empty",
    popover: {
      title: "Sin datos todavía",
      description:
        "Ejecutá una simulación en el simulador y volvé acá para ver KPIs, gráfico de torta y exportar el informe PDF.",
      side: "bottom",
    },
  },
  {
    element: ".page-aptitud__nav",
    popover: {
      title: "Navegación",
      description: "Volvé al simulador con el enlace de la izquierda. Cuando haya datos, también podrás descargar el PDF.",
      side: "bottom",
      align: "end",
    },
  },
];

const APTITUD_TOUR_STEPS_FULL = [
  {
    element: ".page-aptitud__header",
    popover: {
      title: "Desglose de aptitud",
      description:
        "Resumen de la última corrida: KPIs, gráfico y exportación PDF. Los datos provienen de la simulación más reciente.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: "#btn-aptitud-pdf",
    popover: {
      title: "Descargar PDF",
      description: "Genera un informe con los resultados del lote simulado (KPIs y distribución por aptitud).",
      side: "bottom",
    },
  },
  {
    element: ".panel--aptitud-kpis",
    popover: {
      title: "Resumen del lote",
      description:
        "Indicadores de recuperación, jornada, N y conteos por resultado. Los botones ℹ abren desgloses tinta/tóner cuando hay datos.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: "#chart-pie",
    popover: {
      title: "Gráfico de distribución",
      description:
        "Torta con aptos (verde), dañados (amarillo) y genéricos (rojo) según la clasificación del lote.",
      side: "top",
    },
  },
  {
    element: ".page-aptitud__nav",
    popover: {
      title: "Volver al simulador",
      description: "Regresá al panel principal para cambiar parámetros y ejecutar otra corrida.",
      side: "bottom",
      align: "end",
    },
  },
];

/** Indica si el tour de una página aún no se completó. */
function shouldShowTour(storageKey) {
  try {
    return localStorage.getItem(storageKey) !== "done";
  } catch {
    return false;
  }
}

/** Marca el tour de una página como visto. */
function markTourDone(storageKey) {
  try {
    localStorage.setItem(storageKey, "done");
  } catch {
    /* storage no disponible */
  }
}

/** Filtra pasos cuyo elemento no existe en el DOM. */
function resolveSteps(steps) {
  return steps.filter((step) => {
    if (!step.element) return true;
    return Boolean(document.querySelector(step.element));
  });
}

/** Crea e inicia un tour de Driver.js. */
function runTour(steps, { markOnComplete = false, storageKey } = {}) {
  const resolved = resolveSteps(steps);
  if (!resolved.length) return null;

  const driverObj = driver({
    ...DRIVER_UI,
    steps: resolved,
    onDestroyed: () => {
      if (markOnComplete && storageKey) markTourDone(storageKey);
    },
  });

  driverObj.drive();
  return driverObj;
}

/** Tour del simulador (index.html). Auto-inicia la primera vez. */
export function initSimulatorTour() {
  const btn = document.getElementById("btn-tour");
  btn?.addEventListener("click", () => {
    runTour(SIMULATOR_TOUR_STEPS, { markOnComplete: false });
  });

  if (!shouldShowTour(TOUR_KEY_SIMULATOR)) return;

  requestAnimationFrame(() => {
    runTour(SIMULATOR_TOUR_STEPS, {
      markOnComplete: true,
      storageKey: TOUR_KEY_SIMULATOR,
    });
  });
}

/** Tour de aptitud (aptitud.html). Pasos según haya snapshot guardado. */
export function initAptitudTour({ hasData = false } = {}) {
  const steps = hasData ? APTITUD_TOUR_STEPS_FULL : APTITUD_TOUR_STEPS_EMPTY;

  const btn = document.getElementById("btn-tour");
  btn?.addEventListener("click", () => {
    runTour(steps, { markOnComplete: false });
  });

  if (!shouldShowTour(TOUR_KEY_APTITUD)) return;

  requestAnimationFrame(() => {
    runTour(steps, {
      markOnComplete: true,
      storageKey: TOUR_KEY_APTITUD,
    });
  });
}

/* ═══════════════════════════════════════════════
   TGWL — components/charts.js
   Chart.js Wrappers
═══════════════════════════════════════════════ */

const CHART_DEFAULTS = {
  responsive:          true,
  maintainAspectRatio: true,
  animation:           { duration: 600, easing: 'easeInOutQuart' },
  plugins: {
    legend: {
      display: true,
      labels: { color: '#a7a7a7', font: { family: 'system-ui', size: 11 }, boxWidth: 12 },
    },
    tooltip: {
      backgroundColor: 'rgba(0,0,0,0.85)',
      titleColor: '#ffffff',
      bodyColor: '#a7a7a7',
      borderColor: 'rgba(255,255,255,0.1)',
      borderWidth: 1,
      padding: 10,
      cornerRadius: 10,
    },
  },
};

const GRID = {
  color:     'rgba(255,255,255,0.05)',
  borderColor: 'rgba(255,255,255,0.08)',
};
const TICK = { color: '#555', font: { size: 10 } };

// ── Store references for cleanup ──────────────
const chartInstances = new Map();

function destroyChart(id) {
  if (chartInstances.has(id)) {
    chartInstances.get(id).destroy();
    chartInstances.delete(id);
  }
}

// ── Line Chart ────────────────────────────────
export function createLineChart(canvasId, labels, datasets, options = {}) {
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId)?.getContext('2d');
  if (!ctx) return null;

  const chart = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets },
    options: {
      ...CHART_DEFAULTS,
      scales: {
        x: { grid: GRID, ticks: TICK },
        y: {
          grid: GRID,
          ticks: { ...TICK, ...(options.yTickCb ? { callback: options.yTickCb } : {}) },
          beginAtZero: options.beginAtZero || false,
        },
      },
      plugins: {
        ...CHART_DEFAULTS.plugins,
        legend: { display: datasets.length > 1, labels: CHART_DEFAULTS.plugins.legend.labels },
      },
      ...options.overrides,
    },
  });

  chartInstances.set(canvasId, chart);
  return chart;
}

// ── Bar Chart ─────────────────────────────────
export function createBarChart(canvasId, labels, datasets, options = {}) {
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId)?.getContext('2d');
  if (!ctx) return null;

  const chart = new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets },
    options: {
      ...CHART_DEFAULTS,
      scales: {
        x: { grid: { display: false }, ticks: TICK },
        y: { grid: GRID, ticks: TICK, beginAtZero: true },
      },
      ...options.overrides,
    },
  });

  chartInstances.set(canvasId, chart);
  return chart;
}

// ── Doughnut Chart ────────────────────────────
export function createDoughnutChart(canvasId, labels, data, colors, options = {}) {
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId)?.getContext('2d');
  if (!ctx) return null;

  const chart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{ data, backgroundColor: colors, borderWidth: 0, spacing: 2 }],
    },
    options: {
      ...CHART_DEFAULTS,
      cutout: '70%',
      plugins: {
        ...CHART_DEFAULTS.plugins,
        legend: { display: true, position: 'bottom', labels: CHART_DEFAULTS.plugins.legend.labels },
      },
      ...options.overrides,
    },
  });

  chartInstances.set(canvasId, chart);
  return chart;
}

// ── Dataset builders ──────────────────────────
export function lineDataset(label, data, color = '#19f9f9', options = {}) {
  return {
    label,
    data,
    borderColor:     color,
    backgroundColor: hexToRgba(color, 0.1),
    borderWidth:     2.5,
    pointRadius:     4,
    pointHoverRadius: 6,
    pointBackgroundColor: color,
    pointBorderColor: 'transparent',
    tension:         0.4,
    fill:            options.fill !== undefined ? options.fill : true,
    ...options,
  };
}

export function barDataset(label, data, color = '#940a0a', options = {}) {
  return {
    label,
    data,
    backgroundColor: hexToRgba(color, 0.7),
    borderRadius:    6,
    borderColor:     'transparent',
    ...options,
  };
}

// ── Gradient fill helper ──────────────────────
export function createGradient(ctx, color, alpha1 = 0.4, alpha2 = 0.01) {
  const gradient = ctx.createLinearGradient(0, 0, 0, 300);
  gradient.addColorStop(0, hexToRgba(color, alpha1));
  gradient.addColorStop(1, hexToRgba(color, alpha2));
  return gradient;
}

// ── Weight progress chart ─────────────────────
export function renderWeightChart(canvasId, data = []) {
  if (!data.length) return;
  const labels   = data.map(d => d.date);
  const weights  = data.map(d => d.weight);
  const datasets = [lineDataset('Peso (kg)', weights, '#19f9f9')];
  createLineChart(canvasId, labels, datasets, { beginAtZero: false });
}

// ── Body fat chart ────────────────────────────
export function renderBodyFatChart(canvasId, data = []) {
  if (!data.length) return;
  const labels   = data.map(d => d.date);
  const fatData  = data.map(d => d.fatPercent);
  const muscleData = data.map(d => d.musclePercent);
  const datasets = [
    lineDataset('% Grasa', fatData,   '#ef4444'),
    lineDataset('% Músculo', muscleData, '#22c55e'),
  ];
  createLineChart(canvasId, labels, datasets, { beginAtZero: false });
}

// ── Workout intensity chart ───────────────────
export function renderWorkoutChart(canvasId, sessions = []) {
  if (!sessions.length) return;
  const labels   = sessions.map(s => s.date);
  const rpeData  = sessions.map(s => s.rpe || 0);
  const durationData = sessions.map(s => Math.round(s.durationMs / 60000));
  createBarChart(canvasId, labels, [
    barDataset('RPE', rpeData, '#940a0a'),
    barDataset('Duración (min)', durationData, '#19f9f9'),
  ]);
}

// ── Body composition doughnut ─────────────────
export function renderCompositionChart(canvasId, fat = 0, muscle = 0, other = 0) {
  createDoughnutChart(
    canvasId,
    ['% Grasa', '% Músculo', 'Otros'],
    [fat, muscle, other],
    ['rgba(239,68,68,0.8)', 'rgba(34,197,94,0.8)', 'rgba(107,114,128,0.5)'],
  );
}

// ── Skinfolds radar / bar chart ───────────────
export function renderSkinfoldChart(canvasId, data = {}) {
  const labels = Object.keys(data);
  const values = Object.values(data);
  createBarChart(canvasId, labels, [barDataset('Pliegues (mm)', values, '#f59e0b')]);
}

// ── Perimetral measurements ───────────────────
export function renderPerimetralsChart(canvasId, data = []) {
  if (!data.length) return;
  const labels   = data.map(d => d.date);
  const waist    = data.map(d => d.waist);
  const hip      = data.map(d => d.hip);
  const chest    = data.map(d => d.chest);
  createLineChart(canvasId, labels, [
    lineDataset('Cintura', waist, '#f59e0b'),
    lineDataset('Cadera',  hip,   '#a855f7'),
    lineDataset('Pecho',   chest, '#3b82f6'),
  ]);
}

// ── Destroy all charts (on page unload) ──────
export function destroyAllCharts() {
  chartInstances.forEach(chart => chart.destroy());
  chartInstances.clear();
}

// ── Utils ─────────────────────────────────────
function hexToRgba(hex, alpha = 1) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

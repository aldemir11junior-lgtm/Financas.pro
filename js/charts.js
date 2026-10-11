// ─────────────────────────────────────────────────────────────────────────
// GRÁFICOS (Chart.js) — equivalentes aos gráficos Plotly do app original
// ─────────────────────────────────────────────────────────────────────────
const CHART_REGISTRY = {};
Chart.defaults.font.family = "'Inter', sans-serif";
Chart.defaults.color = '#1a6645';

const rotulosValorPlugin = {
  id: 'rotulosValor',
  afterDatasetsDraw(chart, args, options) {
    if (!options.display) return;
    const { ctx, chartArea } = chart;
    ctx.save();
    ctx.font = `600 ${options.fontSize || 10}px Inter, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = corTexto();
    ctx.strokeStyle = STATE.temaEscuro ? '#122a1e' : '#fff';
    ctx.lineWidth = 3;

    chart.data.datasets.forEach((dataset, datasetIndex) => {
      if (!chart.isDatasetVisible(datasetIndex) || options.skipDatasetIndices?.includes(datasetIndex)) return;
      const meta = chart.getDatasetMeta(datasetIndex);
      meta.data.forEach((element, index) => {
        const value = dataset.data[index];
        if (!Number.isFinite(value) || value === 0) return;
        const position = element.getProps(['x', 'y', 'base'], true);
        if (meta.indexAxis === 'y') {
          let x = position.x + 8;
          ctx.textAlign = 'left';
          if (x > chartArea.right - 30) {
            x = position.x - 8;
            ctx.textAlign = 'right';
          }
          const text = options.formatter ? options.formatter(value, datasetIndex) : valorEixo(value);
          ctx.strokeText(text, x, position.y);
          ctx.fillText(text, x, position.y);
          return;
        }
        let y;
        if (meta.type === 'bar' && options.position === 'center') {
          y = (position.y + position.base) / 2;
        } else {
          y = meta.type === 'bar'
            ? (value >= 0 ? position.y - 9 : position.y + 9)
            : position.y - 12;
          if (y < chartArea.top + 7) y = position.y + 12;
        }
        if (y < chartArea.top + 5 || y > chartArea.bottom - 5) return;
        const text = options.formatter ? options.formatter(value, datasetIndex) : fmtBRL(value);
        ctx.strokeText(text, position.x, y);
        ctx.fillText(text, position.x, y);
      });
    });
    ctx.restore();
  },
};
Chart.register(rotulosValorPlugin);

function valorEixo(v) {
  const abs = Math.abs(v);
  if (abs >= 1000000) return `R$ ${(v / 1000000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`;
  if (abs >= 1000) return `R$ ${(v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil`;
  return `R$ ${v.toLocaleString('pt-BR')}`;
}

function destruirGrafico(id) {
  if (CHART_REGISTRY[id]) { CHART_REGISTRY[id].destroy(); delete CHART_REGISTRY[id]; }
}
function corGrid() {
  return STATE.temaEscuro ? 'rgba(255,255,255,0.06)' : '#eef5f1';
}
function corTexto() {
  return STATE.temaEscuro ? '#a8f0c8' : '#1a6645';
}

function graficoEvolucaoMensal(canvasId, labels, receitas, despesas, saldo) {
  destruirGrafico(canvasId);
  const ctx = qs('#' + canvasId).getContext('2d');
  CHART_REGISTRY[canvasId] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Receita', data: receitas, backgroundColor: '#059669', borderRadius: 5, maxBarThickness: 34 },
        { label: 'Despesa', data: despesas, backgroundColor: '#dc2626', borderRadius: 5, maxBarThickness: 34 },
        { label: 'Saldo', data: saldo, backgroundColor: '#f59e0b', borderRadius: 5, maxBarThickness: 34 },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        rotulosValor: { display: true, position: 'center', formatter: value => valorEixo(value), fontSize: 9 },
        legend: { position: 'bottom', labels: { color: corTexto(), usePointStyle: true, padding: 18 } },
        tooltip: { callbacks: { label: c => `${c.dataset.label}: ${fmtBRL(c.parsed.y)}` } },
      },
      scales: {
        y: { beginAtZero: true, stacked: true, ticks: { color: corTexto(), callback: valorEixo }, grid: { color: corGrid() } },
        x: { stacked: true, ticks: { color: corTexto(), maxRotation: 0 }, grid: { display: false } },
      },
    },
  });
}

function graficoDespesasPorGrupo(canvasId, grupos, valores) {
  destruirGrafico(canvasId);
  const ctx = qs('#' + canvasId).getContext('2d');
  const coresPontos = grupos.map((_, index) => {
    const t = index / Math.max(grupos.length - 1, 1);
    const r = Math.round(127 + t * (254 - 127));
    const g = Math.round(29 + t * (202 - 29));
    const b = Math.round(29 + t * (202 - 29));
    return `rgb(${r},${g},${b})`;
  });
  CHART_REGISTRY[canvasId] = new Chart(ctx, {
    type: 'line',
    data: {
      labels: grupos,
      datasets: [{
        label: 'Despesas por grupo',
        data: valores,
        borderColor(context) {
          const { chart } = context;
          if (!chart.chartArea) return '#b91c1c';
          const gradient = chart.ctx.createLinearGradient(chart.chartArea.left, 0, chart.chartArea.right, 0);
          gradient.addColorStop(0, '#7f1d1d');
          gradient.addColorStop(0.55, '#dc2626');
          gradient.addColorStop(1, '#fecaca');
          return gradient;
        },
        backgroundColor: coresPontos,
        borderWidth: 3,
        borderDash: [6, 5],
        tension: 0.42,
        pointRadius: 5,
        pointHoverRadius: 7,
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        fill: false,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        rotulosValor: { display: true, formatter: valorEixo, fontSize: 10 },
        legend: { display: false },
        tooltip: { callbacks: { label: context => fmtBRL(context.parsed.y) } },
      },
      scales: {
        y: { beginAtZero: true, ticks: { color: corTexto(), callback: valorEixo }, grid: { color: corGrid() } },
        x: { ticks: { color: corTexto(), maxRotation: 25, minRotation: 0 }, grid: { display: false } },
      },
    },
  });
}

function graficoPareto(canvasId, categorias, valores, acumuladoPct) {
  destruirGrafico(canvasId);
  const ctx = qs('#' + canvasId).getContext('2d');
  const n = categorias.length;
  const cores = categorias.map((_, i) => {
    const t = i / Math.max(n - 1, 1);
    const r = Math.round(5 + t * (16 - 5)), g = Math.round(150 + t * (185 - 150)), b = Math.round(105 + t * (129 - 105));
    return `rgba(${r},${g},${b},0.88)`;
  });
  CHART_REGISTRY[canvasId] = new Chart(ctx, {
    data: {
      labels: categorias,
      datasets: [
        { type: 'bar', label: 'Valor (R$)', data: valores, backgroundColor: cores, yAxisID: 'y' },
        { type: 'line', label: '% Acumulado', data: acumuladoPct, borderColor: '#f59e0b', backgroundColor: '#f59e0b', borderWidth: 3, yAxisID: 'y2', tension: 0.3, pointRadius: 4, pointHoverRadius: 6 },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        rotulosValor: { display: true, skipDatasetIndices: [1], fontSize: 9, formatter: valorEixo },
        legend: { position: 'bottom', labels: { color: corTexto(), usePointStyle: true, padding: 18 } },
        tooltip: { callbacks: { label: c => c.dataset.yAxisID === 'y2' ? `Acumulado: ${c.parsed.y.toFixed(1)}%` : fmtBRL(c.parsed.y) } },
      },
      scales: {
        y: { position: 'left', beginAtZero: true, ticks: { color: corTexto(), callback: valorEixo }, grid: { color: corGrid() } },
        y2: { position: 'right', min: 0, max: 100, ticks: { color: corTexto(), callback: v => v + '%' }, grid: { display: false } },
        x: { ticks: { color: corTexto(), maxRotation: 25, minRotation: 0 }, grid: { display: false } },
      },
    },
  });
}

function graficoBarraHorizontal(canvasId, labels, valores, corBase) {
  destruirGrafico(canvasId);
  const ctx = qs('#' + canvasId).getContext('2d');
  const n = labels.length;
  const cores = labels.map((_, i) => {
    const t = i / Math.max(n - 1, 1);
    if (corBase === 'vermelho') {
      const r = Math.round(127 + t * (254 - 127)), g = Math.round(29 + t * (202 - 29)), b = Math.round(29 + t * (202 - 29));
      return `rgb(${r},${g},${b})`;
    }
    return '#00704A';
  });
  CHART_REGISTRY[canvasId] = new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets: [{ label: 'Valor', data: valores, backgroundColor: cores }] },
    options: {
      indexAxis: 'y', responsive: true, maintainAspectRatio: false,
      plugins: {
        rotulosValor: { display: true, formatter: valorEixo, fontSize: 9 },
        legend: { display: false },
        tooltip: { callbacks: { label: c => fmtBRL(c.parsed.x) } },
      },
      layout: { padding: { right: 48 } },
      scales: {
        x: { beginAtZero: true, ticks: { color: corTexto(), callback: valorEixo }, grid: { color: corGrid() } },
        y: { ticks: { color: corTexto() }, grid: { display: false } },
      },
    },
  });
}

function graficoBarraVertical(canvasId, labels, valores, cor) {
  destruirGrafico(canvasId);
  const ctx = qs('#' + canvasId).getContext('2d');
  CHART_REGISTRY[canvasId] = new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets: [{ label: 'Valor', data: valores, backgroundColor: cor || '#00704A' }] },
    options: {
      responsive: true,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => fmtBRL(c.parsed.y) } } },
      scales: {
        y: { ticks: { color: corTexto(), callback: v => 'R$ ' + v.toLocaleString('pt-BR') }, grid: { color: corGrid() } },
        x: { ticks: { color: corTexto() }, grid: { display: false } },
      },
    },
  });
}

function graficoDonut(canvasId, labels, valores, cores) {
  destruirGrafico(canvasId);
  const ctx = qs('#' + canvasId).getContext('2d');
  CHART_REGISTRY[canvasId] = new Chart(ctx, {
    type: 'doughnut',
    data: { labels, datasets: [{ data: valores, backgroundColor: cores }] },
    options: {
      responsive: true, cutout: '65%',
      plugins: { legend: { position: 'bottom', labels: { color: corTexto() } },
        tooltip: { callbacks: { label: c => `${c.label}: ${fmtBRL(c.parsed)}` } } },
    },
  });
}

function graficoLinhaArea(canvasId, labels, valores, positivo) {
  destruirGrafico(canvasId);
  const ctx = qs('#' + canvasId).getContext('2d');
  const cor = positivo ? '#05C47A' : '#c0392b';
  const fill = positivo ? 'rgba(5,196,122,0.12)' : 'rgba(192,57,43,0.10)';
  CHART_REGISTRY[canvasId] = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets: [{ label: 'Saldo acumulado', data: valores, borderColor: cor, backgroundColor: fill, fill: true, tension: 0.25, pointRadius: 0 }] },
    options: {
      responsive: true,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => fmtBRL(c.parsed.y) } } },
      scales: {
        y: { ticks: { color: corTexto(), callback: v => 'R$ ' + v.toLocaleString('pt-BR') }, grid: { color: corGrid() } },
        x: { ticks: { color: corTexto(), maxTicksLimit: 8 }, grid: { display: false } },
      },
    },
  });
}

function graficoProjecao(canvasId, categorias, planejado, real, limite) {
  destruirGrafico(canvasId);
  const ctx = qs('#' + canvasId).getContext('2d');
  const datasets = [
    { type: 'bar', label: 'Planejado', data: planejado, backgroundColor: '#4dc882' },
  ];
  if (real.some(v => v > 0)) datasets.push({ type: 'bar', label: 'Já gasto', data: real, backgroundColor: '#c0392b' });
  if (limite.some(v => v > 0)) datasets.push({ type: 'line', label: 'Limite definido', data: limite, borderColor: '#f1c40f', backgroundColor: '#f1c40f', pointStyle: 'line', showLine: false, pointRadius: 10, borderWidth: 3 });
  CHART_REGISTRY[canvasId] = new Chart(ctx, {
    data: { labels: categorias, datasets },
    options: {
      responsive: true,
      plugins: { legend: { position: 'bottom', labels: { color: corTexto() } }, tooltip: { callbacks: { label: c => `${c.dataset.label}: ${fmtBRL(c.parsed.y)}` } } },
      scales: {
        y: { ticks: { color: corTexto(), callback: v => 'R$ ' + v.toLocaleString('pt-BR') }, grid: { color: corGrid() } },
        x: { ticks: { color: corTexto() }, grid: { display: false } },
      },
    },
  });
}

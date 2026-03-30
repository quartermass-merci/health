// weight.js — Weight input, stats, and Chart.js graph with inline insights

import { getToday, saveToday, getProfile, getAllWeights } from './store.js';
import { getWeightInsight, getWeightStats } from './insights.js';
import { showInlineInsight } from './app.js';

let weightChart = null;

export function initWeight() {
  renderWeightStats();
  renderWeightChart();
  bindWeightInput();
}

function bindWeightInput() {
  const input = document.getElementById('weight-input');
  const btn = document.getElementById('weight-log');

  const today = getToday();
  if (today.weight !== null) {
    input.value = today.weight;
  }

  btn.onclick = () => {
    const val = parseFloat(input.value);
    if (!val || val < 50 || val > 999) return;

    const today = getToday();
    const profile = getProfile();
    today.weight = val;
    saveToday(today);

    renderWeightStats();
    renderWeightChart();
    showInlineInsight('weight-insight-slot', getWeightInsight(today, profile));
  };

  input.onkeydown = (e) => {
    if (e.key === 'Enter') btn.click();
  };
}

function renderWeightStats() {
  const today = getToday();
  const profile = getProfile();
  const statsEl = document.getElementById('weight-stats');

  if (today.weight === null) {
    statsEl.classList.add('hidden');
    return;
  }

  const stats = getWeightStats(today, profile);
  statsEl.classList.remove('hidden');

  let html = '';

  if (stats.lastDelta !== null) {
    const cls = stats.lastDelta > 0 ? 'positive' : stats.lastDelta < 0 ? 'negative' : 'neutral';
    const sign = stats.lastDelta > 0 ? '-' : stats.lastDelta < 0 ? '+' : '';
    html += `<div class="weight-stat">
      <div class="weight-stat-value ${cls}">${sign}${Math.abs(stats.lastDelta).toFixed(1)}</div>
      <div class="weight-stat-label">Since last</div>
    </div>`;
  }

  if (stats.sevenDayAvg !== null) {
    html += `<div class="weight-stat">
      <div class="weight-stat-value">${stats.sevenDayAvg.toFixed(1)}</div>
      <div class="weight-stat-label">7-day avg</div>
    </div>`;
  }

  const lostCls = stats.totalLost > 0 ? 'positive' : 'neutral';
  html += `<div class="weight-stat">
    <div class="weight-stat-value ${lostCls}">${stats.totalLost.toFixed(1)}</div>
    <div class="weight-stat-label">Total lost</div>
  </div>`;

  html += `<div class="weight-stat">
    <div class="weight-stat-value">${stats.remaining.toFixed(1)}</div>
    <div class="weight-stat-label">To ${profile.goalWeight}</div>
  </div>`;

  if (stats.predictedDate) {
    html += `<div class="weight-stat" style="grid-column: 1 / -1;">
      <div class="weight-stat-value text-accent">${stats.predictedDate}</div>
      <div class="weight-stat-label">Predicted goal date</div>
    </div>`;
  }

  statsEl.innerHTML = html;
}

function renderWeightChart() {
  const weights = getAllWeights();
  const profile = getProfile();
  if (weights.length < 2) return;

  const canvas = document.getElementById('weight-chart');
  const ctx = canvas.getContext('2d');

  const labels = weights.map(w => {
    const d = new Date(w.date + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  });
  const data = weights.map(w => w.weight);

  const sma = [];
  for (let i = 0; i < data.length; i++) {
    const window = data.slice(Math.max(0, i - 6), i + 1);
    sma.push(window.reduce((a, b) => a + b, 0) / window.length);
  }

  if (weightChart) weightChart.destroy();

  weightChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Weight',
          data,
          borderColor: '#9b9890',
          backgroundColor: 'transparent',
          borderWidth: 1.5,
          pointRadius: 2.5,
          pointBackgroundColor: '#e8e6e1',
          tension: 0.1,
          fill: false
        },
        {
          label: '7-Day Avg',
          data: sma,
          borderColor: '#d4a057',
          borderWidth: 2,
          borderDash: [4, 4],
          pointRadius: 0,
          tension: 0.3,
          fill: false
        },
        {
          label: 'Goal',
          data: new Array(data.length).fill(profile.goalWeight),
          borderColor: 'rgba(124, 184, 122, 0.4)',
          borderWidth: 1,
          borderDash: [8, 4],
          pointRadius: 0,
          fill: false
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 1200,
        easing: 'easeOutQuart',
        delay: (ctx) => ctx.dataIndex * 40 + (ctx.datasetIndex * 200)
      },
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          display: true,
          labels: { color: '#5e5d58', font: { size: 9 }, boxWidth: 10, padding: 6 }
        },
        tooltip: {
          backgroundColor: '#1c1c1a',
          titleColor: '#e8e6e1',
          bodyColor: '#9b9890',
          borderColor: '#252523',
          borderWidth: 1,
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y.toFixed(1)} lbs`
          }
        }
      },
      scales: {
        x: {
          ticks: { color: '#5e5d58', font: { size: 9 }, maxRotation: 45 },
          grid: { color: 'rgba(94, 93, 88, 0.1)' }
        },
        y: {
          ticks: { color: '#5e5d58', font: { size: 9 } },
          grid: { color: 'rgba(94, 93, 88, 0.1)' },
          suggestedMin: profile.goalWeight - 5,
          suggestedMax: profile.startWeight + 5
        }
      }
    }
  });
}

export function getWeightSummary() {
  const today = getToday();
  const profile = getProfile();
  if (!profile) return { text: 'Not logged', totalLost: 0 };
  if (today.weight === null) return { text: 'Not logged', totalLost: profile.startWeight - (getAllWeights().slice(-1)[0]?.weight ?? profile.startWeight) };
  return {
    text: `${today.weight} lbs`,
    totalLost: profile.startWeight - today.weight
  };
}

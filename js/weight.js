// weight.js — Weight input, stats, and Chart.js graph

import { getToday, saveToday, getProfile, getAllWeights } from './store.js';
import { getWeightInsight, getWeightStats } from './insights.js';
import { showInsight } from './app.js';

let weightChart = null;

export function initWeight() {
  renderWeightStats();
  renderWeightChart();
  bindWeightInput();
}

function bindWeightInput() {
  const input = document.getElementById('weight-input');
  const btn = document.getElementById('weight-log');

  // Pre-fill with today's weight if already logged
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
    showInsight(getWeightInsight(today, profile), '⚖️');
  };

  // Also log on Enter
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

  // Last delta
  if (stats.lastDelta !== null) {
    const cls = stats.lastDelta > 0 ? 'positive' : stats.lastDelta < 0 ? 'negative' : 'neutral';
    const sign = stats.lastDelta > 0 ? '-' : stats.lastDelta < 0 ? '+' : '';
    html += `<div class="weight-stat">
      <div class="weight-stat-value ${cls}">${sign}${Math.abs(stats.lastDelta).toFixed(1)} lbs</div>
      <div class="weight-stat-label">Since Last Weigh-in</div>
    </div>`;
  }

  // 7-day avg
  if (stats.sevenDayAvg !== null) {
    html += `<div class="weight-stat">
      <div class="weight-stat-value">${stats.sevenDayAvg.toFixed(1)}</div>
      <div class="weight-stat-label">7-Day Average</div>
    </div>`;
  }

  // Total lost
  const lostCls = stats.totalLost > 0 ? 'positive' : 'neutral';
  html += `<div class="weight-stat">
    <div class="weight-stat-value ${lostCls}">${stats.totalLost.toFixed(1)} lbs</div>
    <div class="weight-stat-label">Total Lost from ${profile.startWeight}</div>
  </div>`;

  // Remaining
  html += `<div class="weight-stat">
    <div class="weight-stat-value">${stats.remaining.toFixed(1)} lbs</div>
    <div class="weight-stat-label">To Goal (${profile.goalWeight})</div>
  </div>`;

  // Prediction
  if (stats.predictedDate) {
    html += `<div class="weight-stat" style="grid-column: 1 / -1;">
      <div class="weight-stat-value text-blue">${stats.predictedDate}</div>
      <div class="weight-stat-label">Predicted Goal Date</div>
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

  // 7-day SMA
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
          borderColor: '#448aff',
          backgroundColor: 'rgba(68, 138, 255, 0.1)',
          borderWidth: 2,
          pointRadius: 3,
          pointBackgroundColor: '#448aff',
          tension: 0.1,
          fill: false
        },
        {
          label: '7-Day Avg',
          data: sma,
          borderColor: '#b388ff',
          borderWidth: 2,
          borderDash: [5, 5],
          pointRadius: 0,
          tension: 0.3,
          fill: false
        },
        {
          label: 'Goal',
          data: new Array(data.length).fill(profile.goalWeight),
          borderColor: 'rgba(0, 230, 118, 0.5)',
          borderWidth: 1,
          borderDash: [10, 5],
          pointRadius: 0,
          fill: false
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          display: true,
          labels: { color: '#8888a0', font: { size: 10 }, boxWidth: 12, padding: 8 }
        },
        tooltip: {
          backgroundColor: '#1a1a24',
          titleColor: '#f0f0f5',
          bodyColor: '#f0f0f5',
          borderColor: '#22222e',
          borderWidth: 1,
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y.toFixed(1)} lbs`
          }
        }
      },
      scales: {
        x: {
          ticks: { color: '#555568', font: { size: 9 }, maxRotation: 45 },
          grid: { color: 'rgba(85, 85, 104, 0.15)' }
        },
        y: {
          ticks: { color: '#555568', font: { size: 10 } },
          grid: { color: 'rgba(85, 85, 104, 0.15)' },
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
  if (today.weight === null) return { text: 'Not logged today', totalLost: profile.startWeight - (getAllWeights().slice(-1)[0]?.weight ?? profile.startWeight) };
  return {
    text: `${today.weight} lbs`,
    totalLost: profile.startWeight - today.weight
  };
}

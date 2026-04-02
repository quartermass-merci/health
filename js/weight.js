// weight.js — Weight dial input, stats, and Chart.js graph

import { getActiveDay, saveActiveDay, getProfile, getAllWeights, getLastWeight } from './store.js';
import { getWeightInsight, getWeightStats } from './insights.js';
import { showInlineInsight, showCelebration } from './app.js';

// BMI zone chart plugin — draws colored bands behind data
const bmiZonePlugin = {
  id: 'bmiZones',
  beforeDraw(chart) {
    const profile = getProfile();
    if (!profile) return;
    const h = profile.heightInches || 75;
    const factor = (h * h) / 703;

    const normalMax = 24.9 * factor;
    const overMax = 29.9 * factor;

    const { ctx, chartArea, scales } = chart;
    if (!chartArea) return;
    const yScale = scales.y;

    const zones = [
      { min: 0, max: normalMax, color: 'rgba(0, 255, 65, 0.06)', label: 'Normal' },
      { min: normalMax, max: overMax, color: 'rgba(255, 215, 0, 0.06)', label: 'Overweight' },
      { min: overMax, max: 9999, color: 'rgba(255, 26, 94, 0.06)', label: 'Obese' }
    ];

    ctx.save();
    zones.forEach(z => {
      const top = yScale.getPixelForValue(Math.min(z.max, yScale.max));
      const bottom = yScale.getPixelForValue(Math.max(z.min, yScale.min));
      if (top >= bottom) {
        const clampedTop = Math.max(top, chartArea.top);
        const clampedBottom = Math.min(bottom, chartArea.bottom);
        if (clampedBottom > clampedTop) {
          ctx.fillStyle = z.color;
          ctx.fillRect(chartArea.left, clampedTop, chartArea.right - chartArea.left, clampedBottom - clampedTop);
          if (clampedBottom - clampedTop > 20) {
            ctx.fillStyle = z.color.replace(/[\d.]+\)$/, '0.3)');
            ctx.font = '9px sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText(z.label, chartArea.right - 4, clampedTop + 12);
          }
        }
      }
    });
    ctx.restore();
  }
};

// Dial constants
const CX = 120, CY = 120, RADIUS = 100;
const ARC_LENGTH = 2 * Math.PI * RADIUS * 0.75; // 471.24
const START_DEG = 135; // lower-left, CW from 3 o'clock
const SWEEP_DEG = 270;

let weightChart = null;
let currentDialWeight = 0;
let dialMin = 200;
let dialMax = 350;

export function initWeight() {
  const profile = getProfile();
  if (!profile) return;
  const lastW = getLastWeight();
  const today = getActiveDay();

  dialMin = Math.max(profile.goalWeight - 10, 100);
  dialMax = profile.startWeight + 10;

  currentDialWeight = today.weight || lastW?.weight || profile.startWeight;
  currentDialWeight = Math.round(currentDialWeight * 10) / 10;

  updateDial();
  bindDialTouch();
  bindDialButtons();
  bindLockIn();
  renderWeightStats();
  renderWeightChart();
}

function updateDial() {
  const fraction = Math.max(0, Math.min(1, (currentDialWeight - dialMin) / (dialMax - dialMin)));

  // Arc fill
  const arcEl = document.getElementById('dial-arc');
  if (arcEl) {
    const visibleLength = fraction * ARC_LENGTH;
    arcEl.style.strokeDasharray = `${visibleLength} 9999`;

    // Color: gold when high, green as approaching goal
    const progress = 1 - fraction;
    if (progress > 0.7) arcEl.style.stroke = 'var(--positive)';
    else if (progress > 0.3) arcEl.style.stroke = 'var(--accent)';
    else arcEl.style.stroke = 'var(--negative)';
  }

  // Knob position
  const knobAngle = START_DEG + fraction * SWEEP_DEG;
  const rad = knobAngle * Math.PI / 180;
  const kx = CX + RADIUS * Math.cos(rad);
  const ky = CY + RADIUS * Math.sin(rad);
  const knob = document.getElementById('dial-knob');
  if (knob) {
    knob.setAttribute('cx', kx.toFixed(1));
    knob.setAttribute('cy', ky.toFixed(1));
  }

  // Value display
  const valEl = document.getElementById('dial-value');
  if (valEl) valEl.textContent = currentDialWeight.toFixed(1);
}

function bindDialTouch() {
  const svg = document.getElementById('weight-dial-svg');
  if (!svg) return;

  let isDragging = false;

  svg.addEventListener('touchstart', (e) => {
    isDragging = true;
    handleTouch(e);
    e.preventDefault();
  }, { passive: false });

  svg.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    handleTouch(e);
    e.preventDefault();
  }, { passive: false });

  svg.addEventListener('touchend', () => { isDragging = false; });

  // Mouse for desktop testing
  svg.addEventListener('mousedown', (e) => {
    isDragging = true;
    handleMouse(e);
  });
  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    handleMouse(e);
  });
  window.addEventListener('mouseup', () => { isDragging = false; });

  function handleTouch(e) {
    const t = e.touches[0];
    updateFromPoint(t.clientX, t.clientY);
  }

  function handleMouse(e) {
    updateFromPoint(e.clientX, e.clientY);
  }

  function updateFromPoint(px, py) {
    const rect = svg.getBoundingClientRect();
    const scale = 240 / rect.width;
    const lx = (px - rect.left) * scale;
    const ly = (py - rect.top) * scale;
    const dx = lx - CX;
    const dy = ly - CY;

    let angle = Math.atan2(dy, dx) * 180 / Math.PI;
    if (angle < 0) angle += 360;

    // Dead zone: 45° to 135° (bottom gap)
    if (angle >= 45 && angle <= 135) {
      angle = angle < 90 ? 45 : 135;
    }

    // Map to fraction (135° = 0, 405°/45° = 1)
    let adjusted = angle;
    if (adjusted < 135) adjusted += 360;
    let fraction = (adjusted - 135) / 270;
    fraction = Math.max(0, Math.min(1, fraction));

    currentDialWeight = dialMin + fraction * (dialMax - dialMin);
    currentDialWeight = Math.round(currentDialWeight * 10) / 10;
    updateDial();
  }
}

function bindDialButtons() {
  const upBtn = document.getElementById('dial-up');
  const downBtn = document.getElementById('dial-down');

  if (upBtn) {
    const fresh = upBtn.cloneNode(true);
    upBtn.parentNode.replaceChild(fresh, upBtn);
    fresh.onclick = () => {
      currentDialWeight = Math.min(dialMax, Math.round((currentDialWeight + 0.1) * 10) / 10);
      updateDial();
    };
  }

  if (downBtn) {
    const fresh = downBtn.cloneNode(true);
    downBtn.parentNode.replaceChild(fresh, downBtn);
    fresh.onclick = () => {
      currentDialWeight = Math.max(dialMin, Math.round((currentDialWeight - 0.1) * 10) / 10);
      updateDial();
    };
  }
}

function bindLockIn() {
  const btn = document.getElementById('weight-lock');
  if (!btn) return;

  const fresh = btn.cloneNode(true);
  btn.parentNode.replaceChild(fresh, btn);

  fresh.onclick = () => {
    const val = currentDialWeight;
    if (val < 50 || val > 999) return;

    const today = getActiveDay();
    const profile = getProfile();
    const prevWeights = getAllWeights();

    today.weight = val;
    saveActiveDay(today);

    // Check for NBA JAM celebration (>1 lb loss since last entry)
    if (prevWeights.length > 0) {
      const lastWeight = prevWeights[prevWeights.length - 1].weight;
      const delta = lastWeight - val;
      if (delta >= 1.0) {
        showCelebration(delta);
      }
    }

    // Visual feedback
    fresh.textContent = 'LOCKED! 🔒';
    fresh.classList.add('locked');
    setTimeout(() => {
      fresh.textContent = 'LOCK IT IN';
      fresh.classList.remove('locked');
    }, 2000);

    renderWeightStats();
    renderWeightChart();
    showInlineInsight('weight-insight-slot', getWeightInsight(today, profile));
  };
}

function renderWeightStats() {
  const today = getActiveDay();
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

  if (stats.weeklyLossRate !== undefined && stats.weeklyLossRate !== null) {
    const rate = stats.weeklyLossRate;
    const cls = rate > 0 ? 'positive' : 'neutral';
    html += `<div class="weight-stat">
      <div class="weight-stat-value ${cls}">${rate > 0 ? '-' : ''}${Math.abs(rate).toFixed(1)}</div>
      <div class="weight-stat-label">lbs/week</div>
    </div>`;
  } else if (stats.sevenDayAvg !== null) {
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

  // BMI
  const heightIn = profile.heightInches || 75;
  const bmi = (today.weight * 703) / (heightIn * heightIn);
  const bmiCls = bmi >= 30 ? 'negative' : bmi >= 25 ? 'text-accent' : 'positive';
  html += `<div class="weight-stat">
    <div class="weight-stat-value ${bmiCls}">${bmi.toFixed(1)}</div>
    <div class="weight-stat-label">BMI</div>
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

  const minWeight = Math.min(...data);
  const maxWeight = Math.max(...data);
  const range = maxWeight - minWeight;
  const padding = Math.max(range * 0.2, 2);

  weightChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Weight',
          data,
          borderColor: '#9999cc',
          backgroundColor: 'transparent',
          borderWidth: 1.5,
          pointRadius: 2.5,
          pointBackgroundColor: '#fff',
          tension: 0.1,
          fill: false
        },
        {
          label: 'Trend',
          data: sma,
          borderColor: '#ffd700',
          borderWidth: 2,
          borderDash: [4, 4],
          pointRadius: 0,
          tension: 0.3,
          fill: false
        },
        {
          label: 'Goal',
          data: new Array(data.length).fill(profile.goalWeight),
          borderColor: 'rgba(0, 255, 65, 0.4)',
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
          labels: { color: '#555577', font: { size: 9 }, boxWidth: 10, padding: 6 }
        },
        tooltip: {
          backgroundColor: '#0a0a18',
          titleColor: '#fff',
          bodyColor: '#9999cc',
          borderColor: '#12122a',
          borderWidth: 1,
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y.toFixed(1)} lbs`
          }
        }
      },
      scales: {
        x: {
          ticks: { color: '#555577', font: { size: 9 }, maxRotation: 45, autoSkip: true, maxTicksLimit: Math.ceil(labels.length / 2) },
          grid: { color: 'rgba(85, 85, 119, 0.1)' }
        },
        y: {
          ticks: { color: '#555577', font: { size: 9 } },
          grid: { color: 'rgba(85, 85, 119, 0.1)' },
          min: minWeight - padding,
          max: maxWeight + padding
        }
      }
    },
    plugins: [bmiZonePlugin]
  });
}

export function getWeightSummary() {
  const today = getActiveDay();
  const profile = getProfile();
  if (!profile) return { text: 'Not logged', totalLost: 0 };
  if (today.weight === null) return { text: 'Not logged', totalLost: profile.startWeight - (getAllWeights().slice(-1)[0]?.weight ?? profile.startWeight) };
  return {
    text: `${today.weight} lbs`,
    totalLost: profile.startWeight - today.weight
  };
}

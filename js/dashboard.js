// dashboard.js — Dashboard cards and phase display

import { getToday, getProfile, getDayNumber, getAllWeights, getCarbStreak } from './store.js';
import { getCurrentPhase } from './phases.js';
import { getFeedingStatus } from './feeding.js';
import { getWaterStatus } from './water.js';
import { getWeightSummary } from './weight.js';
import { getCarbStatus } from './carbs.js';
import { getWalkingStatus } from './walking.js';
import { navigateTo } from './app.js';

export function initDashboard() {
  renderPhase();
  renderCards();
}

function renderPhase() {
  const el = document.getElementById('dashboard-phase');
  const phase = getCurrentPhase();

  el.innerHTML = `
    <div class="phase-banner-title">Phase ${phase.index} — Months ${phase.months}</div>
    <div class="phase-banner-name">${phase.name}</div>
    <div style="font-size:0.8rem;color:var(--text-dim);margin-bottom:6px">${phase.description}</div>
    <div class="phase-banner-progress">
      <div class="phase-banner-fill" style="width:${phase.pct}%"></div>
    </div>
    <div style="font-size:0.75rem;color:var(--text-muted);margin-top:4px">Day ${phase.daysIn} of ${phase.totalDays || '∞'} • ${phase.pct}%</div>
  `;
}

function renderCards() {
  const container = document.getElementById('dashboard-cards');
  const today = getToday();
  const profile = getProfile();

  const feeding = getFeedingStatus();
  const water = getWaterStatus();
  const weight = getWeightSummary();
  const carbs = getCarbStatus();
  const walking = getWalkingStatus();

  const cards = [
    {
      icon: '🕐',
      iconBg: `var(--${feeding.color}-dim)`,
      title: 'Feeding Window',
      value: feeding.text,
      sub: feeding.state === 'during' ? 'Window is OPEN' : feeding.state === 'before' ? 'Fasting...' : 'Window closed',
      status: feeding.state === 'during' ? 'var(--green)' : feeding.state === 'before' ? 'var(--amber)' : 'var(--red)',
      section: 'track'
    },
    {
      icon: '💧',
      iconBg: 'var(--blue-dim)',
      title: 'Water Intake',
      value: water.text,
      sub: `${water.pct}% of goal`,
      status: water.pct >= 100 ? 'var(--green)' : water.pct >= 50 ? 'var(--amber)' : 'var(--text-muted)',
      section: 'track'
    },
    {
      icon: '⚖️',
      iconBg: 'var(--green-dim)',
      title: 'Weight',
      value: weight.text,
      sub: weight.totalLost > 0 ? `${weight.totalLost.toFixed(1)} lbs lost total` : '',
      status: today.weight !== null ? 'var(--green)' : 'var(--text-muted)',
      section: 'track'
    },
    {
      icon: '🥩',
      iconBg: 'var(--amber-dim)',
      title: 'Low-Carb',
      value: carbs.answered ? (carbs.value ? '✓ Yes' : '✗ No') : 'Not checked',
      sub: `${carbs.streak}-day streak`,
      status: carbs.answered ? (carbs.value ? 'var(--green)' : 'var(--red)') : 'var(--text-muted)',
      section: 'track'
    },
    {
      icon: '🚶',
      iconBg: 'var(--green-dim)',
      title: 'Walking',
      value: walking.text,
      sub: `${walking.pct}% of goal`,
      status: walking.pct >= 100 ? 'var(--green)' : walking.pct >= 50 ? 'var(--amber)' : 'var(--text-muted)',
      section: 'track'
    }
  ];

  // Sleep & PMR summary
  const sleepVal = today.sleepQuality !== null ? `${'★'.repeat(today.sleepQuality)}${'☆'.repeat(5 - today.sleepQuality)}` : 'Not rated';
  cards.push({
    icon: '😴',
    iconBg: 'var(--purple-dim)',
    title: 'Sleep & PMR',
    value: sleepVal,
    sub: today.pmrDone ? 'PMR done ✓' : 'PMR not done',
    status: today.sleepQuality !== null ? 'var(--green)' : 'var(--text-muted)',
    section: 'track'
  });

  container.innerHTML = cards.map(card => `
    <div class="dash-card" data-nav="${card.section}">
      <div class="dash-card-icon" style="background:${card.iconBg}">${card.icon}</div>
      <div class="dash-card-info">
        <div class="dash-card-title">${card.title}</div>
        <div class="dash-card-value">${card.value}</div>
        ${card.sub ? `<div class="dash-card-sub">${card.sub}</div>` : ''}
      </div>
      <div class="dash-card-status" style="background:${card.status}"></div>
    </div>
  `).join('');

  // Bind card clicks to navigate to track
  container.querySelectorAll('.dash-card').forEach(el => {
    el.onclick = () => navigateTo(el.dataset.nav);
  });
}

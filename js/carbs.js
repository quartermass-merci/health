// carbs.js — Low-carb daily check + streak

import { getToday, saveToday, getCarbStreak, getRecentDays } from './store.js';
import { getCarbInsight } from './insights.js';
import { showInsight } from './app.js';

export function initCarbs() {
  renderCarbs();
  bindCarbButtons();
}

function renderCarbs() {
  const today = getToday();
  const streak = getCarbStreak();

  document.getElementById('streak-number').textContent = streak;

  // Show answered state or question
  const question = document.getElementById('carb-question');
  if (today.stayedLowCarb !== null) {
    question.className = 'carb-answered';
    question.textContent = today.stayedLowCarb ? '✓ Low-carb today' : '✗ Not low-carb today';
    // Dim the buttons
    document.querySelectorAll('[data-carb]').forEach(btn => {
      btn.style.opacity = today.stayedLowCarb === (btn.dataset.carb === 'yes') ? '1' : '0.3';
    });
  } else {
    question.className = 'carb-question';
    question.textContent = 'Did you stay low-carb today?';
    document.querySelectorAll('[data-carb]').forEach(btn => btn.style.opacity = '1');
  }

  // Last 30 days dots
  const recent = getRecentDays(30);
  const dotsEl = document.getElementById('carb-dots');
  dotsEl.innerHTML = recent.map(d => {
    const cls = d.stayedLowCarb === true ? 'yes' : d.stayedLowCarb === false ? 'no' : '';
    return `<div class="carb-dot ${cls}"></div>`;
  }).join('');
}

function bindCarbButtons() {
  document.querySelectorAll('[data-carb]').forEach(btn => {
    btn.onclick = () => {
      const val = btn.dataset.carb === 'yes';
      const today = getToday();
      today.stayedLowCarb = val;
      saveToday(today);

      const streak = getCarbStreak();
      renderCarbs();
      showInsight(getCarbInsight(streak, val), val ? '🥩' : '🔄');
    };
  });
}

export function getCarbStatus() {
  const today = getToday();
  const streak = getCarbStreak();
  return {
    answered: today.stayedLowCarb !== null,
    value: today.stayedLowCarb,
    streak
  };
}

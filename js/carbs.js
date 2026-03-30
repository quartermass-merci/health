// carbs.js — Low-carb daily check + streak with inline insights

import { getToday, saveToday, getCarbStreak, getRecentDays } from './store.js';
import { getCarbInsight } from './insights.js';
import { showInlineInsight } from './app.js';

export function initCarbs() {
  renderCarbs();
  bindCarbButtons();
}

function renderCarbs() {
  const today = getToday();
  const streak = getCarbStreak();

  document.getElementById('streak-number').textContent = streak;

  const question = document.getElementById('carb-question');
  if (today.stayedLowCarb !== null) {
    question.className = 'carb-answered';
    question.textContent = today.stayedLowCarb ? 'Low-carb today' : 'Not low-carb today';
    document.querySelectorAll('[data-carb]').forEach(btn => {
      btn.style.opacity = today.stayedLowCarb === (btn.dataset.carb === 'yes') ? '1' : '0.3';
    });
  } else {
    question.className = 'carb-question';
    question.textContent = 'Did you stay low-carb today?';
    document.querySelectorAll('[data-carb]').forEach(btn => btn.style.opacity = '1');
  }

  // Last 30 days dots — square dots instead of circles
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
      showInlineInsight('carb-insight-slot', getCarbInsight(streak, val));
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

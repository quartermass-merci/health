// feeding.js — Feeding timer module (12 PM - 6 PM)

import { getToday, saveToday, getProfile } from './store.js';
import { getFastingInsight } from './insights.js';
import { showInsight } from './app.js';

let timerInterval = null;

export function initFeeding() {
  destroyFeeding();
  updateFeedingDisplay();
  timerInterval = setInterval(updateFeedingDisplay, 1000);
  bindFeedingButtons();
}

export function destroyFeeding() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function updateFeedingDisplay() {
  const profile = getProfile();
  if (!profile) return;

  const now = new Date();
  const hour = now.getHours();
  const min = now.getMinutes();
  const sec = now.getSeconds();
  const currentMinutes = hour * 60 + min;
  const windowStartMin = profile.feedWindowStart * 60;
  const windowEndMin = profile.feedWindowEnd * 60;

  const indicator = document.getElementById('feeding-indicator');
  const timeEl = document.getElementById('feeding-time');
  const labelEl = document.getElementById('feeding-label');
  const checkEl = document.getElementById('feeding-check');

  if (currentMinutes < windowStartMin) {
    // Before window
    indicator.className = 'feeding-indicator before';
    const diff = windowStartMin - currentMinutes;
    const h = Math.floor(diff / 60);
    const m = diff % 60;
    timeEl.textContent = `${h}:${String(m).padStart(2, '0')}:${String(60 - sec).padStart(2, '0')}`;
    labelEl.textContent = 'until window opens';
    checkEl.classList.add('hidden');
  } else if (currentMinutes < windowEndMin) {
    // During window
    indicator.className = 'feeding-indicator during';
    const diff = windowEndMin - currentMinutes;
    const h = Math.floor(diff / 60);
    const m = diff % 60;
    timeEl.textContent = `${h}:${String(m).padStart(2, '0')}:${String(60 - sec).padStart(2, '0')}`;
    labelEl.textContent = 'remaining in window';
    checkEl.classList.add('hidden');
  } else {
    // After window
    indicator.className = 'feeding-indicator after';
    const fastedMin = currentMinutes - windowEndMin;
    const h = Math.floor(fastedMin / 60);
    const m = fastedMin % 60;
    timeEl.textContent = `${h}:${String(m).padStart(2, '0')}`;
    labelEl.textContent = 'hours fasted tonight';

    const today = getToday();
    if (today.stayedInWindow === null) {
      checkEl.classList.remove('hidden');
    } else {
      checkEl.classList.add('hidden');
    }
  }
}

function bindFeedingButtons() {
  document.querySelectorAll('[data-feeding]').forEach(btn => {
    btn.onclick = () => {
      const val = btn.dataset.feeding === 'yes';
      const today = getToday();
      today.stayedInWindow = val;
      saveToday(today);

      const profile = getProfile();
      const insight = getFastingInsight(new Date(), profile.feedWindowStart, profile.feedWindowEnd);
      showInsight(val ? insight : "No judgment. Return to protocol tomorrow. The no-compensation rule: just resume.", val ? '🟢' : '🔄');

      document.getElementById('feeding-check').classList.add('hidden');
    };
  });
}

export function getFeedingStatus() {
  const profile = getProfile();
  if (!profile) return { state: 'unknown', text: '' };

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const windowStartMin = profile.feedWindowStart * 60;
  const windowEndMin = profile.feedWindowEnd * 60;

  if (currentMinutes < windowStartMin) {
    const diff = windowStartMin - currentMinutes;
    return { state: 'before', text: `Opens in ${Math.floor(diff / 60)}h ${diff % 60}m`, color: 'amber' };
  }
  if (currentMinutes < windowEndMin) {
    const diff = windowEndMin - currentMinutes;
    return { state: 'during', text: `${Math.floor(diff / 60)}h ${diff % 60}m left`, color: 'green' };
  }
  const fasted = currentMinutes - windowEndMin;
  return { state: 'after', text: `${Math.floor(fasted / 60)}h fasted`, color: 'red' };
}

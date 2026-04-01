// feeding.js — Feeding timer with animated arc and color transitions

import { getActiveDay, saveActiveDay, getProfile } from './store.js';
import { getFastingInsight } from './insights.js';
import { showInlineInsight } from './app.js';

let timerInterval = null;
const ARC_CIRCUMFERENCE = 2 * Math.PI * 70; // r=70 in SVG

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
  const totalWindow = windowEndMin - windowStartMin;

  const arc = document.getElementById('feeding-arc');
  const timeEl = document.getElementById('feeding-time');
  const labelEl = document.getElementById('feeding-label');
  const checkEl = document.getElementById('feeding-check');

  if (!arc) return;

  if (currentMinutes < windowStartMin) {
    // Before window — fasting
    const diff = windowStartMin - currentMinutes;
    const h = Math.floor(diff / 60);
    const m = diff % 60;
    const secLeft = 60 - sec;
    timeEl.textContent = `${h}:${String(m).padStart(2, '0')}:${String(secLeft === 60 ? 0 : secLeft).padStart(2, '0')}`;
    labelEl.textContent = 'until window opens';

    // Arc: show fasting progress (hours since last window close)
    const fastedSinceLast = 24 - windowEndMin / 60 + hour + min / 60;
    const fastPct = Math.min(fastedSinceLast / 18, 1); // 18h = "full fast"
    arc.style.stroke = 'var(--accent)';
    arc.style.strokeDasharray = ARC_CIRCUMFERENCE;
    arc.style.strokeDashoffset = ARC_CIRCUMFERENCE * (1 - fastPct);
    checkEl.classList.add('hidden');
  } else if (currentMinutes < windowEndMin) {
    // During window
    const elapsed = currentMinutes - windowStartMin;
    const remaining = windowEndMin - currentMinutes;
    const h = Math.floor(remaining / 60);
    const m = remaining % 60;
    const secLeft = 60 - sec;
    timeEl.textContent = `${h}:${String(m).padStart(2, '0')}:${String(secLeft === 60 ? 0 : secLeft).padStart(2, '0')}`;
    labelEl.textContent = 'remaining';

    // Arc depletes as window is consumed, color shifts green→amber
    const pctUsed = elapsed / totalWindow;
    const pctLeft = 1 - pctUsed;
    arc.style.stroke = pctLeft > 0.5 ? 'var(--positive)' : pctLeft > 0.2 ? 'var(--accent)' : 'var(--negative)';
    arc.style.strokeDasharray = ARC_CIRCUMFERENCE;
    arc.style.strokeDashoffset = ARC_CIRCUMFERENCE * pctUsed;
    checkEl.classList.add('hidden');
  } else {
    // After window — fasting
    const fastedMin = currentMinutes - windowEndMin;
    const h = Math.floor(fastedMin / 60);
    const m = fastedMin % 60;
    timeEl.textContent = `${h}:${String(m).padStart(2, '0')}`;
    labelEl.textContent = 'fasted';

    const fastPct = Math.min(fastedMin / (18 * 60), 1);
    arc.style.stroke = 'var(--negative)';
    arc.style.strokeDasharray = ARC_CIRCUMFERENCE;
    arc.style.strokeDashoffset = ARC_CIRCUMFERENCE * (1 - fastPct);

    const today = getActiveDay();
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
      const today = getActiveDay();
      today.stayedInWindow = val;
      saveActiveDay(today);

      const profile = getProfile();
      const insight = getFastingInsight(new Date(), profile.feedWindowStart, profile.feedWindowEnd);
      showInlineInsight('feeding-insight-slot',
        val ? insight : "No judgment. Return to protocol tomorrow. No compensation — just resume."
      );

      document.getElementById('feeding-check').classList.add('hidden');
    };
  });
}

export function getFeedingStatus() {
  const profile = getProfile();
  if (!profile) return { state: 'unknown', text: '', color: 'accent' };

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const windowStartMin = profile.feedWindowStart * 60;
  const windowEndMin = profile.feedWindowEnd * 60;

  if (currentMinutes < windowStartMin) {
    const diff = windowStartMin - currentMinutes;
    return { state: 'before', text: `${Math.floor(diff / 60)}h ${diff % 60}m`, color: 'accent' };
  }
  if (currentMinutes < windowEndMin) {
    const diff = windowEndMin - currentMinutes;
    return { state: 'during', text: `${Math.floor(diff / 60)}h ${diff % 60}m`, color: 'positive' };
  }
  const fasted = currentMinutes - windowEndMin;
  return { state: 'after', text: `${Math.floor(fasted / 60)}h ${fasted % 60}m`, color: 'negative' };
}

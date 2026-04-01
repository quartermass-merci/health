// walking.js — Walking/NEAT tracker with bar progress

import { getActiveDay, saveActiveDay, getProfile } from './store.js';
import { getWalkingInsight } from './insights.js';
import { showInlineInsight } from './app.js';

export function initWalking() {
  renderWalking();
  bindWalkingButtons();
}

function renderWalking() {
  const today = getActiveDay();
  const profile = getProfile();
  const goal = profile.walkGoalMin || 90;
  const current = today.walkingMin;
  const pct = Math.min(Math.round((current / goal) * 100), 100);

  document.getElementById('walking-amount').textContent = `${current} min`;
  document.getElementById('walking-goal-text').textContent = `/ ${goal} min`;
  document.getElementById('walking-fill').style.width = pct + '%';
  document.getElementById('walking-pct').textContent = pct + '%';

  // Distance estimate: ~100 steps/min at moderate pace, 0.82m stride for 6'3"
  const heightIn = profile.heightInches || 75;
  const strideM = heightIn * 0.0254 * 0.415; // ~0.415 × height = stride
  const stepsPerMin = 100;
  const steps = current * stepsPerMin;
  const km = (steps * strideM) / 1000;
  const distEl = document.getElementById('walking-distance');
  if (current > 0) {
    distEl.textContent = `~${km.toFixed(1)} km · ${steps.toLocaleString()} steps`;
    distEl.classList.remove('hidden');
  } else {
    distEl.classList.add('hidden');
  }
}

function bindWalkingButtons() {
  document.querySelectorAll('[data-walk]').forEach(btn => {
    btn.onclick = () => {
      const min = parseInt(btn.dataset.walk);
      const today = getActiveDay();
      const profile = getProfile();

      if (min < 0) {
        // Subtract: floor at 0, pop last log
        today.walkingMin = Math.max(0, today.walkingMin + min);
        if (today.walkingLogs.length > 0) today.walkingLogs.pop();
      } else {
        today.walkingMin += min;
        today.walkingLogs.push({
          min,
          time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        });
      }
      saveActiveDay(today);
      renderWalking();
      if (min > 0) showInlineInsight('walking-insight-slot', getWalkingInsight(today, profile));
    };
  });
}

export function getWalkingStatus() {
  const today = getActiveDay();
  const profile = getProfile();
  if (!profile) return { text: '0 / 150 min', pct: 0 };
  const pct = Math.min(Math.round((today.walkingMin / profile.walkGoalMin) * 100), 100);
  return { text: `${today.walkingMin} / ${profile.walkGoalMin} min`, pct };
}

// walking.js — Walking/NEAT tracker with bar progress

import { getToday, saveToday, getProfile } from './store.js';
import { getWalkingInsight } from './insights.js';
import { showInlineInsight } from './app.js';

export function initWalking() {
  renderWalking();
  bindWalkingButtons();
}

function renderWalking() {
  const today = getToday();
  const profile = getProfile();
  const goal = profile.walkGoalMin;
  const current = today.walkingMin;
  const pct = Math.min(Math.round((current / goal) * 100), 100);

  document.getElementById('walking-amount').textContent = `${current} min`;
  document.getElementById('walking-fill').style.width = pct + '%';
  document.getElementById('walking-pct').textContent = pct + '%';
}

function bindWalkingButtons() {
  document.querySelectorAll('[data-walk]').forEach(btn => {
    btn.onclick = () => {
      const min = parseInt(btn.dataset.walk);
      const today = getToday();
      const profile = getProfile();

      today.walkingMin += min;
      today.walkingLogs.push({
        min,
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      });
      saveToday(today);
      renderWalking();
      showInlineInsight('walking-insight-slot', getWalkingInsight(today, profile));
    };
  });

  const undoBtn = document.getElementById('walk-undo');
  if (undoBtn) {
    undoBtn.onclick = () => {
      const today = getToday();
      if (today.walkingLogs.length > 0) {
        const last = today.walkingLogs.pop();
        today.walkingMin = Math.max(0, today.walkingMin - last.min);
        saveToday(today);
        renderWalking();
      }
    };
  }
}

export function getWalkingStatus() {
  const today = getToday();
  const profile = getProfile();
  if (!profile) return { text: '0 / 150 min', pct: 0 };
  const pct = Math.min(Math.round((today.walkingMin / profile.walkGoalMin) * 100), 100);
  return { text: `${today.walkingMin} / ${profile.walkGoalMin} min`, pct };
}

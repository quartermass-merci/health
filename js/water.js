// water.js — Water intake tracker with bar progress

import { getActiveDay, saveActiveDay, getProfile } from './store.js';
import { getWaterInsight } from './insights.js';
import { showInlineInsight } from './app.js';

export function initWater() {
  renderWater();
  bindWaterButtons();
}

function renderWater() {
  const today = getActiveDay();
  const profile = getProfile();
  const goal = profile.waterGoalMl;
  const current = today.waterMl;
  const pct = Math.min(Math.round((current / goal) * 100), 100);

  document.getElementById('water-amount').textContent = `${current.toLocaleString()} ml`;
  document.getElementById('water-bar-fill').style.width = pct + '%';
  document.getElementById('water-pct').textContent = pct + '%';
}

function bindWaterButtons() {
  document.querySelectorAll('[data-water]').forEach(btn => {
    btn.onclick = () => {
      const amount = parseInt(btn.dataset.water);
      const today = getActiveDay();
      const profile = getProfile();

      today.waterMl = Math.max(0, today.waterMl + amount);
      if (amount > 0) {
        today.waterLogs.push({
          ml: amount,
          time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        });
      } else if (today.waterLogs.length > 0) {
        today.waterLogs.pop();
      }
      saveActiveDay(today);
      renderWater();

      // Hit flash on bar fill
      if (amount > 0) {
        const fill = document.getElementById('water-bar-fill');
        if (fill) {
          fill.style.filter = 'brightness(2.5)';
          setTimeout(() => { fill.style.filter = ''; }, 150);
        }
      }

      showInlineInsight('water-insight-slot', getWaterInsight(today, profile));
    };
  });
}

export function getWaterStatus() {
  const today = getActiveDay();
  const profile = getProfile();
  if (!profile) return { text: '0 / 3000 ml', pct: 0 };
  const pct = Math.round((today.waterMl / profile.waterGoalMl) * 100);
  return { text: `${today.waterMl.toLocaleString()} / ${profile.waterGoalMl.toLocaleString()} ml`, pct: Math.min(pct, 100) };
}

// water.js — Water intake tracker

import { getToday, saveToday, getProfile } from './store.js';
import { getWaterInsight } from './insights.js';
import { showInsight } from './app.js';

const CIRCUMFERENCE = 2 * Math.PI * 54; // ring radius=54

export function initWater() {
  renderWater();
  bindWaterButtons();
}

function renderWater() {
  const today = getToday();
  const profile = getProfile();
  const goal = profile.waterGoalMl;
  const current = today.waterMl;
  const pct = Math.min(current / goal, 1);

  document.getElementById('water-amount').textContent = current.toLocaleString();

  const ring = document.getElementById('water-ring');
  ring.style.strokeDasharray = CIRCUMFERENCE;
  ring.style.strokeDashoffset = CIRCUMFERENCE * (1 - pct);
}

function bindWaterButtons() {
  document.querySelectorAll('[data-water]').forEach(btn => {
    btn.onclick = () => {
      const amount = parseInt(btn.dataset.water);
      const today = getToday();
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
      saveToday(today);
      renderWater();
      showInsight(getWaterInsight(today, profile), '💧');
    };
  });
}

export function getWaterStatus() {
  const today = getToday();
  const profile = getProfile();
  if (!profile) return { text: '0 / 3000 ml', pct: 0 };
  const pct = Math.round((today.waterMl / profile.waterGoalMl) * 100);
  return { text: `${today.waterMl.toLocaleString()} / ${profile.waterGoalMl.toLocaleString()} ml`, pct };
}

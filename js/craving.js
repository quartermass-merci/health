// craving.js — 5-minute craving timer with breathing guidance

import { getActiveDay, saveActiveDay } from './store.js';
import { getCravingInsight } from './insights.js';
import { showInsight } from './app.js';

let cravingInterval = null;
let secondsLeft = 0;
const TOTAL_SECONDS = 300; // 5 minutes
const CIRCUMFERENCE = 2 * Math.PI * 54;

const breathCycle = [
  { text: 'Breathe in slowly...', duration: 4 },
  { text: 'Hold...', duration: 4 },
  { text: 'Breathe out slowly...', duration: 6 },
  { text: 'Hold...', duration: 2 }
];

export function initCraving() {
  const fab = document.getElementById('craving-fab');
  const modal = document.getElementById('craving-modal');
  const cancelBtn = document.getElementById('craving-cancel');

  fab.onclick = () => startCravingTimer();

  cancelBtn.onclick = () => {
    stopCravingTimer();
    modal.classList.add('hidden');

    if (secondsLeft < TOTAL_SECONDS - 10) {
      // They waited at least 10 seconds
      const today = getActiveDay();
      today.cravingTimerUsed = (today.cravingTimerUsed || 0) + 1;
      saveActiveDay(today);
      showInsight(getCravingInsight(), '🧘');
    }
  };
}

function startCravingTimer() {
  const modal = document.getElementById('craving-modal');
  modal.classList.remove('hidden');
  secondsLeft = TOTAL_SECONDS;
  updateCravingDisplay();

  let breathIdx = 0;
  let breathCountdown = breathCycle[0].duration;

  if (cravingInterval) clearInterval(cravingInterval);
  cravingInterval = setInterval(() => {
    secondsLeft--;
    breathCountdown--;

    if (breathCountdown <= 0) {
      breathIdx = (breathIdx + 1) % breathCycle.length;
      breathCountdown = breathCycle[breathIdx].duration;
    }

    document.getElementById('craving-breath-text').textContent = breathCycle[breathIdx].text;
    updateCravingDisplay();

    if (secondsLeft <= 0) {
      stopCravingTimer();
      document.getElementById('craving-breath-text').textContent = 'You did it. The craving has passed.';
      document.getElementById('craving-timer-display').textContent = '0:00';

      const today = getActiveDay();
      today.cravingTimerUsed = (today.cravingTimerUsed || 0) + 1;
      saveActiveDay(today);

      setTimeout(() => {
        modal.classList.add('hidden');
        showInsight(getCravingInsight(), '🧘');
      }, 2000);
    }
  }, 1000);
}

function stopCravingTimer() {
  if (cravingInterval) {
    clearInterval(cravingInterval);
    cravingInterval = null;
  }
}

function updateCravingDisplay() {
  const min = Math.floor(secondsLeft / 60);
  const sec = secondsLeft % 60;
  document.getElementById('craving-timer-display').textContent = `${min}:${String(sec).padStart(2, '0')}`;

  const ring = document.getElementById('craving-ring');
  const progress = secondsLeft / TOTAL_SECONDS;
  ring.style.strokeDasharray = CIRCUMFERENCE;
  ring.style.strokeDashoffset = CIRCUMFERENCE * (1 - progress);
}

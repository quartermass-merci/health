// evening.js — PMR reminder + NES check-in

import { getToday, saveToday } from './store.js';
import { getPmrInsight } from './insights.js';
import { showInsight } from './app.js';

export function initEvening() {
  renderEvening();
  bindEveningButtons();
}

function renderEvening() {
  const today = getToday();

  // PMR status
  const pmrBtn = document.getElementById('pmr-done-btn');
  if (today.pmrDone) {
    pmrBtn.textContent = 'Done ✓';
    pmrBtn.className = 'btn btn-outline pmr-done';
    pmrBtn.disabled = true;
  } else {
    pmrBtn.textContent = 'Done ✓';
    pmrBtn.className = 'btn btn-success';
    pmrBtn.disabled = false;
  }

  // NES checkboxes
  if (today.nesMarkers) {
    document.querySelectorAll('[data-nes]').forEach(cb => {
      cb.checked = today.nesMarkers[cb.dataset.nes] || false;
    });
  }

  checkNesWarning();
}

function bindEveningButtons() {
  // PMR
  document.getElementById('pmr-done-btn').onclick = () => {
    const today = getToday();
    today.pmrDone = true;
    saveToday(today);
    renderEvening();
    showInsight(getPmrInsight(), '🧘');
  };

  // NES checkboxes
  document.querySelectorAll('[data-nes]').forEach(cb => {
    cb.onchange = () => checkNesWarning();
  });

  // Save evening
  document.getElementById('evening-save').onclick = () => {
    const today = getToday();
    const markers = {};
    document.querySelectorAll('[data-nes]').forEach(cb => {
      markers[cb.dataset.nes] = cb.checked;
    });
    today.nesMarkers = markers;
    saveToday(today);
    showInsight('Evening check-in saved. Rest well tonight.', '🌙');
  };
}

function checkNesWarning() {
  const checked = document.querySelectorAll('[data-nes]:checked').length;
  const warning = document.getElementById('nes-warning');
  if (checked >= 3) {
    warning.classList.remove('hidden');
  } else {
    warning.classList.add('hidden');
  }
}

export function getEveningStatus() {
  const today = getToday();
  return {
    pmrDone: today.pmrDone,
    nesCount: Object.values(today.nesMarkers || {}).filter(Boolean).length
  };
}

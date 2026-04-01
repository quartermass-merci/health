// evening.js — NES check-in

import { getActiveDay, saveActiveDay } from './store.js';
import { showInlineInsight } from './app.js';

export function initEvening() {
  renderEvening();
  bindEveningButtons();
}

function renderEvening() {
  const today = getActiveDay();

  // NES checkboxes
  if (today.nesMarkers) {
    document.querySelectorAll('[data-nes]').forEach(cb => {
      cb.checked = today.nesMarkers[cb.dataset.nes] || false;
    });
  }

  checkNesWarning();
}

function bindEveningButtons() {
  // NES checkboxes
  document.querySelectorAll('[data-nes]').forEach(cb => {
    cb.onchange = () => checkNesWarning();
  });

  // Save evening
  document.getElementById('evening-save').onclick = () => {
    const today = getActiveDay();
    const markers = {};
    document.querySelectorAll('[data-nes]').forEach(cb => {
      markers[cb.dataset.nes] = cb.checked;
    });
    today.nesMarkers = markers;
    saveActiveDay(today);
    showInlineInsight('evening-insight-slot', 'Evening check-in saved. Rest well tonight.');
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
  const today = getActiveDay();
  return {
    nesCount: Object.values(today.nesMarkers || {}).filter(Boolean).length
  };
}

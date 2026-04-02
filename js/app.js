// app.js — Boot, routing, daily reset, toast system, active date

import { hasProfile, saveProfile, getProfile, getToday, saveToday, getActiveDay, saveActiveDay, setActiveDate, resetToToday, isViewingPastDay, getActiveDate, getDayNumber, todayString, exportCSV, exportJSON, importJSON, clearAllData, getLastBackupDate } from './store.js';
import { initMorning } from './morning.js';
import { initFeeding, destroyFeeding } from './feeding.js';
import { initWater } from './water.js';
import { initWeight } from './weight.js';
import { initWalking } from './walking.js';
import { initCraving } from './craving.js';
import { initMorningCheckin } from './morning-checkin.js';
import { initPhases } from './phases.js';
import { initCalendar } from './calendar.js';
import { initDashboard } from './dashboard.js';

let currentSection = null;
let toastTimer = null;

// ===== NBA JAM CELEBRATION SYSTEM =====
const JAM_QUOTES = [
  "HE'S HEATING UP!",
  "HE'S ON FIRE!",
  "RAZZLE DAZZLE!",
  "BOOMSHAKALAKA!",
  "SLAMS IT IN!",
  "WOOOOOAHHHH, KABOOM!"
];

export function showCelebration(lbsLost) {
  const overlay = document.getElementById('jam-overlay');
  const quoteEl = document.getElementById('jam-quote');
  const detailEl = document.getElementById('jam-detail');
  if (!overlay || !quoteEl) return;

  const quote = JAM_QUOTES[Math.floor(Math.random() * JAM_QUOTES.length)];
  quoteEl.textContent = quote;
  if (detailEl) {
    detailEl.textContent = lbsLost > 0 ? `-${lbsLost.toFixed(1)} LBS` : '';
  }

  overlay.classList.remove('hidden');

  // Screen shake on the app behind the overlay
  const app = document.getElementById('app');
  if (app) {
    app.classList.add('screen-shake');
    setTimeout(() => app.classList.remove('screen-shake'), 500);
  }

  const dismiss = () => {
    overlay.classList.add('hidden');
    overlay.onclick = null;
  };
  setTimeout(dismiss, 3500);
  overlay.onclick = dismiss;
}

export function showStreakCelebration(streak) {
  const overlay = document.getElementById('jam-overlay');
  const quoteEl = document.getElementById('jam-quote');
  const detailEl = document.getElementById('jam-detail');
  if (!overlay || !quoteEl) return;

  quoteEl.textContent = streak >= 30 ? "HE'S ON FIRE!" : "HE'S HEATING UP!";
  if (detailEl) detailEl.textContent = `${streak} DAY STREAK`;

  overlay.classList.remove('hidden');
  const dismiss = () => { overlay.classList.add('hidden'); overlay.onclick = null; };
  setTimeout(dismiss, 3500);
  overlay.onclick = dismiss;
}

// Toast system (kept for settings/export confirmations)
export function showInsight(message, icon = '💡') {
  const toast = document.getElementById('insight-toast');
  if (!toast) return;
  const msgEl = document.getElementById('toast-message');
  const iconEl = document.getElementById('toast-icon');
  iconEl.textContent = icon;
  msgEl.textContent = message;
  toast.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add('hidden'), 5000);
  toast.onclick = () => toast.classList.add('hidden');
}

// Inline insight system (appears below each tracker input)
export function showInlineInsight(slotId, message) {
  const slot = document.getElementById(slotId);
  if (!slot || !message) return;
  slot.textContent = message;
  slot.classList.add('inline-insight');
  slot.classList.remove('hidden');
  setTimeout(() => {
    slot.classList.add('hidden');
  }, 8000);
}

// Navigation — with View Transitions (Direction B)
function navigate(section) {
  if (section === currentSection) return;

  const doNavigate = () => {
    if (currentSection === 'track') destroyFeeding();

    document.querySelectorAll('.section').forEach(s => {
      s.classList.remove('active');
      s.classList.add('hidden');
    });
    const el = document.getElementById('section-' + section);
    if (el) {
      el.classList.remove('hidden');
      el.classList.add('active');
    }

    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    const btn = document.querySelector(`.nav-btn[data-section="${section}"]`);
    if (btn) btn.classList.add('active');

    const titles = { dashboard: 'Dashboard', track: 'Track', calendar: 'Calendar', settings: 'Settings' };
    document.getElementById('app-title').textContent = titles[section] || 'Dashboard';
    currentSection = section;

    // Reset to today when leaving track
    if (section !== 'track') {
      resetToToday();
    }

    // Render section
    if (section === 'dashboard') initDashboard();
    if (section === 'track') {
      renderDateBanner();
      initFeeding();
      initWater();
      initWeight();
      initMorningCheckin();
      initWalking();
      renderTrackSleep();
    }
    if (section === 'calendar') initCalendar();
    if (section === 'settings') loadSettings();

    // Scroll to top
    document.querySelector('.app-main').scrollTop = 0;
  };

  if (document.startViewTransition) {
    document.startViewTransition(doNavigate);
  } else {
    doNavigate();
  }
}

export function navigateTo(section) {
  navigate(section);
}

// Navigate to track for a specific date (called from calendar)
export function navigateToDate(dateStr) {
  setActiveDate(dateStr);
  // Force re-render even if already on track
  if (currentSection === 'track') {
    currentSection = null;
  }
  navigate('track');
}

// Date banner — shows when editing a past day
function renderDateBanner() {
  const banner = document.getElementById('date-banner');
  if (!banner) return;

  if (isViewingPastDay()) {
    const date = new Date(getActiveDate() + 'T00:00:00');
    const formatted = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    banner.innerHTML = `<span>Editing ${formatted}</span><button class="date-banner-btn" id="back-to-today">Back to today</button>`;
    banner.classList.remove('hidden');
    document.getElementById('back-to-today').onclick = () => {
      resetToToday();
      currentSection = null;
      navigate('track');
    };
  } else {
    banner.classList.add('hidden');
    banner.innerHTML = '';
  }
}

function renderTrackSleep() {
  const day = getActiveDay();
  const card = document.getElementById('track-sleep');
  if (day.sleepQuality !== null) {
    card.classList.add('hidden');
  } else {
    card.classList.remove('hidden');
    const stars = card.querySelectorAll('.star');
    stars.forEach(star => {
      star.classList.remove('active');
      star.onclick = () => {
        const val = parseInt(star.dataset.value);
        const d = getActiveDay();
        d.sleepQuality = val;
        saveActiveDay(d);
        stars.forEach(s => s.classList.toggle('active', parseInt(s.dataset.value) <= val));
        import('./insights.js').then(m => showInsight(m.getSleepInsight(val), '😴'));
        setTimeout(() => card.classList.add('hidden'), 1500);
      };
    });
  }
}

// Settings
function loadSettings() {
  const profile = getProfile();
  if (!profile) return;
  document.getElementById('settings-start-weight').value = profile.startWeight;
  document.getElementById('settings-goal-weight').value = profile.goalWeight;
  document.getElementById('settings-height').value = profile.heightInches || 75;
  document.getElementById('settings-start-date').value = profile.startDate;
  const lastBackup = getLastBackupDate();
  const note = document.getElementById('last-backup-note');
  if (lastBackup) {
    note.textContent = `Last backup: ${lastBackup}`;
  } else {
    note.textContent = 'No backups yet — export regularly to protect your data.';
  }
}

function bindSettings() {
  document.getElementById('settings-save').onclick = () => {
    const profile = getProfile();
    profile.startWeight = parseFloat(document.getElementById('settings-start-weight').value) || profile.startWeight;
    profile.goalWeight = parseFloat(document.getElementById('settings-goal-weight').value) || profile.goalWeight;
    profile.heightInches = parseInt(document.getElementById('settings-height').value) || profile.heightInches || 75;
    profile.startDate = document.getElementById('settings-start-date').value || profile.startDate;
    saveProfile(profile);
    showInsight('Settings saved!', '✅');
  };

  document.getElementById('export-csv').onclick = () => {
    exportCSV();
    showInsight('CSV exported!', '📊');
  };

  document.getElementById('export-json').onclick = () => {
    exportJSON();
    showInsight('Full backup exported!', '💾');
  };

  document.getElementById('import-json-btn').onclick = () => {
    document.getElementById('import-json-file').click();
  };

  document.getElementById('import-json-file').onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        importJSON(reader.result);
        showInsight('Data restored from backup!', '✅');
        setTimeout(() => location.reload(), 1000);
      } catch (err) {
        showInsight('Invalid backup file.', '❌');
      }
    };
    reader.readAsText(file);
  };

  document.getElementById('clear-data').onclick = () => {
    if (confirm('This will permanently delete ALL your data. Are you sure?')) {
      if (confirm('Really? This cannot be undone. Export a backup first if needed.')) {
        clearAllData();
        location.reload();
      }
    }
  };
}

// Setup screen
function showSetup() {
  document.getElementById('setup-screen').classList.remove('hidden');
  document.getElementById('app').classList.add('hidden');
  document.getElementById('setup-start-date').value = todayString();

  document.getElementById('setup-save').onclick = () => {
    const profile = {
      startWeight: parseFloat(document.getElementById('setup-start-weight').value) || 310,
      goalWeight: parseFloat(document.getElementById('setup-goal-weight').value) || 250,
      startDate: document.getElementById('setup-start-date').value || todayString(),
      feedWindowStart: 12,
      feedWindowEnd: 18,
      waterGoalMl: 3000,
      walkGoalMin: 90,
      heightInches: parseInt(document.getElementById('setup-height').value) || 75
    };
    saveProfile(profile);
    saveToday(getToday());
    document.getElementById('setup-screen').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    bootApp();
  };
}

// Day badge
function updateDayBadge() {
  document.getElementById('header-day-badge').textContent = `Day ${getDayNumber()}`;
}

// Ensure today record exists
function ensureToday() {
  const today = getToday();
  saveToday(today);
}

// Visibility change — detect day rollover
function onVisibilityChange() {
  if (document.visibilityState === 'visible') {
    ensureToday();
    updateDayBadge();
    if (currentSection === 'dashboard') initDashboard();
    if (currentSection === 'track' && !isViewingPastDay()) initFeeding();
  }
}

// Boot
function bootApp() {
  ensureToday();
  updateDayBadge();

  // Bind nav — reset to today on nav tap
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.onclick = () => {
      resetToToday();
      navigate(btn.dataset.section);
    };
  });

  bindSettings();
  initCraving();
  initPhases();

  // Check morning prompt
  const today = getToday();
  const shownKey = 'mt_morning_shown_' + todayString();
  if (!localStorage.getItem(shownKey)) {
    initMorning();
  }

  navigate('dashboard');
  document.addEventListener('visibilitychange', onVisibilityChange);
}

// Register service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

// Init
document.addEventListener('DOMContentLoaded', () => {
  if (!hasProfile()) {
    showSetup();
  } else {
    document.getElementById('app').classList.remove('hidden');
    bootApp();
  }
});

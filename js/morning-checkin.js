// morning-checkin.js — Morning goal-setting exercise
// Each answer auto-saves immediately on click. No save button needed.

import { getActiveDay, saveActiveDay, getDay, saveDay, yesterdayStr, getCarbStreak, getRecentDays } from './store.js';
import { getCarbInsight } from './insights.js';
import { showInlineInsight } from './app.js';

export function initMorningCheckin() {
  const today = getActiveDay();
  const streak = getCarbStreak();

  // Update streak display
  const streakEl = document.getElementById('mc-streak');
  if (streakEl) streakEl.textContent = streak;

  // Update carb dots
  const dotsEl = document.getElementById('mc-carb-dots');
  if (dotsEl) {
    const recent = getRecentDays(30);
    dotsEl.innerHTML = recent.map(d => {
      const cls = d.stayedLowCarb === true ? 'yes' : d.stayedLowCarb === false ? 'no' : '';
      return `<div class="carb-dot ${cls}"></div>`;
    }).join('');
  }

  // Check if already done — show summary
  if (today.morningCheckinDone && today.morningCheckin) {
    showDoneState(today.morningCheckin, streak);
    return;
  }

  // Show questions, hide done state
  document.getElementById('mc-questions').classList.remove('hidden');
  document.getElementById('mc-done-state').classList.add('hidden');
  document.getElementById('morning-checkin-save').classList.add('hidden'); // hidden — auto-save

  // Restore any previously answered questions for today
  const checkin = today.morningCheckin || {};

  // Clear old selections
  document.querySelectorAll('#mc-questions .mc-selected').forEach(el => el.classList.remove('mc-selected'));
  document.querySelectorAll('#mc-questions .mc-answered').forEach(el => el.classList.remove('mc-answered'));

  // Bind all buttons
  bindPair('mc-lowcarb-yes', 'mc-lowcarb-no', 'lowCarbYesterday', checkin);
  bindPair('mc-after6-yes', 'mc-after6-no', 'ateAfterSixPm', checkin);
  bindPair('mc-hunger-yes', 'mc-hunger-no', 'fightFeedingSignals', checkin);
  bindEmojiRow(checkin);
  bindCommit(checkin);

  // Restore previous answers visually
  restoreSelections(checkin);
}

function bindPair(yesId, noId, key, checkin) {
  const yesBtn = document.getElementById(yesId);
  const noBtn = document.getElementById(noId);
  if (!yesBtn || !noBtn) return;

  // Clone to remove old handlers
  const freshYes = yesBtn.cloneNode(true);
  const freshNo = noBtn.cloneNode(true);
  yesBtn.parentNode.replaceChild(freshYes, yesBtn);
  noBtn.parentNode.replaceChild(freshNo, noBtn);

  freshYes.onclick = function() { selectBtn(this, freshNo, key, true); };
  freshNo.onclick = function() { selectBtn(this, freshYes, key, false); };
}

function selectBtn(selected, other, key, value) {
  // Visual: highlight selected, dim other
  selected.classList.add('mc-selected');
  other.classList.remove('mc-selected');
  selected.parentElement.classList.add('mc-answered');

  // Save immediately
  saveAnswer(key, value);
}

function bindEmojiRow(checkin) {
  const feelings = ['great', 'good', 'okay', 'tough', 'rough'];
  const btns = feelings.map(f => document.getElementById('mc-feel-' + f));

  btns.forEach((btn, i) => {
    if (!btn) return;
    const fresh = btn.cloneNode(true);
    btn.parentNode.replaceChild(fresh, btn);

    fresh.onclick = function() {
      // Deselect all
      fresh.parentElement.querySelectorAll('.mc-emoji').forEach(b => b.classList.remove('mc-selected'));
      fresh.classList.add('mc-selected');
      fresh.parentElement.classList.add('mc-answered');
      saveAnswer('feeling', feelings[i]);
    };
  });
}

function bindCommit(checkin) {
  const btn = document.getElementById('mc-commit');
  if (!btn) return;
  const fresh = btn.cloneNode(true);
  btn.parentNode.replaceChild(fresh, btn);

  fresh.onclick = function() {
    fresh.classList.add('mc-selected');
    saveAnswer('committedToday', true);
    checkCompletion();
  };
}

function saveAnswer(key, value) {
  const today = getActiveDay();
  if (!today.morningCheckin) {
    today.morningCheckin = {};
  }
  today.morningCheckin[key] = value;
  saveActiveDay(today);

  // Special: low-carb answer also saves to yesterday
  if (key === 'lowCarbYesterday') {
    const yStr = yesterdayStr();
    const yesterday = getDay(yStr);
    if (yesterday.stayedLowCarb === null) {
      yesterday.stayedLowCarb = value;
      saveDay(yStr, yesterday);
    }
    // Update streak display
    const streak = getCarbStreak();
    const streakEl = document.getElementById('mc-streak');
    if (streakEl) streakEl.textContent = streak;
    // Show insight
    showInlineInsight('morning-checkin-insight-slot', getCarbInsight(streak, value));
  }

  checkCompletion();
}

function checkCompletion() {
  const today = getActiveDay();
  const c = today.morningCheckin;
  if (!c) return;

  // All 5 answered?
  const done = c.lowCarbYesterday !== undefined &&
               c.ateAfterSixPm !== undefined &&
               c.fightFeedingSignals !== undefined &&
               c.feeling !== undefined &&
               c.committedToday !== undefined;

  if (done) {
    today.morningCheckinDone = true;
    saveActiveDay(today);

    // Brief delay so user sees the last selection, then show done state
    setTimeout(() => {
      const streak = getCarbStreak();
      showDoneState(today.morningCheckin, streak);
    }, 600);
  }
}

function restoreSelections(checkin) {
  if (checkin.lowCarbYesterday === true) selectExisting('mc-lowcarb-yes', 'mc-lowcarb-no');
  if (checkin.lowCarbYesterday === false) selectExisting('mc-lowcarb-no', 'mc-lowcarb-yes');
  if (checkin.ateAfterSixPm === true) selectExisting('mc-after6-yes', 'mc-after6-no');
  if (checkin.ateAfterSixPm === false) selectExisting('mc-after6-no', 'mc-after6-yes');
  if (checkin.fightFeedingSignals === true) selectExisting('mc-hunger-yes', 'mc-hunger-no');
  if (checkin.fightFeedingSignals === false) selectExisting('mc-hunger-no', 'mc-hunger-yes');
  if (checkin.feeling) {
    const el = document.getElementById('mc-feel-' + checkin.feeling);
    if (el) {
      el.classList.add('mc-selected');
      el.parentElement.classList.add('mc-answered');
    }
  }
  if (checkin.committedToday) {
    const el = document.getElementById('mc-commit');
    if (el) el.classList.add('mc-selected');
  }
}

function selectExisting(selectedId, otherId) {
  const sel = document.getElementById(selectedId);
  const oth = document.getElementById(otherId);
  if (sel) {
    sel.classList.add('mc-selected');
    sel.parentElement?.classList.add('mc-answered');
  }
  if (oth) oth.classList.remove('mc-selected');
}

function showDoneState(checkin, streak) {
  const feelingEmojis = { great: '🔥', good: '😊', okay: '😐', tough: '😤', rough: '😔' };

  document.getElementById('mc-questions').classList.add('hidden');
  document.getElementById('morning-checkin-save').classList.add('hidden');

  const doneEl = document.getElementById('mc-done-state');
  doneEl.classList.remove('hidden');
  doneEl.innerHTML = `
    <div class="mc-done-check">✓ Checked in</div>
    <div class="mc-summary">
      <span>Low-carb: ${checkin.lowCarbYesterday ? '✓' : '✗'}</span>
      <span>After 6 PM: ${checkin.ateAfterSixPm ? 'Yes' : 'No'}</span>
      <span>Feeling: ${feelingEmojis[checkin.feeling] || '—'}</span>
    </div>
    <div class="carb-streak-inline">
      <span class="streak-number-sm">${streak}</span>
      <span class="streak-label-sm">day low-carb streak</span>
    </div>
  `;
}
